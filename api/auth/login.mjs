import { createClient } from '@supabase/supabase-js';

function sendJson(response, status, body) {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch { return null; }
  }
  return null;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'POST 요청만 허용됩니다.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return sendJson(response, 500, { error: '로그인 서버 설정이 필요합니다.' });
  }

  const body = readBody(request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string'
      || !body.email.trim() || !body.password) {
    return sendJson(response, 400, { error: '이메일과 비밀번호가 필요합니다.' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error || !data?.session?.access_token) {
    return sendJson(response, 401, { error: '로그인 정보를 확인해 주세요.' });
  }

  return sendJson(response, 200, {
    access_token: data.session.access_token,
    expires_at: data.session.expires_at ?? null,
  });
}
