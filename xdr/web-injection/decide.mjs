const PATTERNS = Object.freeze({
  sql_injection: Object.freeze({
    name: 'sql-injection',
    minCount: 5,
    minLevel: 10,
    evidence: 'MITRE ATT&CK T1190',
  }),
  script_injection: Object.freeze({
    name: 'script-injection',
    minCount: 5,
    minLevel: 10,
    evidence: 'MITRE ATT&CK T1190',
  }),
  path_traversal: Object.freeze({
    name: 'path-traversal',
    minCount: 5,
    minLevel: 10,
    evidence: 'MITRE ATT&CK T1190',
  }),
  command_injection: Object.freeze({
    name: 'command-injection',
    minCount: 5,
    minLevel: 10,
    evidence: 'MITRE ATT&CK T1190',
  }),
});

function result(confidence, reason) {
  return {
    action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence,
    reason,
  };
}

function safeText(value, limit = 2048) {
  return typeof value === 'string'
    ? value.replace(/[\r\n\t]+/g, ' ').slice(0, limit)
    : '';
}

function decodeBounded(value) {
  let text = safeText(value, 2048);
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(text);
      if (next === text) break;
      text = next;
    } catch {
      break;
    }
  }
  return text;
}

function hasT1190(alert) {
  const mitre = alert?.rule?.mitre;
  const ids = Array.isArray(mitre)
    ? mitre
    : Array.isArray(mitre?.id)
      ? mitre.id
      : typeof mitre?.id === 'string'
        ? [mitre.id]
        : [];
  return ids.some((id) => typeof id === 'string'
    && (id === 'T1190' || /^T1190\.\d{3}$/u.test(id)));
}

function correlationCount(alert) {
  const value = alert?.data?.count;
  if ((typeof value === 'number' || typeof value === 'string')
    && /^\d{1,5}$/u.test(String(value))) {
    return Number(value);
  }
  return 0;
}

function detectPattern(alert) {
  const description = safeText(alert?.rule?.description, 1024);
  const url = decodeBounded(alert?.data?.url);

  const sql = /SQL\s*(?:구문|표기|표식)|데이터베이스\s*조회.*(?:이어|연결)|sql\s*injection/iu.test(description)
    || /\bunion\s+(?:all\s+)?select\b/iu.test(url)
    || /\bselect\b.{1,120}\bfrom\b/iu.test(url)
    || /(?:'|")\s*or\s+(?:\d+|'[^']*'|"[^"]*")\s*=\s*(?:\d+|'[^']*'|"[^"]*")/iu.test(url)
    || /\b(?:and|or)\s+\d+\s*=\s*\d+\b/iu.test(url);

  const script = /스크립트\s*(?:삽입|표식)|script\s*injection|cross[-\s]?site\s*scripting|\bXSS\b/iu.test(description)
    || /<\s*script\b/iu.test(url)
    || /\bon(?:error|load|focus|mouseover)\s*=/iu.test(url)
    || /javascript\s*:/iu.test(url);

  const traversal = /경로.*(?:거슬러|이탈)|path\s*traversal/iu.test(description)
    || /(?:\.\.\/){2,}/u.test(url)
    || /(?:\.\.\\){2,}/u.test(url);

  const command = /명령\s*(?:구분자|삽입)|command\s*injection/iu.test(description)
    || /(?:;|\||&&|\|\|)\s*(?:cat|sh|bash|whoami|id|uname|cmd|powershell)\b/iu.test(url);

  if (sql) return PATTERNS.sql_injection;
  if (script) return PATTERNS.script_injection;
  if (traversal) return PATTERNS.path_traversal;
  if (command) return PATTERNS.command_injection;
  return null;
}

export async function decide(alert) {
  const level = Number.isInteger(alert?.rule?.level) ? alert.rule.level : 0;
  const tagged = hasT1190(alert);
  const count = correlationCount(alert);
  const pattern = detectPattern(alert);

  if (!tagged && level <= 3 && !pattern) {
    return result(0.05, 'normal-event');
  }

  if (tagged && pattern
    && level >= pattern.minLevel
    && count >= pattern.minCount) {
    return result(0.96, pattern.name);
  }

  if (tagged || pattern || level >= 5) {
    return result(0.65, pattern?.name ?? 'injection-review');
  }

  return result(0.1, 'normal-event');
}
