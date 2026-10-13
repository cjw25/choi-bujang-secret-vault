// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 등록된 기기만 자료실 접근을 허용합니다.
// 7단계: 검증된 가상 복합 이상 접속은 추가 본인 확인을 요구합니다.
// 8단계: 서버/엔진이 검증해 주입한 자원 권한과 정확한 사용자·기기·메서드·경로를 대조합니다.
// 요청 본문의 userId, role, ownerId, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required', 'resource_zone']);

const EMPTY_QUERY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const RESOURCE_PATH = new RegExp(`^/(api/)?(notes|announcements)/(${UUID})$`, 'iu');
const RESOURCE_PREFIX = /^\/(?:api\/)?(?:notes|announcements)\//iu;
const RESOURCE_GRANT_KEYS = Object.freeze([
  'classId', 'projectId', 'subjectId', 'deviceId',
  'service', 'method', 'path', 'route', 'expiresAt',
]);

let activeResourceGrants = Object.freeze([]);

function readVerifiedFixtureSignals(request) {
  const signals = request?.signals;
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) return null;

  // judge_fixture는 로컬/심판 가상 사건의 출처 표시일 뿐 실제 위치 증거가 아닙니다.
  // source가 없거나 다른 값이면 임의의 정상 지역·시각·네트워크로 채우지 않습니다.
  if (signals.source !== 'judge_fixture') return null;
  if (typeof signals.region !== 'string' || !signals.region
      || typeof signals.network !== 'string' || !signals.network
      || !Number.isInteger(signals.hour) || signals.hour < 0 || signals.hour > 23) {
    return null;
  }

  return {
    source: signals.source,
    region: signals.region,
    network: signals.network,
    hour: signals.hour,
  };
}

function readVerifiedRecentEvents(request) {
  if (!Array.isArray(request?.recentEvents)) return null;
  if (request.recentEvents.length > 12) return null;

  const events = [];
  for (const event of request.recentEvents) {
    if (!event || typeof event !== 'object' || Array.isArray(event)
        || typeof event.kind !== 'string' || !event.kind
        || !Number.isInteger(event.ageSeconds) || event.ageSeconds < 0
        || !Number.isInteger(event.count) || event.count < 0) {
      return null;
    }
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
        || stepUp.authAgeSeconds < 0 || stepUp.authAgeSeconds > 900)) {
    return null;
  }
  return { verified: stepUp.verified, authAgeSeconds: stepUp.authAgeSeconds };
}

function isFixtureRisk(signals, events) {
  if (!signals || !events) return false;

  const unusualHour = signals.hour <= 5;
  const unfamiliarNetwork = signals.network === 'unusual';
  const burstRead = events.some(event => event.kind === 'risk_signal'
    && event.ageSeconds <= 300 && event.count >= 20);

  // 지역 하나만으로는 추가 확인이나 영구 차단을 만들지 않습니다.
  return unusualHour && unfamiliarNetwork && burstRead;
}

function response(request, decision, reasonCode, ruleIds) {
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode,
    ruleIds: Array.isArray(ruleIds) ? ruleIds : [ruleIds],
  };
}

function parseResourcePath(path) {
  if (typeof path !== 'string') return null;
  const match = RESOURCE_PATH.exec(path);
  if (!match) return null;
  const apiPrefix = match[1] ? 'api/' : '';
  return {
    service: match[2].toLowerCase(),
    id: match[3].toLowerCase(),
    routeBase: `/${apiPrefix}${match[2].toLowerCase()}/:id`,
  };
}

function allowedResourceMethod(service, method) {
  if (service === 'notes') return ['GET', 'PUT', 'DELETE'].includes(method);
  if (service === 'announcements') return method === 'PUT';
  return false;
}

function validateResourceGrant(grant) {
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)) {
    throw new TypeError('유효한 자원 권한이 필요합니다.');
  }

  const keys = Object.keys(grant).sort().join(',');
  if (keys !== [...RESOURCE_GRANT_KEYS].sort().join(',')) {
    throw new TypeError('자원 권한 항목이 맞지 않습니다.');
  }

  if (RESOURCE_GRANT_KEYS.some((key) => typeof grant[key] !== 'string' || !grant[key])) {
    throw new TypeError('자원 권한 값이 비어 있습니다.');
  }

  if (!/^[a-f0-9]{16}$/u.test(grant.deviceId)) {
    throw new TypeError('확인된 기기 ID 형식이 필요합니다.');
  }

  const resource = parseResourcePath(grant.path);
  if (!resource
      || grant.service !== resource.service
      || !allowedResourceMethod(resource.service, grant.method)
      || grant.route !== `${grant.method} ${resource.routeBase}`
      || !Number.isFinite(Date.parse(grant.expiresAt))) {
    throw new TypeError('정확한 자원 메서드와 경로가 필요합니다.');
  }

  return Object.freeze({ ...grant });
}

function snapshotResourceGrants(grants) {
  if (!Array.isArray(grants)) throw new TypeError('자원 권한 목록이 필요합니다.');
  return Object.freeze(grants.map(validateResourceGrant));
}

// 브라우저 요청에서 grant를 만들지 않습니다. 서버/운영 엔진이 확인한 목록만 주입합니다.
export function configureResourceGrants(grants) {
  activeResourceGrants = snapshotResourceGrants(grants);
}

export function clearResourceGrants() {
  activeResourceGrants = Object.freeze([]);
}

function isResourceScopedRequest(request) {
  if (typeof request?.route === 'string' && request.route.includes('/:id')) return true;
  return typeof request?.path === 'string' && RESOURCE_PREFIX.test(request.path);
}

function resourceRequestAllowed(request, grants) {
  if (typeof request?.classId !== 'string' || !request.classId
      || typeof request?.projectId !== 'string' || !request.projectId
      || typeof request?.subjectId !== 'string' || !request.subjectId
      || !/^[a-f0-9]{16}$/u.test(request?.deviceId ?? '')
      || request.queryLength !== 0
      || request.querySha256 !== EMPTY_QUERY_SHA256) {
    return false;
  }

  const resource = parseResourcePath(request.path);
  if (!resource
      || request.service !== resource.service
      || !allowedResourceMethod(resource.service, request.method)
      || request.route !== `${request.method} ${resource.routeBase}`) {
    return false;
  }

  const requestAt = Date.parse(request.at);
  if (!Number.isFinite(requestAt)) return false;

  return grants.some((grant) => grant.classId === request.classId
    && grant.projectId === request.projectId
    && grant.subjectId === request.subjectId
    && grant.deviceId === request.deviceId
    && grant.service === request.service
    && grant.method === request.method
    && grant.path === request.path
    && grant.route === request.route
    && requestAt <= Date.parse(grant.expiresAt));
}

async function decideWithResourceGrants(request, grants) {
  if (request.deviceRegistered !== true) {
    return response(request, 'deny', 'device_not_registered', 'device_registered');
  }

  const resourceScoped = isResourceScopedRequest(request);
  if (resourceScoped && !resourceRequestAllowed(request, grants)) {
    return response(request, 'deny', 'policy_denied', 'resource_zone');
  }

  const signals = readVerifiedFixtureSignals(request);
  const events = readVerifiedRecentEvents(request);
  const stepUp = readVerifiedStepUp(request);
  const resourceRule = resourceScoped ? ['resource_zone'] : [];

  if (isFixtureRisk(signals, events)) {
    if (stepUp?.verified === true && stepUp.authAgeSeconds <= 900) {
      return response(request, 'allow', 'approved', ['step_up_required', ...resourceRule]);
    }
    return response(request, 'step_up', 'step_up_required', ['step_up_required', ...resourceRule]);
  }

  return response(request, 'allow', 'approved', ['device_registered', ...resourceRule]);
}

// 가상 검사나 서버 내부 연결점에서 고정된 권한 스냅샷을 가진 판정기를 만들 수 있습니다.
export function createDecider(grants) {
  const snapshot = snapshotResourceGrants(grants);
  return async function decideConfigured(request) {
    return decideWithResourceGrants(request, snapshot);
  };
}

// 운영 엔진이 호출하는 기본 진입점도 동일한 resource_zone 검사를 통과합니다.
// 권한이 주입되지 않은 자원 단건 요청은 허용하지 않습니다.
export async function decide(request) {
  return decideWithResourceGrants(request, activeResourceGrants);
}
