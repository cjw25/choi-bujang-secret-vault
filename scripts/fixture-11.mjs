import assert from 'node:assert/strict';
import { checkDeviceSession, sha256, studentDeviceApproved } from '../src/device-session.mjs';

const OWNER = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'A'.repeat(43);
const CREDENTIAL = 'fixture-credential';

function fakeSupabase({ expiresAt, approved }) {
  return {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        maybeSingle() {
          if (table === 'device_sessions') {
            return Promise.resolve({
              data: { credential_id: CREDENTIAL, expires_at: expiresAt },
              error: null,
            });
          }
          if (table === 'device_credentials') {
            return Promise.resolve({ data: { id: CREDENTIAL, approved }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('unknown_table') });
        },
      };
      return query;
    },
  };
}

const future = new Date(Date.now() + 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();

assert.equal(await studentDeviceApproved({}, { kind: 'judge' }, null), true);
console.log('통과 · 심판 검증 경로는 기존 보호 요청 판정을 유지');

assert.equal(await checkDeviceSession(fakeSupabase({ expiresAt: future, approved: true }), OWNER, ''), false);
console.log('통과 · 기기 세션이 없으면 학생 자료 접근 거부');

assert.equal(await checkDeviceSession(fakeSupabase({ expiresAt: future, approved: false }), OWNER, TOKEN), false);
console.log('통과 · 승인 대기 기기는 자료 접근 거부');

assert.equal(await checkDeviceSession(fakeSupabase({ expiresAt: past, approved: true }), OWNER, TOKEN), false);
console.log('통과 · 만료된 기기 세션은 자료 접근 거부');

assert.equal(await checkDeviceSession(fakeSupabase({ expiresAt: future, approved: true }), OWNER, TOKEN), true);
assert.equal(sha256(TOKEN).length, 64);
console.log('통과 · 서버 승인 기기와 유효한 짧은 세션만 자료 접근 허용');
console.log('가상 서버 상태 연습이며 실제 기기 승인이나 Production DB 설정 완료를 뜻하지 않습니다.');
