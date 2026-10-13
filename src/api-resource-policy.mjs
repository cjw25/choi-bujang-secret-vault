const AUTHORITY_FIELDS = Object.freeze([
  'role', 'owner_id', 'ownerId', 'resourceId', 'instructor', 'isInstructor',
]);

export function hasForbiddenAuthorityFields(body) {
  return Boolean(body && typeof body === 'object' && !Array.isArray(body)
    && AUTHORITY_FIELDS.some((key) => Object.hasOwn(body, key)));
}

function denied(reasonCode) {
  return Object.freeze({ allowed: false, reasonCode });
}

function approved() {
  return Object.freeze({ allowed: true, reasonCode: 'approved' });
}

export async function verifyOwnedNote(db, userId, id) {
  if (!db?.from || typeof userId !== 'string' || !userId || typeof id !== 'string' || !id) {
    return denied('resource_denied');
  }

  try {
    const { data, error } = await db
      .from('notes')
      .select('public_id, owner_id')
      .eq('public_id', id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) return denied('policy_unavailable');
    if (!data || data.public_id !== id || data.owner_id !== userId) {
      return denied('resource_denied');
    }
    return approved();
  } catch {
    return denied('policy_unavailable');
  }
}

export async function verifyInstructor(db, userId) {
  if (!db?.from || typeof userId !== 'string' || !userId) {
    return denied('instructor_required');
  }

  try {
    const { data, error } = await db
      .from('instructor_memberships')
      .select('user_id, enabled')
      .eq('user_id', userId)
      .eq('enabled', true)
      .maybeSingle();

    if (error) return denied('policy_unavailable');
    if (!data || data.user_id !== userId || data.enabled !== true) {
      return denied('instructor_required');
    }
    return approved();
  } catch {
    return denied('policy_unavailable');
  }
}
