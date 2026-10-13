import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../../src/verify-login.mjs';

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
  if (!verifyLoginAuthorization) {
    verifyLoginAuthorization = createLoginVerifier({
      config,
      supabaseSecretKey,
    });
  }

  return verifyLoginAuthorization;
}

function readBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch {
      return null;
    }
  }

  return null;
}

function readId(request) {
  const value = request.query?.id;

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length === 1) {
    return value[0];
  }

  return null;
}

export default async function handler(request, response) {
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT, DELETE');
    return sendJson(response, 405, {
      error: 'GET, PUT 또는 DELETE 요청만 허용됩니다.',
    });
  }

  const id = readId(request);

  if (!id || !UUID.test(id)) {
    return sendJson(response, 400, {
      error: '올바른 메모 UUID가 필요합니다.',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return sendJson(response, 500, {
      error: '자료 저장소 설정이 필요합니다.',
    });
  }

  let login;

  try {
    const verify = getLoginVerifier(supabaseSecretKey);
    login = await verify(request.headers.authorization);
  } catch {
    return sendJson(response, 500, {
      error: '로그인 검증 설정을 확인해 주세요.',
    });
  }

  if (!login) {
    return sendJson(response, 401, {
      error: '로그인이 필요합니다.',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('notes')
      .select('public_id, title, content')
      .eq('public_id', id)
      .eq('owner_id', login.userId)
      .maybeSingle();

    if (error) {
      return sendJson(response, 502, {
        error: '자료를 불러오지 못했습니다.',
      });
    }

    if (!data) {
      return sendJson(response, 404, {
        error: '메모를 찾을 수 없습니다.',
      });
    }

    return sendJson(response, 200, {
      id: data.public_id,
      title: data.title,
      body: data.content,
    });
  }

  if (request.method === 'PUT') {
    const body = readBody(request);

    if (!body || typeof body.title !== 'string' || typeof body.body !== 'string') {
      return sendJson(response, 400, {
        error: 'title과 body가 필요합니다.',
      });
    }

    const title = body.title.trim();

    if (!title) {
      return sendJson(response, 400, {
        error: 'title이 비어 있습니다.',
      });
    }

    const { data, error } = await supabase
      .from('notes')
      .update({
        title,
        content: body.body,
      })
      .eq('public_id', id)
      .eq('owner_id', login.userId)
      .select('public_id, title, content')
      .maybeSingle();

    if (error) {
      return sendJson(response, 502, {
        error: '메모를 수정하지 못했습니다.',
      });
    }

    if (!data) {
      return sendJson(response, 404, {
        error: '메모를 찾을 수 없습니다.',
      });
    }

    return sendJson(response, 200, {
      id: data.public_id,
      title: data.title,
      body: data.content,
    });
  }

  const { data, error } = await supabase
    .from('notes')
    .delete()
    .eq('public_id', id)
      .eq('owner_id', login.userId)
    .select('public_id')
    .maybeSingle();

  if (error) {
    return sendJson(response, 502, {
      error: '메모를 삭제하지 못했습니다.',
    });
  }

  if (!data) {
    return sendJson(response, 404, {
      error: '메모를 찾을 수 없습니다.',
    });
  }

  response.status(204);
  response.setHeader('Cache-Control', 'no-store');
  return response.end();
}