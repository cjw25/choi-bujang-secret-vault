const WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 120;
const DEVICE_ID = /^[a-f0-9]{16}$/u;

function normalizeEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;

  // 입력에서 필요한 최소 필드만 읽습니다. 본문·토큰·실명 같은 값은 보관하거나 출력하지 않습니다.
  const subjectId = typeof event.subjectId === 'string'
    ? event.subjectId
    : (typeof event.identity?.sub === 'string' ? event.identity.sub : null);
  const deviceId = typeof event.deviceId === 'string' ? event.deviceId : null;
  const requestType = typeof event.requestType === 'string'
    ? event.requestType
    : (typeof event.requestKind === 'string'
      ? event.requestKind
      : (typeof event.method === 'string' ? event.method : null));
  const decision = typeof event.decision === 'string' ? event.decision : null;
  const network = typeof event.network === 'string'
    ? event.network
    : (typeof event.signals?.network === 'string' ? event.signals.network : null);
  const atMs = Date.parse(event.at);

  if (!subjectId || !deviceId || !DEVICE_ID.test(deviceId)
      || !requestType || !decision || !network || !Number.isFinite(atMs)) {
    return null;
  }

  return Object.freeze({ subjectId, deviceId, requestType, decision, network, atMs });
}

function normalizeLegacyEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  if (event.deviceId !== undefined || event.decision !== undefined
      || event.network !== undefined || event.signals !== undefined
      || event.requestType !== undefined || event.requestKind !== undefined) return null;

  const subjectId = typeof event.identity?.sub === 'string' ? event.identity.sub : null;
  const atMs = Date.parse(event.at);
  if (!subjectId || event.method !== 'GET' || !Number.isFinite(atMs)) return null;
  return Object.freeze({ subjectId, atMs });
}

function isReadRequest(requestType) {
  const value = requestType.toLowerCase();
  return value === 'get' || value === 'read' || value === 'note_read' || value === 'notes_read';
}

function findBurst(groups) {
  for (const group of groups.values()) {
    group.sort((a, b) => a.atMs - b.atMs);
    let start = 0;
    for (let end = 0; end < group.length; end += 1) {
      while (group[end].atMs - group[start].atMs > WINDOW_MS) start += 1;
      if (end - start + 1 > BURST_LIMIT) return group[end];
    }
  }
  return null;
}

function findSuspiciousBurst(events) {
  const groups = new Map();
  for (const raw of events) {
    const event = normalizeEvent(raw);
    if (!event || !isReadRequest(event.requestType)
        || event.decision !== 'allow' || event.network !== 'unusual') continue;

    const key = `${event.subjectId}\u0000${event.deviceId}`;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return findBurst(groups);
}

function findLegacyBurst(events) {
  const groups = new Map();
  for (const raw of events) {
    const event = normalizeLegacyEvent(raw);
    if (!event) continue;
    const group = groups.get(event.subjectId) ?? [];
    group.push(event);
    groups.set(event.subjectId, group);
  }
  return findBurst(groups);
}

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  const suspicious = findSuspiciousBurst(events);
  if (suspicious) {
    return {
      action: 'propose_revocation',
      reasonCode: 'burst_read',
      subject: suspicious.subjectId,
      deviceId: suspicious.deviceId,
    };
  }

  const legacy = findLegacyBurst(events);
  if (legacy) {
    return {
      action: 'propose_revocation',
      reasonCode: 'burst_read',
      subject: legacy.subjectId,
    };
  }

  return { action: 'observe' };
}
