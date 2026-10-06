// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 3) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');

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

  const apiResponse = await fetch(new URL('/api/notes', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let apiJsonError = false;
  try {
    const data = await apiResponse.json();
    apiJsonError = (apiResponse.status === 401 || apiResponse.status === 403)
      && typeof data?.error === 'string' && data.error.trim().length > 0;
  } catch {
    // Non-JSON rejection is a failed check.
  }

  const alephResponse = await fetch(new URL('/aleph.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let alephVisible = false;
  if (alephResponse.ok) {
    try {
      const data = await alephResponse.json();
      alephVisible = data?.schema === 'aleph.defense.deployment.v1' && data?.step === 3;
    } catch {
      // Non-JSON response is a failed check.
    }
  }

  const homeResponse = await fetch(app, {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  const nosniff = homeResponse.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff';
  const csp = Boolean(homeResponse.headers.get('content-security-policy'));

  return [
    {
      attackId: 'anonymous_api_note_read',
      expected: '비로그인 메모 목록 요청은 401 또는 403 JSON 오류로 거부되어야 함',
      observed: apiJsonError
        ? `비로그인 요청이 JSON 오류로 거부됨 (HTTP ${apiResponse.status})`
        : `비로그인 요청 거부 점검 실패 (HTTP ${apiResponse.status})`,
    },
    {
      attackId: 'deployment_identity_read',
      expected: '배포 주소의 /aleph.json이 열리고 3단계 배포 식별 정보를 제공해야 함',
      observed: alephVisible
        ? '/aleph.json에서 3단계 배포 식별 정보를 확인함'
        : `/aleph.json 확인 실패 (HTTP ${alephResponse.status})`,
    },
    {
      attackId: 'home_security_header',
      expected: '첫 화면 응답에 X-Content-Type-Options: nosniff 또는 Content-Security-Policy가 있어야 함',
      observed: nosniff || csp
        ? '첫 화면 응답에서 보안 헤더를 확인함'
        : `첫 화면 보안 헤더 점검 실패 (HTTP ${homeResponse.status})`,
    },
  ];
}
