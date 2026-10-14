export function maskRecordId(value) {
  if (typeof value !== 'string' || !value) return '가림';
  if (value.length <= 8) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function validDate(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function buildOperationsSummary({
  requestId,
  checkedAt,
  commit,
  ruleIds,
  credentials = [],
  sessions = [],
  restoreCommit,
}) {
  const now = Date.parse(checkedAt);
  const credentialRecords = credentials.map(item => ({
    type: 'device_credential',
    id: maskRecordId(item.id),
    status: item.approved === true ? 'approved' : 'pending',
    createdAt: item.created_at ?? null,
  }));
  const sessionRecords = sessions.map(item => {
    const expires = validDate(item.expires_at);
    return {
      type: 'device_session',
      id: maskRecordId(item.credential_id),
      status: expires !== null && expires > now ? 'active' : 'expired',
      expiresAt: item.expires_at ?? null,
    };
  });
  const records = [...credentialRecords, ...sessionRecords];

  return {
    schema: 'aleph.operations.v1',
    requestId,
    checkedAt,
    checkedCommit: commit ?? null,
    engine: {
      name: 'ALEPH SDP 엔진',
      source: 'provided',
    },
    studentWork: {
      components: ['decider', 'detect', 'access_app', 'vault'],
      source: 'student',
    },
    decider: {
      evidence: 'code',
      ruleCount: ruleIds.length,
      ruleIds: [...ruleIds],
    },
    detection: {
      evidence: 'not_run',
      actualApiEvents: null,
      message: '운영 탐지 사건 API 결과는 아직 실측 기록하지 않았습니다.',
    },
    revocation: {
      evidence: 'not_run',
      state: 'unknown',
      message: '실제 접속 회수 적용 결과는 아직 실측 기록하지 않았습니다.',
    },
    restore: {
      evidence: 'snapshot',
      version: restoreCommit,
      execution: 'not_run',
      message: '안전 복구 버전은 확인했지만 이 요약 API가 실제 복구를 실행하지는 않습니다.',
    },
    serverState: {
      evidence: 'actual_api',
      credentials: {
        total: credentialRecords.length,
        approved: credentialRecords.filter(item => item.status === 'approved').length,
        pending: credentialRecords.filter(item => item.status === 'pending').length,
      },
      sessions: {
        total: sessionRecords.length,
        active: sessionRecords.filter(item => item.status === 'active').length,
        expired: sessionRecords.filter(item => item.status === 'expired').length,
      },
      maskedRecords: records,
    },
  };
}
