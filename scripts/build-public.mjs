import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentIdentity } from './deployment-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'data.json');
const output = resolve(root, 'public', 'data.json');
const config = JSON.parse(await readFile(resolve(root, 'aleph.config.json'), 'utf8'));

if (![2, 3, 4].includes(config.step)) {
  throw new Error('현재 빌드 흐름은 2~4단계 자료 분리·로그인·소유자 보호에 맞춰져 있습니다.');
}

const data = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(data.notes) || data.notes.length !== 0) {
  throw new Error('2~4단계에서는 공개 data.json에 메모를 남기지 마세요.');
}

await mkdir(resolve(root, 'public'), { recursive: true });
await copyFile(source, output);
console.log('메모가 비어 있는 공개 data.json을 public/data.json에 복사했습니다.');

if (!process.argv.includes('--local')) {
  const identity = deploymentIdentity(process.env, config);
  await writeFile(
    resolve(root, 'public', 'aleph.json'),
    `${JSON.stringify(identity, null, 2)}\n`,
    'utf8',
  );
  console.log('배포 저장소·커밋·주소를 public/aleph.json에 기록했습니다.');
}
