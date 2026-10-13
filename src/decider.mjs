// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 6단계: 등록된 기기만 자료실 접근을 허용합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered']);

function readVerifiedFixtureSignals(request) {
  const signals = request?.signals;
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) return null;

  // 현재 계약에서 judge_fixture는 로컬/심판 가상 사건의 출처 표시일 뿐
  // 실제 위치 증거가 아닙니다. 그 밖의 임의 출처나 클라이언트 헤더는 승격하지 않습니다.
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

export async function decide(request) {
  // 입력은 계약에 있는 엔진 검증 필드만 읽습니다. 현재 6단계 판정에는 아직 사용하지 않습니다.
  readVerifiedFixtureSignals(request);
  readVerifiedRecentEvents(request);
  readVerifiedStepUp(request);

  if (request.deviceRegistered !== true) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request.requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: [RULE_IDS[0]],
    };
  }

  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: [RULE_IDS[0]],
  };
}
