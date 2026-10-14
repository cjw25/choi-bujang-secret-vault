import { createHash } from 'node:crypto';

export const DEVICE_SESSION_SECONDS = 30 * 60;
export const CHALLENGE_SECONDS = 5 * 60;

export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function loginSessionToken(request) {
  const authorization = request?.headers?.authorization
    ?? request?.headers?.Authorization;
  if (typeof authorization !== 'string') return '';
  const match = /^Bearer\s+(.+)$/iu.exec(authorization.trim());
  return match?.[1] ?? '';
}

export async function checkDeviceSession(supabase, ownerId, token, now = Date.now()) {
  if (!supabase || typeof ownerId !== 'string'
      || typeof token !== 'string' || token.length < 16 || token.length > 8192) return false;

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
  return checkDeviceSession(supabase, login.userId, loginSessionToken(request));
}
