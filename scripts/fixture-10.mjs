import { isDeepStrictEqual } from 'node:util';
import { noteContentHash, restoredRowMatches, verifiedBackup } from '../src/note-recovery.mjs';

const noteId = '11111111-1111-4111-8111-111111111111';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const title = 'B의 가상 복구 메모';
const content = '가상 복구 확인용 내용';
const contentHash = noteContentHash(title, content);
const row = { public_id: noteId, owner_id: ownerB, title, content, content_hash: contentHash };
const backup = verifiedBackup(row, noteId, ownerB);

const cases = [
  ['B 소유 사본 ID·소유자·내용 해시 검증', Boolean(backup)],
  ['A 소유자로 B 사본을 사용할 수 없음', verifiedBackup(row, noteId, ownerA) === null],
  ['내용 해시가 바뀐 사본은 거부', verifiedBackup({ ...row, content_hash: '0'.repeat(64) }, noteId, ownerB) === null],
  ['복구 결과 ID·소유자·내용 해시 일치', restoredRowMatches({ public_id: noteId, owner_id: ownerB, title, content }, backup)],
  ['응답용 값은 ID와 해시로 재현 가능', isDeepStrictEqual(
    { id: noteId, contentHash },
    { id: backup?.id, contentHash: backup?.contentHash },
  )],
];

for (const [name, passed] of cases) process.stdout.write(`${passed ? '통과' : '확인 필요'} · ${name}\n`);
if (cases.some(([, passed]) => !passed)) process.exitCode = 1;
process.stdout.write('가상 B 메모 연습이며 실제 Supabase 복구나 심판 통과 증거가 아닙니다.\n');
