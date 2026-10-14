import { createClient } from '@supabase/supabase-js';
import config from '../../../aleph.config.json' with { type: 'json' };
import { studentDeviceApproved } from '../../../src/device-session.mjs';
import { noteContentHash, restoredRowMatches, verifiedBackup } from '../../../src/note-recovery.mjs';
import { createLoginVerifier } from '../../../src/verify-login.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
let verifyLoginAuthorization = null;

function sendJson(response, status, body) {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

function readId(request) {
  const value = request.query?.id;
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') return value[0].toLowerCase();
  return null;
}

function verifier(secretKey) {
  verifyLoginAuthorization ??= createLoginVerifier({ config, supabaseSecretKey: secretKey });
  return verifyLoginAuthorization;
}

function audit(outcome) {
  console.log(JSON.stringify({ event: 'restore', outcome }));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'POST 요청만 허용됩니다.' });
  }

  const id = readId(request);
  if (!id || !UUID.test(id)) return sendJson(response, 400, { error: '올바른 메모 UUID가 필요합니다.' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) return sendJson(response, 500, { error: '자료 저장소 설정이 필요합니다.' });

  let login;
  try { login = await verifier(supabaseSecretKey)(request.headers.authorization); } catch {
    return sendJson(response, 500, { error: '로그인 검증 설정을 확인해 주세요.' });
  }
  if (!login) return sendJson(response, 401, { error: '로그인이 필요합니다.' });

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    if (!(await studentDeviceApproved(request, login, supabase))) {
      return sendJson(response, 403, {
        error: '서버가 승인한 기기에서만 복구할 수 있습니다.',
        reasonCode: 'device_not_registered',
      });
    }
  } catch {
    return sendJson(response, 503, { error: '기기 승인 상태를 확인하지 못했습니다.' });
  }

  const { data: backupRow, error: backupError } = await supabase
    .from('notes_backup')
    .select('public_id, owner_id, title, content, content_hash')
    .eq('public_id', id)
    .eq('owner_id', login.userId)
    .maybeSingle();

  if (backupError) {
    audit('backup_unavailable');
    return sendJson(response, 503, { error: '검증된 복구 사본을 확인하지 못했습니다.' });
  }
  if (!backupRow) return sendJson(response, 404, { error: '복구할 메모를 찾을 수 없습니다.' });

  const backup = verifiedBackup(backupRow, id, login.userId);
  if (!backup) {
    audit('backup_invalid');
    return sendJson(response, 409, { error: '복구 사본 검증에 실패했습니다.' });
  }

  const { data: current, error: currentError } = await supabase
    .from('notes')
    .select('public_id, owner_id, title, content')
    .eq('public_id', id)
    .maybeSingle();

  if (currentError) return sendJson(response, 502, { error: '현재 메모를 확인하지 못했습니다.' });
  if (current && current.owner_id !== login.userId) return sendJson(response, 404, { error: '복구할 메모를 찾을 수 없습니다.' });

  if (current && restoredRowMatches(current, backup)) {
    audit('unchanged');
    return sendJson(response, 200, { id, restored: false, contentHash: backup.contentHash });
  }

  let written;
  let writeError;
  if (current) {
    ({ data: written, error: writeError } = await supabase
      .from('notes')
      .update({ title: backup.title, content: backup.content })
      .eq('public_id', id)
      .eq('owner_id', login.userId)
      .select('public_id, owner_id, title, content')
      .maybeSingle());
  } else {
    ({ data: written, error: writeError } = await supabase
      .from('notes')
      .insert({ public_id: backup.id, owner_id: backup.ownerId, title: backup.title, content: backup.content })
      .select('public_id, owner_id, title, content')
      .maybeSingle());
  }

  if (writeError || !written || !restoredRowMatches(written, backup)) {
    audit('verify_failed');
    return sendJson(response, 502, { error: '복구 결과 검증에 실패했습니다.' });
  }

  const contentHash = noteContentHash(written.title, written.content);
  audit('restored');
  return sendJson(response, 200, { id: written.public_id, restored: true, contentHash });
}
