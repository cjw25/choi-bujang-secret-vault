import { createHash, randomBytes } from 'node:crypto';

export const DEVICE_SESSION_HEADER = 'x-device-session';
export const DEVICE_SESSION_SECONDS = 30 * 60;
export const CHALLENGE_SECONDS = 5 * 60;
const SESSION_TOKEN = /^[A-Za-z0-9_-]{43}$/u;

export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function newDeviceSession() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenSha256: sha256(token) };
}

export function deviceSessionHeader(request) {
  const value = request?.headers?.[DEVICE_SESSION_HEADER]
    ?? request?.headers?.['X-Device-Session'];
  return typeof value === 'string' ? value : '';
}

export async function checkDeviceSession(supabase, ownerId, token, now = Date.now()) {
  if (!supabase || typeof ownerId !== 'string' || !SESSION_TOKEN.test(token ?? '')) return false;

  const { data: session, error: sessionError } = await supabase
    .from('device_sessions')
    .select('credential_id, expires_at')
    .eq('token_sha256', sha256(token))
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (sessionError || !session || Date.parse(session.expires_at) <= now) return false;

  const { data: credential, error: credentialError } = await supabase
    .from('device_credentials')
    .select('id, approved')
    .eq('id', session.credential_id)
    .eq('owner_id', ownerId)
    .maybeSingle();

  return !credentialError && credential?.approved === true;
}

export async function studentDeviceApproved(request, login, supabase) {
  if (login?.kind !== 'student') return true;
  return checkDeviceSession(supabase, login.userId, deviceSessionHeader(request));
}
