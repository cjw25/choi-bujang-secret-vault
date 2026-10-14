import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const START = Date.UTC(2026, 9, 1, 0, 0, 0);
const subject = 'learner_fixture';
const deviceId = 'a'.repeat(16);

function reads(count, {
  intervalSeconds = 2,
  owner = subject,
  device = deviceId,
  network = 'usual',
  decision = 'allow',
  requestType = 'note_read',
  start = START,
  extra = {},
} = {}) {
  return Array.from({ length: count }, (_, index) => ({
    at: new Date(start + index * intervalSeconds * 1000).toISOString(),
    subjectId: owner,
    deviceId: device,
    requestType,
    decision,
    network,
    ...extra,
  }));
}

function legacyReads(count, { intervalSeconds = 2, owner = subject, start = START } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    at: new Date(start + index * intervalSeconds * 1000).toISOString(),
    method: 'GET',
    identity: { sub: owner },
  }));
}

const proposal = {
  action: 'propose_revocation', reasonCode: 'burst_read', subject, deviceId,
};
const legacyProposal = {
  action: 'propose_revocation', reasonCode: 'burst_read', subject,
};

// 9단계 정상 사건 보존과 복합 의심 사건만의 회수 제안을 함께 회귀 검사합니다.
const cases = [
  { name: '정상 조회 30건', events: reads(30), expected: { action: 'observe' } },
  { name: '평소 네트워크의 121건', events: reads(121), expected: { action: 'observe' } },
  { name: '다른 네트워크지만 120건', events: reads(120, { network: 'unusual' }), expected: { action: 'observe' } },
  { name: '다른 네트워크의 121건', events: reads(121, { network: 'unusual' }), expected: proposal },
  { name: '기존 9단계 계약의 GET 121건', events: legacyReads(121), expected: legacyProposal },
  { name: '지역만 다른 대량 조회', events: reads(121, { extra: { region: 'far-away' } }), expected: { action: 'observe' } },
  { name: '거부된 대량 조회', events: reads(121, { network: 'unusual', decision: 'deny' }), expected: { action: 'observe' } },
  { name: '두 기기에 나뉜 조회', events: [
    ...reads(70, { network: 'unusual' }),
    ...reads(60, { network: 'unusual', device: 'b'.repeat(16) }),
  ].sort((a, b) => a.at.localeCompare(b.at)), expected: { action: 'observe' } },
  { name: '10분 밖으로 흩어진 조회', events: reads(200,
    { intervalSeconds: 7, network: 'unusual' }), expected: { action: 'observe' } },
  { name: '비밀값이 붙은 사건도 결과에 노출하지 않음', events: reads(121, {
    network: 'unusual',
    extra: { token: 'do-not-copy', realName: '실명값', noteBody: '메모본문' },
  }), expected: proposal },
];

// This is a practice contract, not a live engine assertion or judge score.
export async function checkDetection(detect) {
  if (typeof detect !== 'function') throw new TypeError('src/detect.mjs에서 detect 함수를 내보내야 합니다.');
  const results = [];
  for (const item of cases) {
    const actual = await detect(item.events);
    const passed = isDeepStrictEqual(actual, item.expected);
    results.push({ name: item.name, passed: Boolean(passed) });
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { detect } = await import('../src/detect.mjs');
    const results = await checkDetection(detect);
    for (const item of results) process.stdout.write(`${item.passed ? '통과' : '확인 필요'} · ${item.name}\n`);
    process.stdout.write('가상 사건 연습이며 실제 접속 회수나 심판 통과 증거가 아닙니다.\n');
    if (results.some(item => !item.passed)) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`탐지 연습 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
