import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../../src/verify-login.mjs';
import { instructorNoticeResourceId } from '../../src/resource-id.mjs';
import { hasForbiddenAuthorityFields, verifyInstructor } from '../../src/api-resource-policy.mjs';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

let verifyLoginAuthorization = null;

function sendJson(response, status, body) {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

function getLoginVerifier(supabaseSecretKey) {
  if (!verifyLoginAuthorization) verifyLoginAuthorization = createLoginVerifier({ config, supabaseSecretKey });
  return verifyLoginAuthorization;
}

function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch { return null; }
  }
  return null;
}

function readId(request) {
  const value = request.query?.id;
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length === 1) return value[0];
  return null;
}

export default async function handler(request, response) {
  if (request.method !== 'PUT') {
    response.setHeader('Allow', 'PUT');
    return sendJson(response, 405, { error: '공지 수정은 PUT 요청만 허용됩니다.' });
  }

  const id = readId(request);
  if (!id || !UUID.test(id)) return sendJson(response, 400, { error: '올바른 공지 UUID가 필요합니다.' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) return sendJson(response, 500, { error: '자료 저장소 설정이 필요합니다.' });

  let login;
  try {
    login = await getLoginVerifier(supabaseSecretKey)(request.headers.authorization);
  } catch {
    return sendJson(response, 500, { error: '로그인 검증 설정을 확인해 주세요.' });
  }
  if (!login) return sendJson(response, 401, { error: '로그인이 필요합니다.' });

  const body = readBody(request);
  if (!body || hasForbiddenAuthorityFields(body)) {
    return sendJson(response, 403, { error: '권한은 서버에서 확인합니다.', reasonCode: 'instructor_required' });
  }
  if (typeof body.title !== 'string' || !body.title.trim() || typeof body.body !== 'string') {
    return sendJson(response, 400, { error: 'title과 body가 필요합니다.' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const instructor = await verifyInstructor(supabase, login.userId);
  if (!instructor.allowed) {
    const status = instructor.reasonCode === 'policy_unavailable' ? 503 : 403;
    return sendJson(response, status, { error: '강사 권한이 필요합니다.', reasonCode: instructor.reasonCode });
  }

  const { data, error } = await supabase
    .from('announcements')
    .update({ title: body.title.trim(), content: body.body })
    .eq('public_id', id.toLowerCase())
    .select('public_id, title, content')
    .maybeSingle();

  if (error) return sendJson(response, 502, { error: '공지를 수정하지 못했습니다.' });
  if (!data) return sendJson(response, 404, { error: '공지를 찾을 수 없습니다.', reasonCode: 'resource_denied' });

  return sendJson(response, 200, {
    id: data.public_id,
    resourceId: instructorNoticeResourceId(data.public_id),
    title: data.title,
    body: data.content,
  });
}
