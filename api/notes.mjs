import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { hasForbiddenAuthorityFields } from '../src/api-resource-policy.mjs';
import { studentDeviceApproved } from '../src/device-session.mjs';
import { noteResourceId } from '../src/resource-id.mjs';
import { createLoginVerifier } from '../src/verify-login.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
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

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return sendJson(response, 405, { error: 'GET 또는 POST 요청만 허용됩니다.' });
  }

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

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    if (!(await studentDeviceApproved(request, login, supabase))) {
      return sendJson(response, 403, {
        error: '서버가 승인한 기기에서만 자료를 볼 수 있습니다.',
        reasonCode: 'device_not_registered',
      });
    }
  } catch {
    return sendJson(response, 503, { error: '기기 승인 상태를 확인하지 못했습니다.' });
  }

  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('notes')
      .select('public_id, title, content')
      .eq('owner_id', login.userId)
      .order('id', { ascending: true });
    if (error || !Array.isArray(data)) return sendJson(response, 502, { error: '자료를 불러오지 못했습니다.' });
    return sendJson(response, 200, {
      notes: data.map(note => ({
        id: note.public_id,
        resourceId: noteResourceId(note.public_id),
        title: note.title,
        body: note.content,
      })),
    });
  }

  const body = readBody(request);
  if (!body) return sendJson(response, 400, { error: 'title과 body가 필요합니다.' });
  if (hasForbiddenAuthorityFields(body)) {
    return sendJson(response, 403, { error: '권한은 서버에서 확인합니다.', reasonCode: 'resource_denied' });
  }
  if (typeof body.title !== 'string' || typeof body.body !== 'string') {
    return sendJson(response, 400, { error: 'title과 body가 필요합니다.' });
  }
  const title = body.title.trim();
  if (!title) return sendJson(response, 400, { error: 'title이 비어 있습니다.' });

  let id;
  if (body.id === undefined || body.id === null || body.id === '') id = randomUUID();
  else if (typeof body.id === 'string' && UUID.test(body.id)) id = body.id.toLowerCase();
  else return sendJson(response, 400, { error: 'id는 UUID 형식이어야 합니다.' });

  const { error } = await supabase.from('notes').insert({
    public_id: id,
    owner_id: login.userId,
    title,
    content: body.body,
  });
  if (error) return sendJson(response, 409, { error: '메모를 추가하지 못했습니다.' });
  return sendJson(response, 201, { id, resourceId: noteResourceId(id) });
}
