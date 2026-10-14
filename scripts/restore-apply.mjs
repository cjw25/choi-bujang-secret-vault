import {
  SERVICES, applyService, confirmPhrase, describeHeader, describeService, diffService, verifySnapshot,
} from './restore-lib.mjs';

try {
  const args = process.argv.slice(2);
  const service = args.find((arg) => !arg.startsWith('--'));
  if (!service || !Object.hasOwn(SERVICES, service)) {
    throw new Error('사용법: npm run restore:apply -- <서비스> [--apply --confirm=확인문구]');
  }
  const verified = verifySnapshot();
  if (!verified.ok) throw new Error(`복원 중단: ${verified.reason}`);
  for (const line of describeHeader(verified)) process.stdout.write(`${line}\n`);
  const diff = diffService(service, verified.snapshot);
  process.stdout.write('실행 전 변경 범위:\n');
  for (const line of describeService(diff)) process.stdout.write(`${line}\n`);

  const expected = confirmPhrase(service, verified.info);
  const apply = args.includes('--apply');
  const confirmation = args.find((arg) => arg.startsWith('--confirm='))?.slice('--confirm='.length);
  if (!apply) {
    process.stdout.write(`미리보기만 했습니다. 실제 적용: --apply --confirm=${expected}\n`);
  } else if (confirmation !== expected) {
    throw new Error(`복원 중단: 확인 문구가 필요합니다 (--confirm=${expected}).`);
  } else {
    const changed = applyService(service, verified.snapshot);
    process.stdout.write(`시험 정책 복원 완료: ${service}\n`);
    process.stdout.write(`바뀐 파일: ${changed.join(', ') || '없음'}\n`);
    process.stdout.write('다른 서비스 정책과 xdr/alerts.log 감사 이력 보존을 확인했습니다.\n');
    process.stdout.write('커밋·푸시·배포는 하지 않았습니다. git diff로 확인하세요.\n');
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
