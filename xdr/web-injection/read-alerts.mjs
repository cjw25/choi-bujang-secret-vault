import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';

function safeDescription(value) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[\r\n\t]+/g, ' ').slice(0, 512);
  if (/(?:password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|비밀번호|암호)\s*[:=]\s*["']?[^\s;,"']+/iu.test(text)
    || /\b(?:sk-|ghp_|github_pat_|sb_secret_|sb_publishable_)[A-Za-z0-9_-]{8,}/u.test(text)
    || /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u.test(text)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(text)) {
    return '[REDACTED]';
  }
  return text;
}

export function extractAlert(alert) {
  const timestamp = typeof alert?.timestamp === 'string' && Number.isFinite(Date.parse(alert.timestamp))
    ? alert.timestamp : null;
  const sourceAddress = isIP(alert?.data?.srcip ?? '') ? alert.data.srcip : null;
  const account = typeof alert?.data?.srcuser === 'string'
    && /^[a-z][a-z0-9._-]{0,47}$/i.test(alert.data.srcuser)
    && !/^(?:password|passwd|token|secret|apikey)/i.test(alert.data.srcuser)
    ? alert.data.srcuser : null;
  const level = alert?.rule?.level;
  const ruleLevel = Number.isInteger(level) && level >= 0 && level <= 16 ? level : null;
  return {
    timestamp,
    sourceAddress,
    account,
    ruleLevel,
    description: safeDescription(alert?.rule?.description),
  };
}

export async function readAlerts(file = new URL('../fixtures/web-injection.json', import.meta.url)) {
  const fixture = JSON.parse(await readFile(file, 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1'
    || fixture.moduleKey !== 'web-injection'
    || !Array.isArray(fixture.alerts)) {
    throw new Error('웹 주입 경보 묶음 형식이 아닙니다.');
  }
  return fixture.alerts.map(extractAlert);
}
