const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function normalizeUuid(id) {
  if (typeof id !== 'string' || !UUID.test(id)) {
    throw new TypeError('자원 ID에는 올바른 UUID가 필요합니다.');
  }

  return id.toLowerCase();
}

export function noteResourceId(id) {
  return `note:${normalizeUuid(id)}`;
}

export function instructorNoticeResourceId(id) {
  return `instructor_notice:${normalizeUuid(id)}`;
}
