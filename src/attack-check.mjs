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
  try { return await response.json(); } catch { return null; }
}

export async function runAttackChecks(config) {
  if (config.step !== 5) {
    throw new Error('현재 공격 점검은 5단계 서버 집중화에 맞춰져 있습니다.');
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
  const metadataReady = metadata.ok && metadataJson?.step === 5
    && Array.isArray(config.allowedRoutes) && config.allowedRoutes.length > 0;

  const home = await fetch(app, options);
  const homeText = await home.text();
  const nosniff = home.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff';
  const csp = Boolean(home.headers.get('content-security-policy'));
  const browserKeyAbsent = !/sb_publishable_[A-Za-z0-9_-]+/u.test(homeText)
    && !/eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}/u.test(homeText);

  const publicData = await fetch(new URL('/data.json', app), options);
  const publicJson = await readJson(publicData);
  const staticNotesEmpty = publicData.ok && Array.isArray(publicJson?.notes)
    && publicJson.notes.length === 0;

  const original = await fetch(config.originalApiUrl, options);
  const originalDeniedWithoutKey = [401, 403].includes(original.status);

  return [
    { attackId: 'anonymous_note_list_denied', expected: '비로그인 메모 목록 요청은 JSON 오류로 거부',
      observed: anonymousDenied ? `비로그인 요청 거부 확인 (HTTP ${anonymous.status})` : `예상과 다른 응답 (HTTP ${anonymous.status})` },
    { attackId: 'aleph_routes_available', expected: '/aleph.json step 5와 allowedRoutes 1개 이상',
      observed: metadataReady ? 'step 5와 허용 경로 확인' : `메타데이터 확인 실패 또는 단계 불일치 (HTTP ${metadata.status})` },
    { attackId: 'security_header_present', expected: '첫 화면에 nosniff 또는 CSP 보안 헤더 존재',
      observed: nosniff || csp ? `첫 화면 보안 헤더 확인 (${nosniff ? 'nosniff' : 'CSP'})` : `보안 헤더를 확인하지 못함 (HTTP ${home.status})` },
    { attackId: 'browser_public_key_absent', expected: '화면 코드에 Supabase 공개 키 또는 anon JWT가 없음',
      observed: browserKeyAbsent ? '화면 코드에서 Supabase 공개 키를 찾지 못함' : '화면 코드에 공개 키로 보이는 문자열이 남아 있음' },
    { attackId: 'static_note_leak_blocked', expected: '공개 /data.json의 notes 배열은 비어 있음',
      observed: staticNotesEmpty ? '공개 data.json에 메모가 없음' : `공개 data.json 상태가 예상과 다름 (HTTP ${publicData.status})` },
    { attackId: 'original_api_no_key_denied', expected: '원본 자료 HTTPS 경로는 키 없는 직접 요청을 거부',
      observed: originalDeniedWithoutKey ? `원본 직접 요청 거부 확인 (HTTP ${original.status})` : `키 없는 원본 직접 요청이 예상과 다름 (HTTP ${original.status})` },
  ];
}
