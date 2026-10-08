import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractAlert } from './read-alerts.mjs';
import { matchStrongPattern } from './match.mjs';

const RULE_TTL_MS = 15 * 60 * 1000;

// XDR은 기존 ZTNA 정책을 대신하지 않습니다. block + 0.85 이상 + 강한 T1110
// 패턴을 모두 만족한 경보의 출발 주소만 임시 추가 거부 후보로 만듭니다.
export function buildDenyCandidates(alerts, decisions) {
  const decisionById = new Map(decisions.map((d) => [d.alertId, d]));
  const byAddress = new Map();

  for (const alert of alerts) {
    if (typeof alert?.id !== 'string' || !/^bf-[a-zA-Z0-9-]{1,40}$/.test(alert.id)) continue;

    const choice = decisionById.get(alert.id);
    const evidence = matchStrongPattern(alert);
    if (!choice || choice.action !== 'block' || choice.confidence < 0.85
      || !evidence || choice.reason !== evidence.name) continue;

    const row = extractAlert(alert);
    const start = Date.parse(row.at);
    if (!Number.isFinite(start) || !row.sourceAddress) continue;

    const prior = byAddress.get(row.sourceAddress);
    const expiresAt = new Date(start + RULE_TTL_MS).toISOString();
    if (prior) {
      if (!prior.evidenceAlertIds.includes(alert.id)) prior.evidenceAlertIds.push(alert.id);
      if (Date.parse(prior.expiresAt) < start + RULE_TTL_MS) prior.expiresAt = expiresAt;
      if (Date.parse(prior.startsAt) > start) prior.startsAt = row.at;
      if (choice.confidence > prior.confidence) {
        prior.confidence = choice.confidence;
        prior.pattern = evidence.name;
      }
    } else {
      byAddress.set(row.sourceAddress, {
        id: 'xdr.t1110.' + createHash('sha256').update(row.sourceAddress).digest('hex').slice(0, 16),
        sourceAddress: row.sourceAddress,
        startsAt: row.at,
        expiresAt,
        evidenceAlertIds: [alert.id],
        pattern: evidence.name,
        confidence: choice.confidence,
      });
    }
  }

  return [...byAddress.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// 기존 판정이 allow일 때만 서버가 검증한 출발 주소를 추가 확인합니다.
// 기존 deny/step_up은 절대 완화하지 않으며 브라우저가 보낸 주소는 신뢰하지 않습니다.
export function checkZTNAExtra({ upstreamDecision, trustedContext, rules }) {
  if (upstreamDecision !== 'allow') {
    return { action: 'preserve', reason: 'upstream_policy_first' };
  }
  if (!trustedContext?.verifiedByServer || !Array.isArray(rules)) {
    return { action: 'pass', reason: 'missing_trusted_context' };
  }

  const { sourceAddress, at } = trustedContext;
  const now = Date.parse(at);
  if (typeof sourceAddress !== 'string' || !Number.isFinite(now)) {
    return { action: 'pass', reason: 'invalid_trusted_context' };
  }

  const active = rules.find((rule) => rule.sourceAddress === sourceAddress
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

export async function writeIntegrationArtifacts({ root, alerts, decisions }) {
  if (!Array.isArray(alerts) || !Array.isArray(decisions)
    || alerts.length !== decisions.length) {
    throw new Error('경보와 판단 결과 건수가 일치하지 않습니다.');
  }

  const directory = join(root, 'xdr', 'brute-force');
  await mkdir(directory, { recursive: true });
  const candidates = buildDenyCandidates(alerts, decisions);
  await writeFile(join(directory, 'deny-rules.json'), JSON.stringify({
    schema: 'aleph.xdr.ztna-candidates.v1',
    mode: 'simulation_only',
    note: '기존 ZTNA 판정 뒤에서 서버가 검증한 출발 주소만 추가 확인하는 임시 차단 후보입니다.',
    rules: candidates,
  }, null, 2) + '\n', 'utf8');

  const logPath = join(root, 'xdr', 'alerts.log');
  let existing = '';
  try {
    existing = await readFile(logPath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const logged = new Set();
  for (const line of existing.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (item.moduleKey === 'brute-force') logged.add(item.alertId + '\0' + item.action);
    } catch {
      // 기존 로그 줄은 보존하지만 신뢰하지 않습니다.
    }
  }

  const added = [];
  for (let i = 0; i < alerts.length; i += 1) {
    const choice = decisions[i];
    if (!['block', 'alert'].includes(choice.action) || choice.alertId !== alerts[i]?.id) continue;
    if (!/^[a-z][a-z0-9_]{0,63}$/u.test(choice.reason)) continue;

    const row = extractAlert(alerts[i]);
    const key = choice.alertId + '\0' + choice.action;
    if (!row.at || logged.has(key)) continue;
    logged.add(key);
    added.push(JSON.stringify({
      at: row.at,
      moduleKey: 'brute-force',
      alertId: choice.alertId,
      action: choice.action,
      reason: choice.reason,
    }));
  }

  if (added.length) await appendFile(logPath, added.join('\n') + '\n', 'utf8');
}
