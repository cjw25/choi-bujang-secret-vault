// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 2) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');

  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  const staticResponse = await fetch(new URL('/data.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let staticNotesEmpty = false;
  if (staticResponse.ok) {
    try {
      const data = await staticResponse.json();
      staticNotesEmpty = Array.isArray(data?.notes) && data.notes.length === 0;
    } catch {
      // A non-JSON response is a failed check.
    }
  }

  const apiResponse = await fetch(new URL('/api/notes', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let apiVisible = false;
  if (apiResponse.ok) {
    try {
      const data = await apiResponse.json();
      apiVisible = Array.isArray(data?.notes) && data.notes.length === 4;
    } catch {
      // Do not include note bodies in the result.
    }
  }

  return [
    {
      attackId: 'static_note_read',
      expected: '공개 /data.json에는 메모가 없어야 함',
      observed: staticNotesEmpty
        ? '공개 정적 파일에서 메모가 보이지 않음'
        : `공개 정적 파일 점검 실패 (HTTP ${staticResponse.status})`,
    },
    {
      attackId: 'anonymous_api_note_read',
      expected: '현재 단계에서는 공개 API로 가상 메모 네 건이 보이는 약점이 남아 있음',
      observed: apiVisible
        ? '비로그인 API 요청으로 가상 메모 네 건을 읽을 수 있음'
        : `공개 API에서 네 건을 확인하지 못함 (HTTP ${apiResponse.status})`,
    },
  ];
}
