import { SERVICES, describeHeader, describeService, diffService, verifySnapshot } from './restore-lib.mjs';

try {
  const verified = verifySnapshot();
  if (!verified.ok) throw new Error(`복원 중단: ${verified.reason}`);
  const requested = process.argv[2];
  const names = requested ? [requested] : Object.keys(SERVICES);
  if (names.some((name) => !Object.hasOwn(SERVICES, name))) {
    throw new Error(`복원 중단: 알 수 없는 서비스입니다 (${requested}).`);
  }
  for (const line of describeHeader(verified)) process.stdout.write(`${line}\n`);
  process.stdout.write('실행 전 변경 범위:\n');
  for (const name of names) {
    for (const line of describeService(diffService(name, verified.snapshot))) {
      process.stdout.write(`${line}\n`);
    }
  }
  process.stdout.write('읽기 전용 미리보기입니다. 운영 정책과 파일은 바꾸지 않았습니다.\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
