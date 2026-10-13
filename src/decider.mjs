// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 등록된 기기만 자료실 접근을 허용합니다.
// 7단계: 검증된 가상 복합 이상 접속은 추가 본인 확인을 요구합니다.
// 8단계: 서버가 검증해 공급한 자원 권한과 정확한 메서드·경로를 대조합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required', 'resource_zone']);

const RESOURCE_GRANT_KEYS = Object.freeze([
  'classId', 'projectId', 'subjectId', 'deviceId',
  'service', 'method', 'path', 'route', 'expiresAt',
]);
const RESOURCE_PATH = /^\/(api\/)?(notes|announcements)\/(demo|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu;

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

function response(request, decision, reasonCode, ruleId) {
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode,
    ruleIds: [ruleId],
  };
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
  const match = RESOURCE_PATH.exec(grant.path);
  if (!match || grant.service !== match[2]
      || !['GET', 'PUT', 'DELETE'].includes(grant.method)
      || grant.route !== `${grant.method} /${match[1] ?? ''}${match[2]}/:id`
      || !Number.isFinite(Date.parse(grant.expiresAt))) {
    throw new TypeError('정확한 자원 메서드와 경로가 필요합니다.');
  }
  return Object.freeze({ ...grant });
}

function resourceRequestAllowed(request, grants) {
  if (typeof request?.subjectId !== 'string' || !request.subjectId
      || !/^[a-f0-9]{16}$/u.test(request?.deviceId ?? '')
      || request.queryLength !== 0) {
    return false;
  }

  const match = RESOURCE_PATH.exec(request.path ?? '');
  if (!match || request.service !== match[2]
      || !['GET', 'PUT', 'DELETE'].includes(request.method)
      || request.route !== `${request.method} /${match[1] ?? ''}${match[2]}/:id`) {
    return false;
  }

  const requestAt = Date.parse(request.at);
  if (!Number.isFinite(requestAt)) return false;

  return grants.some((grant) => RESOURCE_GRANT_KEYS.slice(0, -1)
    .every((key) => grant[key] === request[key])
    && requestAt <= Date.parse(grant.expiresAt));
}

async function decideBase(request) {
  if (request.deviceRegistered !== true) {
    return response(request, 'deny', 'device_not_registered', 'device_registered');
  }

  const signals = readVerifiedFixtureSignals(request);
  const events = readVerifiedRecentEvents(request);
  const stepUp = readVerifiedStepUp(request);

  if (isFixtureRisk(signals, events)) {
    // 엔진 계약이 새 로그인/추가 확인을 검증한 경우에만 같은 요청을 다시 허용합니다.
    if (stepUp?.verified === true && stepUp.authAgeSeconds <= 900) {
      return response(request, 'allow', 'approved', 'step_up_required');
    }
    return response(request, 'step_up', 'step_up_required', 'step_up_required');
  }

  return response(request, 'allow', 'approved', 'device_registered');
}

// 서버 내부에서 검증한 권한 목록만 주입합니다. 브라우저 요청·쿼리·본문에서 grant를 만들지 않습니다.
export function createDecider(grants) {
  if (!Array.isArray(grants)) throw new TypeError('자원 권한 목록이 필요합니다.');
  const snapshot = grants.map(validateResourceGrant);

  return async function decideWithResourceZone(request) {
    if (request.deviceRegistered !== true) return decideBase(request);
    if (!resourceRequestAllowed(request, snapshot)) {
      return response(request, 'deny', 'policy_denied', 'resource_zone');
    }
    return decideBase(request);
  };
}

// 기존 6~7단계 기본 진입점은 그대로 유지합니다.
export async function decide(request) {
  return decideBase(request);
}
