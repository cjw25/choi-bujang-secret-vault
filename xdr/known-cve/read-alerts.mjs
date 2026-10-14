import { readFile } from 'node:fs/promises';

const FIXTURE_URL = new URL('../fixtures/known-cve.json', import.meta.url);

const SECRET_LIKE = [
  /(?:password|passwd|secret|token|authorization|cookie|api[_-]?key|private[_-]?key)\s*[:=]/iu,
  /Bearer\s+\S+/iu,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/u,
  /(?:sk|sb)_(?:secret|live|test|publishable)_[A-Za-z0-9_-]+/iu,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/u,
];

function safeText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  const oneLine = value.replace(/[\r\n]+/gu, ' ').trim().slice(0, maxLength);
  return SECRET_LIKE.some((pattern) => pattern.test(oneLine)) ? '[REDACTED]' : oneLine;
}

export function extractAlert(alert) {
  const level = Number(alert?.rule?.level);
  const account = safeText(alert?.data?.srcuser, 120);
  return {
    at: safeText(alert?.timestamp, 80),
    sourceAddress: safeText(alert?.data?.srcip, 80),
    account: account || null,
    ruleLevel: Number.isFinite(level) ? level : null,
    description: safeText(alert?.rule?.description, 500),
  };
}

export function extractAlerts(fixture) {
  if (!fixture || !Array.isArray(fixture.alerts)) {
    throw new Error('경보 묶음 형식이 아닙니다.');
  }
  return fixture.alerts.map(extractAlert);
}

export async function readAlerts(file = FIXTURE_URL) {
  const fixture = JSON.parse(await readFile(file, 'utf8'));
  return extractAlerts(fixture);
}
