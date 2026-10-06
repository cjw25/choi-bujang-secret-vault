import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

let verifyLoginAuthorization = null;

function sendJson(response, status, body) {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

function getLoginVerifier(supabaseSecretKey) {
  if (!verifyLoginAuthorization) {
    verifyLoginAuthorization = createLoginVerifier({
      config,
      supabaseSecretKey,
    });
  }

  return verifyLoginAuthorization;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'GET 요청만 허용됩니다.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return sendJson(response, 500, { error: '자료 저장소 설정이 필요합니다.' });
  }

  let login;

  try {
    const verify = getLoginVerifier(supabaseSecretKey);
    login = await verify(request.headers.authorization);
  } catch {
    return sendJson(response, 500, { error: '로그인 검증 설정을 확인해 주세요.' });
  }

  if (!login) {
    return sendJson(response, 401, { error: '로그인이 필요합니다.' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from('notes')
    .select('title, content')
    .order('id', { ascending: true });

  if (error || !Array.isArray(data)) {
    return sendJson(response, 502, { error: '자료를 불러오지 못했습니다.' });
  }

  return sendJson(response, 200, { notes: data });
}