import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from './verify-login.mjs';
import {
  CHALLENGE_SECONDS,
  DEVICE_SESSION_SECONDS,
  loginSessionToken,
  sha256,
} from './device-session.mjs';

const APP_URL = new URL(config.publicAppUrl);
const RP_ID = APP_URL.hostname;
const EXPECTED_ORIGIN = APP_URL.origin;
const RP_NAME = 'BYTE BACK 내 자료실';
let verifyLoginAuthorization = null;

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

function verifier(secretKey) {
  verifyLoginAuthorization ??= createLoginVerifier({ config, supabaseSecretKey: secretKey });
  return verifyLoginAuthorization;
}

async function start(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'POST 요청만 허용됩니다.' });
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    sendJson(response, 500, { error: '기기 승인 서버 설정이 필요합니다.' });
    return null;
  }

  let login;
  try {
    login = await verifier(supabaseSecretKey)(request.headers.authorization);
  } catch {
    sendJson(response, 500, { error: '로그인 검증 설정을 확인해 주세요.' });
    return null;
  }
  if (!login) {
    sendJson(response, 401, { error: '로그인이 필요합니다.' });
    return null;
  }
  if (login.kind !== 'student') {
    sendJson(response, 403, { error: '학생 계정에서만 기기 승인을 요청할 수 있습니다.' });
    return null;
  }

  const body = readBody(request);
  if (!body || Object.keys(body).some(key => key !== 'response')
      || (body.response !== undefined && (!body.response || typeof body.response !== 'object'))) {
    sendJson(response, 400, { error: '기기 승인 요청 형식이 맞지 않습니다.' });
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { body, login, supabase };
}

async function saveChallenge(supabase, ownerId, kind, challenge) {
  await supabase.from('device_challenges').delete().eq('owner_id', ownerId).eq('kind', kind);
  const { error } = await supabase.from('device_challenges').insert({
    owner_id: ownerId,
    kind,
    challenge,
    expires_at: new Date(Date.now() + CHALLENGE_SECONDS * 1000).toISOString(),
  });
  if (error) throw new Error('challenge_store_failed');
}

async function takeChallenge(supabase, ownerId, kind) {
  const { data, error } = await supabase
    .from('device_challenges')
    .select('challenge, expires_at')
    .eq('owner_id', ownerId)
    .eq('kind', kind)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase.from('device_challenges').delete().eq('owner_id', ownerId).eq('kind', kind);
  if (error || !data || Date.parse(data.expires_at) <= Date.now()) return null;
  return data.challenge;
}

async function credentialsOf(supabase, ownerId) {
  const { data, error } = await supabase
    .from('device_credentials')
    .select('id, owner_id, public_key, counter, approved')
    .eq('owner_id', ownerId);
  if (error || !Array.isArray(data)) throw new Error('credential_read_failed');
  return data;
}

export async function handleDeviceRegister(request, response) {
  const started = await start(request, response);
  if (!started) return undefined;
  const { body, login, supabase } = started;

  try {
    if (!body.response) {
      const existing = await credentialsOf(supabase, login.userId);
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: login.userId,
        userDisplayName: '자료실 사용자',
        userID: new TextEncoder().encode(login.userId),
        attestationType: 'none',
        excludeCredentials: existing.map(item => ({ id: item.id })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });
      await saveChallenge(supabase, login.userId, 'register', options.challenge);
      return sendJson(response, 200, { options });
    }

    const expectedChallenge = await takeChallenge(supabase, login.userId, 'register');
    if (!expectedChallenge) return sendJson(response, 400, { error: '기기 등록 요청이 만료되었습니다.' });

    let result;
    try {
      result = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
    } catch {
      result = { verified: false };
    }
    const credential = result.registrationInfo?.credential;
    if (!result.verified || !credential) {
      return sendJson(response, 400, { error: '기기 등록 서명을 확인하지 못했습니다.' });
    }

    const { error } = await supabase.from('device_credentials').insert({
      id: credential.id,
      owner_id: login.userId,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      approved: false,
    });
    if (error) return sendJson(response, 409, { error: '이미 등록 요청된 기기입니다.' });
    return sendJson(response, 200, { status: 'pending' });
  } catch {
    return sendJson(response, 500, { error: '기기 승인 기능을 사용할 수 없습니다.' });
  }
}

export async function handleDeviceVerify(request, response) {
  const started = await start(request, response);
  if (!started) return undefined;
  const { body, login, supabase } = started;

  try {
    const credentials = await credentialsOf(supabase, login.userId);
    if (!body.response) {
      if (!credentials.length) return sendJson(response, 200, { status: 'not_requested' });
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: credentials.map(item => ({ id: item.id })),
        userVerification: 'preferred',
      });
      await saveChallenge(supabase, login.userId, 'verify', options.challenge);
      return sendJson(response, 200, { status: 'verify_required', options });
    }

    const expectedChallenge = await takeChallenge(supabase, login.userId, 'verify');
    if (!expectedChallenge) return sendJson(response, 400, { error: '기기 확인 요청이 만료되었습니다.' });
    const stored = credentials.find(item => item.id === body.response.id);
    if (!stored) return sendJson(response, 403, { error: '등록 요청되지 않은 기기입니다.' });

    let result;
    try {
      result = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        credential: {
          id: stored.id,
          publicKey: isoBase64URL.toBuffer(stored.public_key),
          counter: Number(stored.counter),
        },
      });
    } catch {
      result = { verified: false };
    }
    if (!result.verified) return sendJson(response, 403, { error: '이 기기를 확인하지 못했습니다.' });

    await supabase.from('device_credentials')
      .update({ counter: result.authenticationInfo.newCounter })
      .eq('id', stored.id)
      .eq('owner_id', login.userId);

    if (stored.approved !== true) return sendJson(response, 200, { status: 'pending' });

    const loginToken = loginSessionToken(request);
    if (!loginToken) throw new Error('login_token_missing');
    const expiresAt = new Date(Date.now() + DEVICE_SESSION_SECONDS * 1000).toISOString();
    const { error } = await supabase.from('device_sessions').upsert({
      token_sha256: sha256(loginToken),
      owner_id: login.userId,
      credential_id: stored.id,
      expires_at: expiresAt,
    }, { onConflict: 'token_sha256' });
    if (error) throw new Error('session_store_failed');
    return sendJson(response, 200, { status: 'approved' });
  } catch {
    return sendJson(response, 500, { error: '기기 승인 기능을 사용할 수 없습니다.' });
  }
}
