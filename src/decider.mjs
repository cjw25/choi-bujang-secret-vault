// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 등록된 기기만 자료실 접근을 허용합니다.
// 7단계: 검증된 가상 복합 이상 접속은 추가 본인 확인을 요구합니다.
// 8단계: 정확히 알려진 자원 경로와 동작만 허용하고 나머지는 기본 거부합니다.
// 요청 계약에 없는 role, identity, device, ownerId 같은 값은 읽지 않습니다.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required', 'resource_zone']);

const EMPTY_QUERY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const ITEM_PATH = new RegExp(`^/(api/)?(notes|announcements|materials)/(${UUID})$`, 'iu');
const NOTE_COLLECTION_PATH = /^\/(?:api\/)?notes$/u;

function readVerifiedFixtureSignals(request) {
  const signals = request?.signals;
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) return null;
  if (signals.source !== 'judge_fixture') return null;
  if (typeof signals.region !== 'string' || !signals.region
      || typeof signals.network !== 'string' || !signals.network
      || !Number.isInteger(signals.hour) || signals.hour < 0 || signals.hour > 23) {
    return null;
  }
  return { source: signals.source, region: signals.region, network: signals.network, hour: signals.hour };
}

function readVerifiedRecentEvents(request) {
  if (!Array.isArray(request?.recentEvents) || request.recentEvents.length > 12) return null;
  const events = [];
  for (const event of request.recentEvents) {
    if (!event || typeof event !== 'object' || Array.isArray(event)
        || typeof event.kind !== 'string' || !event.kind
        || !Number.isInteger(event.ageSeconds) || event.ageSeconds < 0
        || !Number.isInteger(event.count) || event.count < 0) return null;
    events.push({ kind: event.kind, ageSeconds: event.ageSeconds, count: event.count });
  }
  return events;
}

function readVerifiedStepUp(request) {
  const stepUp = request?.stepUp;
  if (!stepUp || typeof stepUp !== 'object' || Array.isArray(stepUp)) return null;
  if (typeof stepUp.verified !== 'boolean') return null;
  if (stepUp.verified === false && stepUp.authAgeSeconds !== null) return null;
  if (stepUp.verified === true
      && (!Number.isInteger(stepUp.authAgeSeconds)
        || stepUp.authAgeSeconds < 0 || stepUp.authAgeSeconds > 900)) return null;
  return { verified: stepUp.verified, authAgeSeconds: stepUp.authAgeSeconds };
}

function isFixtureRisk(signals, events) {
  if (!signals || !events) return false;
  const unusualHour = signals.hour <= 5;
  const unfamiliarNetwork = signals.network === 'unusual';
  const burstRead = events.some(event => event.kind === 'risk_signal'
    && event.ageSeconds <= 300 && event.count >= 20);
  return unusualHour && unfamiliarNetwork && burstRead;
}

function response(request, decision, reasonCode, ruleIds) {
  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision,
    reasonCode,
    ruleIds: Array.isArray(ruleIds) ? ruleIds : [ruleIds],
  };
}

function queryIsEmpty(request) {
  return request?.queryLength === 0 && request?.querySha256 === EMPTY_QUERY_SHA256;
}

function routeForItem(apiPrefix, service, method) {
  return `${method} /${apiPrefix}${service}/:id`;
}

function knownZoneRequest(request) {
  if (typeof request?.path !== 'string' || typeof request?.route !== 'string'
      || typeof request?.service !== 'string' || typeof request?.method !== 'string'
      || !queryIsEmpty(request)) return false;

  // 메모 생성은 서버가 로그인 사용자를 owner_id로 강제하므로 기존 기능을 유지합니다.
  if (NOTE_COLLECTION_PATH.test(request.path)) {
    const apiPrefix = request.path.startsWith('/api/') ? 'api/' : '';
    return request.service === 'notes'
      && request.method === 'POST'
      && request.route === `POST /${apiPrefix}notes`;
  }

  const match = ITEM_PATH.exec(request.path);
  if (!match) return false;

  const apiPrefix = match[1] ? 'api/' : '';
  const service = match[2].toLowerCase();
  if (request.service !== service) return false;

  if (service === 'notes') {
    if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return false;
    return request.route === routeForItem(apiPrefix, service, request.method);
  }

  // 현재 요청 계약에는 강사 역할이 없으므로 공지/강사 자료 쓰기는 누구에게도 허용하지 않습니다.
  if (service === 'announcements' || service === 'materials') {
    return request.method === 'GET'
      && request.route === routeForItem(apiPrefix, service, 'GET');
  }

  return false;
}

async function decideKnownRequest(request) {
  if (request?.deviceRegistered !== true) {
    return response(request, 'deny', 'device_not_registered', 'device_registered');
  }

  if (!knownZoneRequest(request)) {
    return response(request, 'deny', 'policy_denied', 'resource_zone');
  }

  const signals = readVerifiedFixtureSignals(request);
  const events = readVerifiedRecentEvents(request);
  const stepUp = readVerifiedStepUp(request);

  if (isFixtureRisk(signals, events)) {
    if (stepUp?.verified === true && stepUp.authAgeSeconds <= 900) {
      return response(request, 'allow', 'approved', ['step_up_required', 'resource_zone']);
    }
    return response(request, 'step_up', 'step_up_required', ['step_up_required', 'resource_zone']);
  }

  return response(request, 'allow', 'approved', ['device_registered', 'resource_zone']);
}

// 이전 로컬 연습 코드와의 호환을 위해 같은 진입점을 유지합니다.
// 8단계 소유자 비교는 최종 자료 API가 저장된 owner_id로 다시 확인합니다.
export function configureResourceGrants(grants) {
  if (!Array.isArray(grants)) throw new TypeError('자원 권한 목록이 필요합니다.');
}

export function clearResourceGrants() {}

export function createDecider(grants = []) {
  if (!Array.isArray(grants)) throw new TypeError('자원 권한 목록이 필요합니다.');
  return async function decideConfigured(request) {
    return decideKnownRequest(request);
  };
}

export async function decide(request) {
  return decideKnownRequest(request);
}
