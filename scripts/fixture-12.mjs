import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../aleph.config.json' with { type: 'json' };
import safePolicy from '../restore/safe-policy.json' with { type: 'json' };
import { RULE_IDS, decide } from '../src/decider.mjs';
import { buildOperationsSummary } from '../src/operations-summary.mjs';

const root = resolve(import.meta.dirname, '..');
const catalog = JSON.parse(readFileSync(resolve(root, 'public/stage12-checks.json'), 'utf8'));

function check(ok, message) {
  if (!ok) throw new Error(message);
  console.log(`통과 · ${message}`);
}

check(config.step >= 12, 'aleph.config.json 단계가 12 이상');
check(Array.isArray(catalog.checks) && catalog.checks.length === 41, '1~11단계 점검표가 정확히 41종');
check(new Set(catalog.checks.map(item => item.id)).size === 41, '41종 점검 ID가 중복되지 않음');
check(catalog.checks.every(item => item.status === 'not_run'
  && item.actualApiResult === null && item.requestId === null && item.checkedAt === null),
'미실행 시험은 임의로 통과 처리하지 않음');

const summary = buildOperationsSummary({
  requestId: '11111111-1111-4111-8111-111111111111',
  checkedAt: '2026-10-14T00:00:00.000Z',
  commit: 'fixture-commit',
  ruleIds: RULE_IDS,
  credentials: [
    { id: 'credential-alpha-1234', approved: true, created_at: '2026-10-13T00:00:00.000Z' },
    { id: 'credential-beta-5678', approved: false, created_at: '2026-10-13T01:00:00.000Z' },
  ],
  sessions: [
    { credential_id: 'credential-alpha-1234', expires_at: '2026-10-14T00:10:00.000Z' },
    { credential_id: 'credential-beta-5678', expires_at: '2026-10-13T23:00:00.000Z' },
  ],
  restoreCommit: safePolicy.commit,
});
check(summary.serverState.credentials.total === 2
  && summary.serverState.credentials.approved === 1
  && summary.serverState.credentials.pending === 1
  && summary.serverState.sessions.active === 1
  && summary.serverState.sessions.expired === 1,
'요약 수치와 가린 서버 기록 계산이 일치');
check(summary.serverState.maskedRecords.every(item => !item.id.includes('credential-')),
'서버 기록 식별자는 화면용으로 가림');
check(summary.detection.evidence === 'not_run'
  && summary.revocation.evidence === 'not_run'
  && summary.restore.execution === 'not_run',
'실측하지 않은 탐지·회수·복구 실행은 미실행으로 유지');

const request = {
  schema: 'aleph.decision.v1',
  requestId: '22222222-2222-4222-8222-222222222222',
  classId: 'fixture',
  projectId: 'fixture',
  subjectId: 'fixture_subject',
  deviceId: 'aaaaaaaaaaaaaaaa',
  service: 'notes',
  method: 'GET',
  path: '/notes/fixture-note',
  route: 'GET /notes/:id',
  queryLength: 0,
  querySha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  at: new Date().toISOString(),
  policyRevision: 'fixture',
  deviceRegistered: true,
  stepUp: { verified: false, authAgeSeconds: null },
  recentEvents: [],
  signals: { source: 'none', region: 'unknown', network: 'unknown', hour: 12 },
};
const result = await decide(request);
check(Object.keys(result).sort().join(',') === 'decision,reasonCode,requestId,ruleIds,schema',
'판정기는 계약의 응답 5개 필드만 반환');
check(result.ruleIds.every(id => RULE_IDS.includes(id)), '응답 ruleIds가 모두 RULE_IDS에 포함');

console.log('가상 로컬 점검이며 실제 Production API 실측, 회수, 복구 실행을 뜻하지 않습니다.');
