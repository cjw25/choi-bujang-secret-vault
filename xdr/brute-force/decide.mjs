const PATTERNS = Object.freeze({
  rapid_source_login_failures: { minFailures: 20, minRuleLevel: 10, confidence: 0.96 },
  cross_account_password_spray: { minRuleLevel: 10, confidence: 0.97 },
  regular_multi_account_failures: { minAccounts: 15, confidence: 0.91 },
  iterative_password_guessing: { minFailures: 30, minRuleLevel: 10, confidence: 0.9 },
  sustained_failed_login_streak: { minFailures: 50, minRuleLevel: 11, confidence: 0.88 },
  review_login_failures: { minRuleLevel: 5, confidence: 0.65 },
});

function sanitizeDescription(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 2048)
    .replace(/-----BEGIN [\s\S]*?PRIVATE KEY-----[\s\S]*?-----END [\s\S]*?PRIVATE KEY-----/gi, '[REDACTED]')
    .replace(/\bBearer\s+[^\s;,]+/gi, '[REDACTED]')
    .replace(/\b(?:password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie)\s*[:=]\s*["']?[^\s;,\"']+/gi, '[REDACTED]')
    .replace(/\b(?:sk-|ghp_|github_pat_|sb_secret_|sb_publishable_)[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, '[REDACTED]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 512);
}

function isIpAddress(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length === 4) {
    return parts.every((part) => /^\d{1,3}$/.test(part)
      && Number(part) >= 0 && Number(part) <= 255);
  }
  return value.includes(':') && /^[0-9a-f:]+$/i.test(value);
}

function extractAlert(alert) {
  const address = alert?.data?.srcip;
  const account = alert?.data?.srcuser;
  const level = alert?.rule?.level;
  const at = alert?.timestamp;
  return {
    at: typeof at === 'string' && Number.isFinite(Date.parse(at)) ? at : null,
    sourceAddress: isIpAddress(address) ? address : null,
    account: typeof account === 'string'
      && /^[a-z][a-z0-9._-]{0,47}$/i.test(account)
      && !/^(?:password|token|secret|apikey)/i.test(account) ? account : null,
    ruleLevel: Number.isInteger(level) && level >= 0 && level <= 16 ? level : null,
    description: sanitizeDescription(alert?.rule?.description),
  };
}

function failureCount(alert) {
  const raw = alert?.data || {};
  const numeric = [
    raw.count, raw.failures, raw.failure_count, raw.failCount,
    raw.attempts, raw.login_failures, alert?.failedAttempts,
  ].filter((value) => (typeof value === 'string' || typeof value === 'number')
    && /^\d{1,5}$/.test(String(value))).map(Number);
  if (numeric.length) return Math.max(...numeric);

  const description = String(alert?.rule?.description ?? '');
  const expressions = [
    /(?:로그인|인증|비밀번호)?\s*실패(?:가|를|는|이)?\s*(\d{1,5})\s*(?:건|번|회)/giu,
    /(\d{1,5})\s*(?:건|번|회)\s*(?:로그인|인증)?\s*실패/giu,
    /(\d{1,5})\s*(?:failed|unsuccessful)\s*(?:login|sign[- ]?in|authentication|attempt)/giu,
  ];
  const values = expressions.flatMap((re) => [...description.matchAll(re)].map((m) => Number(m[1])));
  return values.length ? Math.max(...values) : 0;
}

function hasT1110(alert) {
  const mitre = alert?.rule?.mitre;
  const ids = Array.isArray(mitre)
    ? mitre
    : Array.isArray(mitre?.id)
      ? mitre.id
      : typeof mitre?.id === 'string'
        ? [mitre.id]
        : [];
  return ids.some((id) => typeof id === 'string' && /^T1110(?:\.\d{3})?$/.test(id));
}

function isFailureDescription(text) {
  return /실패|같은 비밀번호.*(?:넣었|시도)|비밀번호.*(?:바꿔|추측)|failed\s*(?:login|sign[- ]?in|authentication|password|attempts?)|(?:login|authentication)\s*fail|password\s*(?:guess|spray)/iu.test(text);
}

function containsSuccess(text) {
  const withoutNoSuccess = text.replace(
    /성공(?:은|이)?\s*없(?:습니다|었(?:습니다)?|다)?|성공\s*없음|no\s+success(?:ful(?:\s+logins?)?)?|zero\s+successful\s+logins?/giu,
    '',
  );
  return /(?:뒤에|후에|이후)\s*성공|성공했|성공했습니다|로그인이\s*성공|변경이\s*성공|(?:login|sign[\s-]?in)\s*success|successfully\s+logged/iu.test(withoutNoSuccess);
}

function matchStrongPattern(alert) {
  const row = extractAlert(alert);
  const text = row.description;
  const count = failureCount(alert);
  const tagged = hasT1110(alert);

  if (!row.at || !row.sourceAddress || !row.account || row.ruleLevel === null) return null;
  if (containsSuccess(text)) return null;

  if (tagged && row.ruleLevel >= PATTERNS.rapid_source_login_failures.minRuleLevel
    && count >= PATTERNS.rapid_source_login_failures.minFailures) {
    return { name: 'rapid_source_login_failures', confidence: PATTERNS.rapid_source_login_failures.confidence };
  }

  if (!isFailureDescription(text)) return null;

  const sameSource = /(?:같은|동일(?:한)?)\s*(?:주소|IP)|한\s*주소|same\s*(?:IP|source|address)|from\s+(?:one|the\s+same)\s*(?:IP|source|address)/iu.test(text);
  const spray = /같은\s*비밀번호|동일한?\s*비밀번호|same\s+password|identical\s+password|password\s*spray/iu.test(text)
    && /여러\s*계정|서로\s*다른\s*계정|계정\s*\d+\s*개|(?:multiple|different)\s+(?:accounts?|users?)/iu.test(text);
  const regular = /같은\s*간격|일정한\s*간격|regular\s+intervals?/iu.test(text)
    && /계정\s*\d+\s*개|(?:\d+)\s*(?:accounts?|users?)/iu.test(text);
  const accountMatch = /계정\s*(\d+)\s*개|(\d+)\s*(?:accounts?|users?)/iu.exec(text);
  const accountCount = accountMatch ? Number(accountMatch[1] ?? accountMatch[2]) : 0;
  const iterative = /비밀번호.{0,35}(?:한\s*글자씩|바꿔|변형|추측)|password.{0,35}(?:guess|variation|changed)/iu.test(text);
  const streak = /연속|이어졌|연달아|쌓였|consecutive|repeated|in\s+a\s+row/iu.test(text);
  const noSuccess = /성공(?:은|이)?\s*없|성공\s*없음|no\s+success|zero\s+successful/iu.test(text);

  if (spray && (tagged || row.ruleLevel >= PATTERNS.cross_account_password_spray.minRuleLevel)) {
    return { name: 'cross_account_password_spray', confidence: PATTERNS.cross_account_password_spray.confidence };
  }
  if (regular && accountCount >= PATTERNS.regular_multi_account_failures.minAccounts
    && sameSource && (tagged || row.ruleLevel >= 10)) {
    return { name: 'regular_multi_account_failures', confidence: PATTERNS.regular_multi_account_failures.confidence };
  }
  if (count >= PATTERNS.iterative_password_guessing.minFailures
    && iterative && (tagged || row.ruleLevel >= PATTERNS.iterative_password_guessing.minRuleLevel)) {
    return { name: 'iterative_password_guessing', confidence: PATTERNS.iterative_password_guessing.confidence };
  }
  if (count >= PATTERNS.sustained_failed_login_streak.minFailures
    && (streak || noSuccess)
    && (tagged || row.ruleLevel >= PATTERNS.sustained_failed_login_streak.minRuleLevel)) {
    return { name: 'sustained_failed_login_streak', confidence: PATTERNS.sustained_failed_login_streak.confidence };
  }
  return null;
}

function isSuspiciousFailure(alert) {
  const row = extractAlert(alert);
  return Boolean(row.at && row.sourceAddress && row.account
    && row.ruleLevel !== null
    && (hasT1110(alert) || row.ruleLevel >= PATTERNS.review_login_failures.minRuleLevel)
    && isFailureDescription(row.description));
}

export async function decide(alert) {
  const strong = matchStrongPattern(alert);
  if (strong) {
    return { action: 'block', confidence: strong.confidence, reason: strong.name };
  }

  if (isSuspiciousFailure(alert)) {
    return {
      action: 'alert',
      confidence: PATTERNS.review_login_failures.confidence,
      reason: 'review_login_failures',
    };
  }

  return { action: 'record', confidence: 0.1, reason: 'no_matching_t1110_pattern' };
}
