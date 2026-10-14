import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import safePolicy from '../../restore/safe-policy.json' with { type: 'json' };
import { RULE_IDS } from '../../src/decider.mjs';
import { studentDeviceApproved } from '../../src/device-session.mjs';
import { buildOperationsSummary } from '../../src/operations-summary.mjs';
import { createLoginVerifier } from '../../src/verify-login.mjs';

let verifyLoginAuthorization = null;

function sendJson(response, status, body) {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

function verifier(secretKey) {
  verifyLoginAuthorization ??= createLoginVerifier({ config, supabaseSecretKey: secretKey });
  return verifyLoginAuthorization;
}

function wantsMeasurement(request) {
  const value = request.query?.measure;
  return value === '1' || (Array.isArray(value) && value.length === 1 && value[0] === '1');
}

async function measuredRequest(base, authorization, id, path, expectedStatus) {
  const requestId = randomUUID();
  const checkedAt = new Date().toISOString();
  try {
    const result = await fetch(new URL(path, base), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: authorization,
        'X-Aleph-Check-Id': requestId,
      },
    });
    const status = result.status;
    if (result.body) await result.body.cancel().catch(() => {});
    return {
      id,
      status: status === expectedStatus ? 'pass' : 'fail',
      actualApiResult: `HTTP ${status}`,
      requestId,
      checkedAt,
    };
  } catch {
    return {
      id,
      status: 'fail',
      actualApiResult: '요청 실패',
      requestId,
      checkedAt,
    };
  }
}

async function runMeasuredChecks(authorization) {
  const base = new URL(config.publicAppUrl);
  const normal = await measuredRequest(base, authorization, 'S11-N03', '/api/notes', 200);
  const forbidden = await measuredRequest(
    base,
    authorization,
    'S04-F01',
    `/api/notes/${randomUUID()}`,
    404,
  );
  return [normal, forbidden];
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'GET 요청만 허용됩니다.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return sendJson(response, 500, { error: '작전실 서버 설정이 필요합니다.' });
  }

  let login;
  try {
    login = await verifier(supabaseSecretKey)(request.headers.authorization);
  } catch {
    return sendJson(response, 500, { error: '로그인 검증 설정을 확인해 주세요.' });
  }
  if (!login) return sendJson(response, 401, { error: '로그인이 필요합니다.' });

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    if (!(await studentDeviceApproved(request, login, supabase))) {
      return sendJson(response, 403, {
        error: '서버가 승인한 기기에서만 탈환 작전실을 볼 수 있습니다.',
        reasonCode: 'device_not_registered',
      });
    }

    let credentials = [];
    let sessions = [];
    if (login.kind === 'student') {
      const credentialResult = await supabase
        .from('device_credentials')
        .select('id, approved, created_at')
        .eq('owner_id', login.userId)
        .order('created_at', { ascending: true });
      if (credentialResult.error) throw new Error('credential_read_failed');
      credentials = Array.isArray(credentialResult.data) ? credentialResult.data : [];

      const sessionResult = await supabase
        .from('device_sessions')
        .select('credential_id, expires_at, created_at')
        .eq('owner_id', login.userId)
        .order('created_at', { ascending: true });
      if (sessionResult.error) throw new Error('session_read_failed');
      sessions = Array.isArray(sessionResult.data) ? sessionResult.data : [];
    }

    const checkedAt = new Date().toISOString();
    const summary = buildOperationsSummary({
      requestId: randomUUID(),
      checkedAt,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ruleIds: RULE_IDS,
      credentials,
      sessions,
      restoreCommit: safePolicy.commit,
    });
    summary.measuredChecks = wantsMeasurement(request)
      ? await runMeasuredChecks(request.headers.authorization)
      : [];
    return sendJson(response, 200, summary);
  } catch {
    return sendJson(response, 500, { error: '탈환 작전실 요약을 만들지 못했습니다.' });
  }
}
