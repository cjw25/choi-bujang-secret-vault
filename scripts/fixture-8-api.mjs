import {
  hasForbiddenAuthorityFields,
  verifyInstructor,
  verifyOwnedNote,
} from '../src/api-resource-policy.mjs';

function makeDb() {
  const tables = {
    notes: [
      { public_id: '11111111-1111-4111-8111-111111111111', owner_id: 'A' },
    ],
    instructor_memberships: [
      { user_id: 'I', enabled: true },
    ],
  };

  return {
    from(table) {
      const filters = [];
      return {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        async maybeSingle() {
          const row = (tables[table] ?? []).find((item) =>
            filters.every(([key, value]) => item[key] === value));
          return { data: row ?? null, error: null };
        },
      };
    },
  };
}

const noteId = '11111111-1111-4111-8111-111111111111';
const db = makeDb();
const checks = [];

const own = await verifyOwnedNote(db, 'A', noteId);
checks.push(['A 자기 메모 API 권한', own.allowed === true]);

const other = await verifyOwnedNote(db, 'B', noteId);
checks.push(['B의 A 메모 직접 API 요청', other.allowed === false
  && other.reasonCode === 'resource_denied']);

const studentNotice = await verifyInstructor(db, 'A');
checks.push(['일반 학생 공지 수정 API 권한', studentNotice.allowed === false
  && studentNotice.reasonCode === 'instructor_required']);

const instructorNotice = await verifyInstructor(db, 'I');
checks.push(['강사 공지 수정 API 권한', instructorNotice.allowed === true]);

checks.push(['요청 본문 role 위조', hasForbiddenAuthorityFields({
  title: 'x', body: 'y', role: 'instructor',
})]);
checks.push(['요청 본문 owner 위조', hasForbiddenAuthorityFields({
  title: 'x', body: 'y', owner_id: 'A',
})]);
checks.push(['요청 본문 resourceId 위조', hasForbiddenAuthorityFields({
  title: 'x', body: 'y', resourceId: `note:${noteId}`,
})]);

for (const [name, passed] of checks) {
  process.stdout.write(`${passed ? '통과' : '확인 필요'} · ${name}\n`);
}
process.stdout.write('이 명령은 가상 DB로 API 권한 대조를 연습하며 실제 운영 DB 권한 확인 결과가 아닙니다.\n');
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
