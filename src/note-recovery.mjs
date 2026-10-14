import { createHash } from 'node:crypto';

export const CONTENT_HASH = /^[0-9a-f]{64}$/u;

export function noteContentHash(title, content) {
  if (typeof title !== 'string' || typeof content !== 'string') return null;
  return createHash('sha256').update(`${title}\n${content}`, 'utf8').digest('hex');
}

export function verifiedBackup(row, id, ownerId) {
  if (!row || typeof row !== 'object' || Array.isArray(row)
      || row.public_id !== id || row.owner_id !== ownerId
      || typeof row.title !== 'string' || typeof row.content !== 'string'
      || typeof row.content_hash !== 'string' || !CONTENT_HASH.test(row.content_hash)) {
    return null;
  }
  const calculated = noteContentHash(row.title, row.content);
  return calculated === row.content_hash ? Object.freeze({
    id: row.public_id,
    ownerId: row.owner_id,
    title: row.title,
    content: row.content,
    contentHash: row.content_hash,
  }) : null;
}

export function restoredRowMatches(row, backup) {
  return Boolean(row && backup
    && row.public_id === backup.id
    && row.owner_id === backup.ownerId
    && noteContentHash(row.title, row.content) === backup.contentHash);
}
