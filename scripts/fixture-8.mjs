import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDecider } from '../src/decider.mjs';

const EMPTY_QUERY_SHA256 = createHash('sha256').update('').digest('hex');
const NONEMPTY_QUERY_SHA256 = createHash('sha256').update('mode=export').digest('hex');
const NOTE_ID = 'judge-note-a';
const NOTICE_ID = 'judge-notice-a';
const MATERIAL_ID = 'judge-material-a';
const DEVICE_ID = 'a'.repeat(16);

function request({ subjectId = 'student_a', service, method, path, route,
  queryLength = 0, querySha256 = EMPTY_QUERY_SHA256 }) {
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
    queryLength,
    querySha256,
    at: new Date().toISOString(),
    policyRevision: 1,
    deviceRegistered: true,
    stepUp: { verified: false, authAgeSeconds: null },
    recentEvents: [],
    signals: { source: 'judge_fixture', region: 'local', network: 'usual', hour: 14 },
  };
}

export async function runFixture8() {
  const decide = createDecider([]);
  const cases = [
    ['메모 한 건 읽기', request({ service: 'notes', method: 'GET', path: `/api/notes/${NOTE_ID}`, route: 'GET /api/notes/:id' }), 'allow'],
    ['메모 한 건 수정', request({ service: 'notes', method: 'PUT', path: `/api/notes/${NOTE_ID}`, route: 'PUT /api/notes/:id' }), 'allow'],
    ['메모 한 건 삭제', request({ service: 'notes', method: 'DELETE', path: `/api/notes/${NOTE_ID}`, route: 'DELETE /api/notes/:id' }), 'allow'],
    ['메모 생성', request({ service: 'notes', method: 'POST', path: '/api/notes', route: 'POST /api/notes' }), 'deny'],
    ['메모 전체 목록 조회', request({ service: 'notes', method: 'GET', path: '/api/notes', route: 'GET /api/notes' }), 'deny'],
    ['공지 한 건 읽기', request({ service: 'announcements', method: 'GET', path: `/api/announcements/${NOTICE_ID}`, route: 'GET /api/announcements/:id' }), 'allow'],
    ['공지 생성', request({ service: 'announcements', method: 'POST', path: '/api/announcements', route: 'POST /api/announcements' }), 'deny'],
    ['공지 수정', request({ service: 'announcements', method: 'PUT', path: `/api/announcements/${NOTICE_ID}`, route: 'PUT /api/announcements/:id' }), 'deny'],
    ['강사 자료 읽기', request({ service: 'materials', method: 'GET', path: `/api/materials/${MATERIAL_ID}`, route: 'GET /api/materials/:id' }), 'deny'],
    ['강사 자료 생성', request({ service: 'materials', method: 'POST', path: '/api/materials', route: 'POST /api/materials' }), 'deny'],
    ['쿼리로 기능 선택', request({ service: 'notes', method: 'GET', path: `/api/notes/${NOTE_ID}`, route: 'GET /api/notes/:id',
      queryLength: 11, querySha256: NONEMPTY_QUERY_SHA256 }), 'deny'],
    ['알 수 없는 export 경로', request({ service: 'notes', method: 'GET',
      path: `/api/notes/${NOTE_ID}/export`, route: 'GET /api/notes/:id/export' }), 'deny'],
    ['완전히 모르는 경로', request({ service: 'unknown', method: 'GET', path: '/api/unknown/x', route: 'GET /api/unknown/:id' }), 'deny'],
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
    process.stdout.write('이 명령은 계약의 경로·메서드 구역 규칙을 확인하는 로컬 가상 연습이며 실제 심판 판정이 아닙니다.\n');
    if (results.some((item) => !item.passed)) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`8단계 가상 구역 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
