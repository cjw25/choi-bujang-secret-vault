import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractAlert } from './read-alerts.mjs';

const RULE_TTL_MS = 15 * 60 * 1000;

function safeAlertId(value) {
  return typeof value === 'string' && /^wi-\d{1,4}$/u.test(value) ? value : null;
}

function safeReason(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/u.test(value)
    ? value : null;
}

export function buildDenyCandidates(alerts, decisions) {
  if (!Array.isArray(alerts) || !Array.isArray(decisions)
    || alerts.length !== decisions.length) {
    throw new Error('경보와 판단 결과 건수가 일치하지 않습니다.');
  }

  const byAddress = new Map();

  for (let i = 0; i < alerts.length; i += 1) {
    const alert = alerts[i];
    const choice = decisions[i];
    const alertId = safeAlertId(alert?.id);

    if (!alertId || choice?.alertId !== alertId
      || choice.action !== 'block'
      || typeof choice.confidence !== 'number'
      || choice.confidence < 0.85
      || !safeReason(choice.reason)) {
      continue;
    }

    const row = extractAlert(alert);
    const start = Date.parse(row.timestamp);
    if (!row.sourceAddress || !Number.isFinite(start)) continue;

    const expires = start + RULE_TTL_MS;
    const prior = byAddress.get(row.sourceAddress);
    if (prior) {
      if (!prior.evidenceAlertIds.includes(alertId)) prior.evidenceAlertIds.push(alertId);
      if (start < Date.parse(prior.startsAt)) prior.startsAt = new Date(start).toISOString();
      if (expires > Date.parse(prior.expiresAt)) prior.expiresAt = new Date(expires).toISOString();
      if (choice.confidence > prior.confidence) {
        prior.confidence = choice.confidence;
        prior.pattern = choice.reason;
      }
      continue;
    }

    byAddress.set(row.sourceAddress, {
      id: 'xdr.web-injection.' + row.sourceAddress.replace(/[^0-9a-f]+/giu, '-').replace(/^-|-$/gu, ''),
      sourceAddress: row.sourceAddress,
      startsAt: new Date(start).toISOString(),
      expiresAt: new Date(expires).toISOString(),
      evidenceAlertIds: [alertId],
      pattern: choice.reason,
      confidence: choice.confidence,
    });
  }

  return [...byAddress.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function checkZTNAExtra({ upstreamDecision, trustedContext, rules }) {
  if (upstreamDecision !== 'allow') {
    return { action: 'preserve', reason: 'upstream_policy_first' };
  }

  if (!trustedContext?.verifiedByServer || !Array.isArray(rules)) {
    return { action: 'pass', reason: 'missing_trusted_context' };
  }

  const sourceAddress = trustedContext.sourceAddress;
  const now = Date.parse(trustedContext.at);
  if (typeof sourceAddress !== 'string' || !Number.isFinite(now)) {
    return { action: 'pass', reason: 'invalid_trusted_context' };
  }

  const active = rules.find((rule) => rule.sourceAddress === sourceAddress
    && Number.isFinite(Date.parse(rule.startsAt))
    && Number.isFinite(Date.parse(rule.expiresAt))
    && Date.parse(rule.startsAt) <= now
    && now < Date.parse(rule.expiresAt)
    && Array.isArray(rule.evidenceAlertIds)
    && rule.evidenceAlertIds.length > 0
    && typeof rule.confidence === 'number'
    && rule.confidence >= 0.85);

  return active
    ? { action: 'deny', reason: active.pattern, ruleId: active.id }
    : { action: 'pass', reason: 'no_active_address_rule' };
}

export async function writeResponseArtifacts({ root, alerts, decisions }) {
  const directory = join(root, 'xdr', 'web-injection');
  await mkdir(directory, { recursive: true });

  const rules = buildDenyCandidates(alerts, decisions);
  await writeFile(join(directory, 'deny-rules.json'), JSON.stringify({
    schema: 'aleph.xdr.ztna-candidates.v1',
    mode: 'simulation_only',
    note: '기존 ZTNA 판정 뒤에서 서버가 검증한 출발 주소만 추가 확인하는 웹 주입 임시 차단 후보입니다.',
    rules,
  }, null, 2) + '\n', 'utf8');

  const logPath = join(root, 'xdr', 'alerts.log');
  let existing = '';
  try {
    existing = await readFile(logPath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const preserved = [];
  for (const line of existing.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (item.moduleKey !== 'web-injection') preserved.push(line);
    } catch {
      preserved.push(line);
    }
  }

  const current = [];
  for (let i = 0; i < alerts.length; i += 1) {
    const alert = alerts[i];
    const choice = decisions[i];
    const alertId = safeAlertId(alert?.id);
    const reason = safeReason(choice?.reason);
    if (!alertId || choice?.alertId !== alertId
      || !['block', 'alert'].includes(choice.action)
      || !reason) {
      continue;
    }

    const row = extractAlert(alert);
    if (!row.timestamp) continue;
    current.push(JSON.stringify({
      at: row.timestamp,
      moduleKey: 'web-injection',
      alertId,
      action: choice.action,
      reason,
    }));
  }

  const all = [...preserved, ...current];
  await writeFile(logPath, all.length ? all.join('\n') + '\n' : '', 'utf8');
}
