// Student self-checks for the currently deployed stage.
// Never return tokens, private keys, real names, or note bodies.
function appUrl(config) {
  let app;
  try { app = new URL(config.publicAppUrl); } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  return app;
}

async function readJson(response) {
  if (!response) return null;
  try { return await response.json(); } catch { return null; }
}

async function safeFetch() {
  return { response: null, error: 'not_run' };
}

function observedFailure(error) { return error === 'not_run' ? 'not_run' : `요청 실패 (${error ?? 'unknown_error'})`; }

export async function runAttackChecks(config) {
  if (![5, 6, 7, 8, 9, 10, 11, 12].includes(config.step)) {
    throw new Error('현재 공격 점검은 5~12단계 자료실 보호 흐름에 맞춰져 있습니다.');
  }

  const app = appUrl(config);
  const options = { redirect: 'error', signal: AbortSignal.timeout(10000) };

  const anonymousResult = await safeFetch(new URL('/api/notes', app), options);
  const anonymous = anonymousResult.response;
  const anonymousJson = await readJson(anonymous);
  const anonymousDenied = Boolean(anonymous) && [401, 403].includes(anonymous.status)
    && anonymous.headers.get('content-type')?.includes('application/json')
    && typeof anonymousJson?.error === 'string' && anonymousJson.error.trim().length > 0;

  const metadataResult = await safeFetch(new URL('/aleph.json', app), options);
  const metadata = metadataResult.response;
  const metadataJson = await readJson(metadata);
  const metadataReady = Boolean(metadata) && metadata.ok && metadataJson?.step === config.step
    && Array.isArray(config.allowedRoutes) && config.allowedRoutes.length > 0
    && (config.step < 10 || metadataJson?.restoreRoute === config.restoreRoute);

  const homeResult = await safeFetch(app, options);
  const home = homeResult.response;
  let homeText = '';
  if (home) {
    try { homeText = await home.text(); } catch { homeText = ''; }
  }
  const nosniff = home?.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff';
  const csp = Boolean(home?.headers.get('content-security-policy'));
  const browserKeyAbsent = Boolean(home)
    && !/sb_publishable_[A-Za-z0-9_-]+/u.test(homeText)
    && !/eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}/u.test(homeText);

  const publicDataResult = await safeFetch(new URL('/data.json', app), options);
  const publicData = publicDataResult.response;
  const publicJson = await readJson(publicData);
  const staticNotesEmpty = Boolean(publicData) && publicData.ok
    && Array.isArray(publicJson?.notes) && publicJson.notes.length === 0;

  const originalResult = await safeFetch(config.originalApiUrl, options);
  const original = originalResult.response;
  const originalDeniedWithoutKey = Boolean(original) && [401, 403].includes(original.status);

  const attempts = [
    { attackId: 'anonymous_note_list_denied', expected: '비로그인 메모 목록 요청은 JSON 오류로 거부',
      observed: anonymousResult.error ? observedFailure(anonymousResult.error)
        : anonymousDenied ? `비로그인 요청 거부 확인 (HTTP ${anonymous.status})`
          : `예상과 다른 응답 (HTTP ${anonymous.status})` },
    { attackId: 'aleph_routes_available', expected: `/aleph.json step ${config.step}와 현재 허용 경로 확인`,
      observed: metadataResult.error ? observedFailure(metadataResult.error)
        : metadataReady ? `step ${config.step}와 허용 경로 확인`
          : `메타데이터 확인 실패 또는 단계 불일치 (HTTP ${metadata.status})` },
    { attackId: 'security_header_present', expected: '첫 화면에 nosniff 또는 CSP 보안 헤더 존재',
      observed: homeResult.error ? observedFailure(homeResult.error)
        : nosniff || csp ? `첫 화면 보안 헤더 확인 (${nosniff ? 'nosniff' : 'CSP'})`
          : `보안 헤더를 확인하지 못함 (HTTP ${home.status})` },
    { attackId: 'browser_public_key_absent', expected: '화면 코드에 Supabase 공개 키 또는 anon JWT가 없음',
      observed: homeResult.error ? observedFailure(homeResult.error)
        : browserKeyAbsent ? '화면 코드에서 Supabase 공개 키를 찾지 못함'
          : '화면 코드에 공개 키로 보이는 문자열이 남아 있음' },
    { attackId: 'static_note_leak_blocked', expected: '공개 /data.json의 notes 배열은 비어 있음',
      observed: publicDataResult.error ? observedFailure(publicDataResult.error)
        : staticNotesEmpty ? '공개 data.json에 메모가 없음'
          : `공개 data.json 상태가 예상과 다름 (HTTP ${publicData.status})` },
    { attackId: 'original_api_no_key_denied', expected: '원본 자료 HTTPS 경로는 키 없는 직접 요청을 거부',
      observed: originalResult.error ? observedFailure(originalResult.error)
        : originalDeniedWithoutKey ? `원본 직접 요청 거부 확인 (HTTP ${original.status})`
          : `키 없는 원본 직접 요청이 예상과 다름 (HTTP ${original.status})` },
  ];

  if (config.step >= 8) {
    const fakeId = '11111111-1111-4111-8111-111111111111';
    const announcementResult = await safeFetch(new URL(`/api/announcements/${fakeId}`, app), {
      ...options, method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'fixture', body: 'fixture' }),
    });
    const announcement = announcementResult.response;
    const announcementJson = await readJson(announcement);
    const announcementDenied = Boolean(announcement) && [401, 403].includes(announcement.status)
      && typeof announcementJson?.error === 'string' && announcementJson.error.trim().length > 0;
    attempts.push({ attackId: 'anonymous_announcement_update_denied',
      expected: '비로그인 강사 공지 수정 요청은 거부',
      observed: announcementResult.error ? observedFailure(announcementResult.error)
        : announcementDenied ? `비로그인 공지 수정 거부 확인 (HTTP ${announcement.status})`
          : `예상과 다른 응답 (HTTP ${announcement.status})` });
  }

  if (config.step >= 10) {
    const fakeId = '11111111-1111-4111-8111-111111111111';
    const route = typeof config.restoreRoute === 'string' ? config.restoreRoute : '';
    const [method, template] = route.split(' ');
    const path = template?.replace(':id', fakeId);
    const restoreResult = method === 'POST' && path
      ? await safeFetch(new URL(path, app), { ...options, method: 'POST',
        headers: { 'content-type': 'application/json' }, body: '{}' })
      : { response: null, error: 'invalid_restore_route' };
    const restore = restoreResult.response;
    const restoreJson = await readJson(restore);
    const restoreDenied = Boolean(restore) && [401, 403].includes(restore.status)
      && typeof restoreJson?.error === 'string' && restoreJson.error.trim().length > 0;
    attempts.push({ attackId: 'anonymous_restore_denied', expected: '비로그인 단일 메모 복구 요청은 거부',
      observed: restoreResult.error ? observedFailure(restoreResult.error)
        : restoreDenied ? `비로그인 복구 요청 거부 확인 (HTTP ${restore.status})`
          : `예상과 다른 응답 (HTTP ${restore.status})` });
  }

  if (config.step >= 11) {
    const manifestResult = await safeFetch(new URL('/manifest.webmanifest', app), options);
    const manifest = manifestResult.response;
    const manifestJson = await readJson(manifest);
    const manifestReady = Boolean(manifest?.ok)
      && typeof manifestJson?.name === 'string' && manifestJson.name.length > 0
      && manifestJson?.start_url === '/' && manifestJson?.display === 'standalone';
    attempts.push({ attackId: 'install_manifest_ready',
      expected: '설치형 웹앱 manifest에 이름, 시작 경로, standalone 표시가 있음',
      observed: manifestResult.error ? observedFailure(manifestResult.error)
        : manifestReady ? '설치형 웹앱 manifest 확인'
          : `manifest 확인 실패 (HTTP ${manifest?.status ?? 'no_response'})` });

    const offlineResult = await safeFetch(new URL('/offline.html', app), options);
    attempts.push({ attackId: 'offline_guidance_ready', expected: '오프라인 안내 화면은 공개되며 보호 자료를 포함하지 않음',
      observed: offlineResult.error ? observedFailure(offlineResult.error)
        : offlineResult.response?.ok ? '오프라인 안내 화면 확인'
          : `오프라인 안내 확인 실패 (HTTP ${offlineResult.response?.status ?? 'no_response'})` });

    for (const endpoint of ['register', 'verify']) {
      const result = await safeFetch(new URL(`/api/device/${endpoint}`, app), {
        ...options, method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      });
      const response = result.response;
      const body = await readJson(response);
      const denied = Boolean(response) && [401, 403].includes(response.status)
        && typeof body?.error === 'string' && body.error.trim().length > 0;
      attempts.push({ attackId: `anonymous_device_${endpoint}_denied`,
        expected: `비로그인 기기 ${endpoint === 'register' ? '승인 요청' : '승인 확인'}은 거부`,
        observed: result.error ? observedFailure(result.error)
          : denied ? `비로그인 기기 요청 거부 확인 (HTTP ${response.status})`
            : `예상과 다른 응답 (HTTP ${response.status})` });
    }
  }


  if (config.step >= 12) {
    const operationsResult = await safeFetch(new URL('/api/operations/summary', app), options);
    const operations = operationsResult.response;
    const operationsJson = await readJson(operations);
    const operationsDenied = Boolean(operations) && [401, 403].includes(operations.status)
      && typeof operationsJson?.error === 'string' && operationsJson.error.trim().length > 0;
    attempts.push({ attackId: 'anonymous_operations_denied',
      expected: '비로그인 탈환 작전실 요약 요청은 거부',
      observed: operationsResult.error ? observedFailure(operationsResult.error)
        : operationsDenied ? `비로그인 작전실 요청 거부 확인 (HTTP ${operations.status})`
          : `예상과 다른 응답 (HTTP ${operations.status})` });
  }

  return attempts;
}
