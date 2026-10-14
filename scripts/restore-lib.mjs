import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const SNAPSHOT_PATH = 'restore/safe-policy.json';
export const SCHEMA = 'aleph.policy.snapshot.v1';
export const AUDIT_LOG = 'xdr/alerts.log';

export const SERVICES = Object.freeze({
  notes: Object.freeze(['src/decider.mjs']),
  detect: Object.freeze(['src/detect.mjs']),
  'xdr-brute-force': Object.freeze([
    'xdr/brute-force/decide.mjs',
    'xdr/brute-force/deny-rules.json',
    'xdr/brute-force/patterns.json',
  ]),
  'xdr-web-injection': Object.freeze([
    'xdr/web-injection/decide.mjs',
    'xdr/web-injection/deny-rules.json',
    'xdr/web-injection/patterns.json',
  ]),
});

const gitText = (...args) => execFileSync('git', ['-C', root, ...args], {
  encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
}).trim();
const gitBuffer = (...args) => execFileSync('git', ['-C', root, ...args], {
  timeout: 15000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
});
const normalize = (value) => Buffer.isBuffer(value)
  ? value.toString('utf8').replace(/\r\n/gu, '\n')
  : String(value).replace(/\r\n/gu, '\n');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const gitBlobOid = (text) => {
  const body = Buffer.from(normalize(text), 'utf8');
  return createHash('sha1').update(Buffer.concat([
    Buffer.from(`blob ${body.length}\0`, 'utf8'), body,
  ])).digest('hex');
};

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseRuleIds(text) {
  const match = typeof text === 'string'
    && /export const RULE_IDS = Object\.freeze\(\[([^\]]*)\]\)/u.exec(text);
  return match ? [...match[1].matchAll(/'([^']+)'/gu)].map((item) => item[1]) : null;
}

function parseConfig(text) {
  try {
    const config = JSON.parse(text);
    if (!Array.isArray(config.allowedRoutes)
        || config.allowedRoutes.some((item) => typeof item !== 'string')) return null;
    return config;
  } catch {
    return null;
  }
}

function baselineRoutes(config) {
  if (!config) return null;
  const restore = typeof config.restoreRoute === 'string' ? config.restoreRoute : null;
  return config.allowedRoutes.filter((route) => route !== restore);
}

function policyFrom(readText) {
  const services = {};
  for (const [name, files] of Object.entries(SERVICES)) {
    const entry = { files: {} };
    for (const file of files) {
      const text = readText(file);
      entry.files[file] = text === null ? null : gitBlobOid(text);
    }
    if (name === 'notes') {
      const config = parseConfig(readText('aleph.config.json'));
      entry.ruleIds = parseRuleIds(readText('src/decider.mjs'));
      entry.allowedRoutes = baselineRoutes(config);
    }
    services[name] = entry;
  }
  return services;
}

export const policyAtCommit = (commit) => policyFrom((path) => {
  try { return normalize(gitBuffer('show', `${commit}:${path}`)); } catch { return null; }
});

export const policyNow = () => policyFrom((path) => {
  const file = resolve(root, path);
  return existsSync(file) ? normalize(readFileSync(file)) : null;
});

export const digestOf = (commit, services) => sha256(canonical({ commit, services }));

export function resolveCommit(argument) {
  if (typeof argument !== 'string' || !/^[0-9a-f]{7,40}$/u.test(argument)) {
    throw new Error('커밋 번호 형식이 맞지 않습니다.');
  }
  try { return gitText('rev-parse', '--verify', `${argument}^{commit}`); } catch {
    throw new Error('그런 커밋을 찾을 수 없습니다.');
  }
}

export function isAncestorOfHead(commit) {
  try {
    execFileSync('git', ['-C', root, 'merge-base', '--is-ancestor', commit, 'HEAD'], {
      timeout: 15000, windowsHide: true, stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function commitInfo(commit) {
  const [short, date, subject] = gitText('show', '-s', '--format=%h%n%ci%n%s', commit).split('\n');
  return { short, date: date.slice(0, 16), subject };
}

export function snapshotForCommit(argument) {
  const commit = resolveCommit(argument);
  if (!isAncestorOfHead(commit)) throw new Error('안전 사본 커밋은 현재 HEAD의 조상이어야 합니다.');
  const services = policyAtCommit(commit);
  for (const [name, service] of Object.entries(services)) {
    if (Object.values(service.files).some((value) => typeof value !== 'string'
        || !/^[0-9a-f]{40}$/u.test(value))) {
      throw new Error(`${name}: 안전 정책 파일을 커밋에서 읽지 못했습니다.`);
    }
  }
  if (!Array.isArray(services.notes.ruleIds) || !Array.isArray(services.notes.allowedRoutes)) {
    throw new Error('notes 정책의 규칙 이름 또는 허용 경로를 읽지 못했습니다.');
  }
  return {
    schema: SCHEMA,
    commit,
    services,
    sha256: digestOf(commit, services),
  };
}

export function verifySnapshot() {
  const file = resolve(root, SNAPSHOT_PATH);
  if (!existsSync(file)) return { ok: false, reason: `안전 정책 사본이 없습니다 (${SNAPSHOT_PATH})` };
  let snapshot;
  try { snapshot = JSON.parse(readFileSync(file, 'utf8')); } catch {
    return { ok: false, reason: '안전 정책 사본의 JSON 형식이 올바르지 않습니다.' };
  }
  const keys = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? Object.keys(snapshot).sort().join(',') : '';
  if (keys !== 'commit,schema,services,sha256' || snapshot.schema !== SCHEMA
      || !/^[0-9a-f]{40}$/u.test(snapshot.commit || '')
      || !/^[0-9a-f]{64}$/u.test(snapshot.sha256 || '')
      || !snapshot.services || typeof snapshot.services !== 'object'
      || Object.keys(snapshot.services).sort().join(',') !== Object.keys(SERVICES).sort().join(',')) {
    return { ok: false, reason: '안전 정책 사본 형식이 맞지 않습니다.' };
  }
  if (digestOf(snapshot.commit, snapshot.services) !== snapshot.sha256) {
    return { ok: false, reason: '안전 정책 사본의 SHA-256 검증에 실패했습니다.' };
  }
  try { gitText('cat-file', '-e', `${snapshot.commit}^{commit}`); } catch {
    return { ok: false, reason: '안전 정책 사본이 가리키는 커밋을 찾을 수 없습니다.' };
  }
  if (!isAncestorOfHead(snapshot.commit)) {
    return { ok: false, reason: '안전 정책 사본의 커밋이 현재 HEAD의 조상이 아닙니다.' };
  }
  if (canonical(policyAtCommit(snapshot.commit)) !== canonical(snapshot.services)) {
    return { ok: false, reason: '안전 커밋에서 다시 계산한 정책이 사본과 다릅니다.' };
  }
  return { ok: true, snapshot, info: commitInfo(snapshot.commit) };
}

const same = (a, b) => canonical(a) === canonical(b);
const listDiff = (current = [], safe = []) => ({
  remove: current.filter((item) => !safe.includes(item)),
  restore: safe.filter((item) => !current.includes(item)),
});

export function diffService(name, snapshot, now = policyNow()) {
  if (!Object.hasOwn(SERVICES, name)) throw new Error(`알 수 없는 서비스입니다: ${name}`);
  const safe = snapshot.services[name];
  const current = now[name];
  const files = Object.keys(safe.files).map((path) => ({
    path,
    current: current.files[path],
    safe: safe.files[path],
    state: current.files[path] === null ? 'missing'
      : current.files[path] === safe.files[path] ? 'same' : 'changed',
  }));
  const out = { name, files, rules: null, routes: null, changed: false };
  if (name === 'notes') {
    out.rules = listDiff(current.ruleIds, safe.ruleIds);
    out.routes = listDiff(current.allowedRoutes, safe.allowedRoutes);
  }
  out.changed = files.some((file) => file.state !== 'same')
    || Boolean(out.rules && (out.rules.remove.length || out.rules.restore.length))
    || Boolean(out.routes && (out.routes.remove.length || out.routes.restore.length));
  return out;
}

export function describeService(diff) {
  const lines = [`[${diff.name}] ${diff.changed ? '변경 있음' : '변경 없음'}`];
  for (const file of diff.files) {
    if (file.state === 'same') continue;
    lines.push(file.state === 'missing'
      ? `  파일 복원: ${file.path}`
      : `  파일 되돌림: ${file.path} (${file.current?.slice(0, 8)} -> ${file.safe.slice(0, 8)})`);
  }
  for (const rule of diff.rules?.remove ?? []) lines.push(`  규칙 제거: ${rule}`);
  for (const rule of diff.rules?.restore ?? []) lines.push(`  규칙 복원: ${rule}`);
  for (const route of diff.routes?.remove ?? []) lines.push(`  허용 경로 제거: ${route}`);
  for (const route of diff.routes?.restore ?? []) lines.push(`  허용 경로 복원: ${route}`);
  return lines;
}

export function describeHeader(verified) {
  const head = commitInfo('HEAD');
  return [
    `복원할 버전: ${verified.info.short} (${verified.info.date}) ${verified.info.subject}`,
    '사본 검증: 통과 (형식, SHA-256, 조상 커밋, Git 정책 객체 일치)',
    `현재 시험 정책: HEAD ${head.short} ${head.subject}`,
  ];
}

export const confirmPhrase = (service, info) => `restore-${service}-${info.short}`;

function auditDigest() {
  const file = resolve(root, AUDIT_LOG);
  return existsSync(file) ? sha256(readFileSync(file)) : null;
}

function writeNormalized(path, text) {
  const file = resolve(root, path);
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const value = existing.includes('\r\n') ? text.replace(/\n/gu, '\r\n') : text;
  writeFileSync(file, value, 'utf8');
}

export function applyService(name, snapshot) {
  if (!Object.hasOwn(SERVICES, name)) throw new Error(`알 수 없는 서비스입니다: ${name}`);
  const before = policyNow();
  const auditBefore = auditDigest();
  const writes = [];

  for (const path of SERVICES[name]) {
    const text = normalize(gitBuffer('show', `${snapshot.commit}:${path}`));
    if (gitBlobOid(text) !== snapshot.services[name].files[path]) {
      throw new Error(`${path}: 안전 사본과 Git 객체가 일치하지 않습니다.`);
    }
    writes.push({ path, text });
  }

  let configWrite = null;
  if (name === 'notes') {
    const file = resolve(root, 'aleph.config.json');
    const current = JSON.parse(readFileSync(file, 'utf8'));
    const restoreRoute = current.step >= 10 && typeof current.restoreRoute === 'string'
      ? current.restoreRoute : null;
    current.allowedRoutes = [...snapshot.services.notes.allowedRoutes];
    if (restoreRoute && !current.allowedRoutes.includes(restoreRoute)) current.allowedRoutes.push(restoreRoute);
    configWrite = `${JSON.stringify(current, null, 2)}\n`;
  }

  for (const item of writes) writeNormalized(item.path, item.text);
  if (configWrite !== null) writeFileSync(resolve(root, 'aleph.config.json'), configWrite, 'utf8');

  const after = policyNow();
  if (!same(after[name], snapshot.services[name])) {
    throw new Error('되돌린 뒤 대상 서비스가 안전 정책 사본과 일치하지 않습니다.');
  }
  for (const other of Object.keys(SERVICES).filter((service) => service !== name)) {
    if (!same(after[other], before[other])) throw new Error(`다른 서비스(${other})가 바뀌었습니다.`);
  }
  if (auditDigest() !== auditBefore) throw new Error('감사 이력이 바뀌었습니다.');

  return writes.map(({ path }) => path).concat(configWrite === null ? [] : ['aleph.config.json (allowedRoutes만)']);
}
