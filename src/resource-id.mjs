const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const RESOURCE_KINDS = Object.freeze({
  note: 'note',
  instructorNotice: 'instructor_notice',
});

function checkedUuid(value) {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new TypeError('invalid_resource_uuid');
  }
  return value.toLowerCase();
}

export function noteResourceId(id) {
  return `${RESOURCE_KINDS.note}:${checkedUuid(id)}`;
}

export function instructorNoticeResourceId(id) {
  return `${RESOURCE_KINDS.instructorNotice}:${checkedUuid(id)}`;
}

export function parseResourceId(value) {
  if (typeof value !== 'string') return null;
  const separator = value.indexOf(':');
  if (separator <= 0) return null;

  const kind = value.slice(0, separator);
  const rawId = value.slice(separator + 1);
  if (!UUID.test(rawId)) return null;
  if (![RESOURCE_KINDS.note, RESOURCE_KINDS.instructorNotice].includes(kind)) return null;

  return Object.freeze({ kind, id: rawId.toLowerCase() });
}
