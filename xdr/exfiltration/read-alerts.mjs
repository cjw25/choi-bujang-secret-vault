import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';

const FIXTURE_URL = new URL('../fixtures/exfiltration.json', import.meta.url);

function sanitizeDescription(value) {
  if (typeof value !== 'string') return '';
  const limited = value.slice(0, 4096);
  if (/(?:password|passwd|pwd|secret|api[_-]?key|authorization|bearer|token|cookie|private[\s_-]*key|ghp_|github_pat_|sb_secret_|sb_publishable_|sk-proj-|eyJ[A-Za-z0-9_-]{12,}\.)/iu.test(limited)) {
    return '[redacted]';
  }
  return limited.replace(/[\r\n\t\u0000-\u001f]+/gu, ' ').slice(0, 512);
}

// 확인용 모듈: 허용된 다섯 필드만 뽑고 원본 경보는 수정하지 않습니다.
export function extract(alert) {
  const description = alert?.rule?.description;
  const account = alert?.data?.srcuser;
  return {
    timestamp: typeof alert?.timestamp === 'string' && Number.isFinite(Date.parse(alert.timestamp))
      ? alert.timestamp : null,
    sourceIp: typeof alert?.data?.srcip === 'string' && isIP(alert.data.srcip)
      ? alert.data.srcip : null,
    account: typeof account === 'string'
      && /^[a-z][a-z0-9._-]{0,47}$/iu.test(account)
      && !/^(?:password|secret|token|api[_-]?key)/iu.test(account)
      ? account : '[redacted]',
    level: Number.isInteger(alert?.rule?.level) && alert.rule.level >= 0 && alert.rule.level <= 16
      ? alert.rule.level : null,
    description: sanitizeDescription(description),
  };
}

export async function readAlerts(source = FIXTURE_URL) {
  const fixture = JSON.parse(await readFile(source, 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1'
      || fixture.moduleKey !== 'exfiltration'
      || !Array.isArray(fixture.alerts)) {
    throw new Error('exfiltration Wazuh 경보 묶음 형식이 아닙니다.');
  }
  const rows = fixture.alerts.map(extract);
  if (rows.length !== fixture.alerts.length) {
    throw new Error('경보와 추출 행 수가 일치하지 않습니다.');
  }
  return rows;
}
