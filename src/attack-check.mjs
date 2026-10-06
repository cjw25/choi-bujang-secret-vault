// Student self-checks for the currently deployed stage.
// Never return tokens, private keys, real names, or note bodies.
function appUrl(config) {
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

  return app;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function runAttackChecks(config) {
  if (config.step !== 4) {
    throw new Error('현재 공격 점검은 4단계 자료 소유자 보호에 맞춰져 있습니다.');
  }

  const app = appUrl(config);
  const options = { redirect: 'error', signal: AbortSignal.timeout(10000) };

  const anonymous = await fetch(new URL('/api/notes', app), options);
  const anonymousJson = await readJson(anonymous);
  const anonymousDenied = [401, 403].includes(anonymous.status)
    && anonymous.headers.get('content-type')?.includes('application/json')
    && typeof anonymousJson?.error === 'string' && anonymousJson.error.trim().length > 0;

  const metadata = await fetch(new URL('/aleph.json', app), options);
  const metadataJson = await readJson(metadata);
  const metadataReady = metadata.ok && metadataJson?.step === 4;

  const home = await fetch(app, options);
  const nosniff = home.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff';
  const csp = Boolean(home.headers.get('content-security-policy'));

  const publicData = await fetch(new URL('/data.json', app), options);
  const publicJson = await readJson(publicData);
  const staticNotesEmpty = publicData.ok && Array.isArray(publicJson?.notes)
    && publicJson.notes.length === 0;

  return [
    {
      attackId: 'anonymous_note_list_denied',
      expected: '비로그인 메모 목록 요청은 401 또는 403과 JSON 오류 문구로 거부',
      observed: anonymousDenied
        ? `비로그인 요청이 JSON 오류로 거부됨 (HTTP ${anonymous.status})`
        : `예상과 다른 비로그인 응답 (HTTP ${anonymous.status})`,
    },
    {
      attackId: 'aleph_metadata_available',
      expected: '배포 주소의 /aleph.json이 열리고 step이 4',
      observed: metadataReady
        ? '배포 메타데이터가 열리고 step 4 확인'
        : `배포 메타데이터 확인 실패 또는 단계 불일치 (HTTP ${metadata.status})`,
    },
    {
      attackId: 'security_header_present',
      expected: '첫 화면에 X-Content-Type-Options: nosniff 또는 Content-Security-Policy 존재',
      observed: nosniff || csp
        ? `첫 화면 보안 헤더 확인 (${nosniff ? 'nosniff' : 'CSP'})`
        : `첫 화면 보안 헤더를 확인하지 못함 (HTTP ${home.status})`,
    },
    {
      attackId: 'static_note_leak_blocked',
      expected: '공개 /data.json의 notes 배열은 비어 있음',
      observed: staticNotesEmpty
        ? '공개 data.json에 메모가 없음'
        : `공개 data.json 상태가 예상과 다름 (HTTP ${publicData.status})`,
    },
  ];
}
