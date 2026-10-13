// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 등록된 기기만 자료실 접근을 허용합니다.
// 7단계: 검증된 가상 복합 이상 접속은 추가 본인 확인을 요구합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

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

export async function decide(request) {
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
