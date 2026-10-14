import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SNAPSHOT_PATH, root, snapshotForCommit } from './restore-lib.mjs';

try {
  const args = process.argv.slice(2);
  const commit = args.find((arg) => !arg.startsWith('--'));
  if (!commit) throw new Error('사용법: npm run restore:snapshot -- <커밋> [--replace]');
  const file = resolve(root, SNAPSHOT_PATH);
  if (existsSync(file) && !args.includes('--replace')) {
    throw new Error(`안전 정책 사본이 이미 있습니다. 교체하려면 --replace를 명시하세요 (${SNAPSHOT_PATH}).`);
  }
  const snapshot = snapshotForCommit(commit);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  process.stdout.write(`안전 정책 사본 생성: ${SNAPSHOT_PATH}\n커밋: ${snapshot.commit}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
