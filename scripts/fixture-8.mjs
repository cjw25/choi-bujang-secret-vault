import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDecider } from '../src/decider.mjs';

const EMPTY_QUERY_SHA256 = createHash('sha256').update('').digest('hex');
const NOTE_ID = '11111111-1111-4111-8111-111111111111';
const NOTICE_ID = '22222222-2222-4222-8222-222222222222';
const DEVICE_ID = 'a'.repeat(16);

function request({ subjectId, service, method, path, route }) {
  return {
    schema: 'aleph.decision.v1',
    requestId: randomUUID(),
    classId: 'class_fixture',
    projectId: 'project_fixture',
    subjectId,
    deviceId: DEVICE_ID,
    service,
    method,
    path,
    route,
    queryLength: 0,
    querySha256: EMPTY_QUERY_SHA256,
    at: new Date().toISOString(),
    policyRevision: 1,
    deviceRegistered: true,
    stepUp: { verified: false, authAgeSeconds: null },
    recentEvents: [],
    signals: { source: 'judge_fixture', region: 'local', network: 'usual', hour: 14 },
  };
}

function grant({ subjectId, service, method, path, route }) {
  return {
    classId: 'class_fixture',
    projectId: 'project_fixture',
    subjectId,
    deviceId: DEVICE_ID,
    service,
    method,
    path,
    route,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

export async function runFixture8() {
  const noteRead = {
    service: 'notes', method: 'GET', path: `/notes/${NOTE_ID}`, route: 'GET /notes/:id',
  };
  const noteUpdate = {
    service: 'notes', method: 'PUT', path: `/notes/${NOTE_ID}`, route: 'PUT /notes/:id',
  };
  const noticeUpdate = {
    service: 'announcements', method: 'PUT', path: `/announcements/${NOTICE_ID}`,
    route: 'PUT /announcements/:id',
  };

  const decide = createDecider([
    grant({ subjectId: 'student_a', ...noteRead }),
    grant({ subjectId: 'student_a', ...noteUpdate }),
    grant({ subjectId: 'instructor_fixture', ...noticeUpdate }),
  ]);

  const cases = [
    ['A 자기 메모 읽기', request({ subjectId: 'student_a', ...noteRead }), 'allow'],
    ['A 자기 메모 수정', request({ subjectId: 'student_a', ...noteUpdate }), 'allow'],
    ['B의 A 메모 읽기', request({ subjectId: 'student_b', ...noteRead }), 'deny'],
    ['일반 학생 공지 수정', request({ subjectId: 'student_a', ...noticeUpdate }), 'deny'],
    ['강사 공지 수정', request({ subjectId: 'instructor_fixture', ...noticeUpdate }), 'allow'],
    ['알 수 없는 기능 경로', request({ subjectId: 'student_a', service: 'notes', method: 'GET',
      path: `/notes/${NOTE_ID}/export`, route: 'GET /notes/:id/export' }), 'deny'],
  ];

  const results = [];
  for (const [name, input, expected] of cases) {
    const output = await decide(input);
    results.push({ name, expected, actual: output.decision, passed: output.decision === expected });
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const results = await runFixture8();
    for (const item of results) {
      process.stdout.write(`${item.passed ? '통과' : '확인 필요'} · ${item.name}: ${item.actual}\n`);
    }
    process.stdout.write('이 명령은 서버가 검증해 공급한 가상 권한 목록으로 연습하며 실제 운영 권한 등록 증거가 아닙니다.\n');
    if (results.some((item) => !item.passed)) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`8단계 가상 구역 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
