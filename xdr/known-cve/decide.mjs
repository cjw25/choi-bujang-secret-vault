const PATTERNS = Object.freeze([
  {
    "name": "jndi_header_lookup",
    "condition": {
      "signal": "요청 머리글 또는 User-Agent에 완전한 ${jndi:<protocol>://...} 원격 조회 구문이 있음"
    },
    "evidence": "CVE-2021-44228 형태의 외부 공개 애플리케이션 악용 신호이며 MITRE ATT&CK T1190 근거입니다.",
    "confidence": 0.98
  },
  {
    "name": "jndi_argument_lookup",
    "condition": {
      "signal": "URL·쿼리·요청 인자에 완전한 ${jndi:<protocol>://...} 원격 조회 구문이 있음"
    },
    "evidence": "CVE-2021-44228 형태의 요청 인자 악용 신호이며 MITRE ATT&CK T1190 근거입니다.",
    "confidence": 0.98
  },
  {
    "name": "known_cve_probe",
    "condition": {
      "signal": "CVE-2021-44228 이름·취약점 점검·probe 흔적이 있으나 완전한 원격 조회 구문은 확인되지 않음"
    },
    "evidence": "알려진 취약점 점검 흔적은 MITRE ATT&CK T1190 관점에서 검토가 필요한 보조 신호입니다.",
    "confidence": 0.65
  },
  {
    "name": "jndi_reference",
    "condition": {
      "signal": "jndi·lookup·관련 라이브러리 또는 잘린 조회 형태가 있으나 완전한 원격 조회 구문은 확인되지 않음"
    },
    "evidence": "불완전한 원격 조회 관련 흔적은 MITRE ATT&CK T1190 관점에서 단독 차단보다 검토가 필요한 보조 신호입니다.",
    "confidence": 0.6
  }
]);

const JNDI_LOOKUP = /\$\{jndi:(?:ldap|ldaps|rmi|dns|iiop|nis|nds|corba):\/\/[^}\s]+\}/iu;

function text(value) {
  return typeof value === 'string' ? value : '';
}

function decoded(value) {
  let out = text(value);
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

function hasT1190(alert) {
  return Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.includes('T1190');
}

function pattern(name) {
  return PATTERNS.find((item) => item.name === name);
}

function result(action, confidence, reason) {
  return { action, confidence, reason };
}

export function decide(alert) {
  if (!alert || typeof alert !== 'object' || Array.isArray(alert)) {
    return result('record', 0.1, 'no_known_cve_pattern');
  }

  if (!hasT1190(alert)) {
    return result('record', 0.1, 'no_known_cve_pattern');
  }

  const data = alert.data && typeof alert.data === 'object' && !Array.isArray(alert.data)
    ? alert.data : {};
  const headerText = [data.useragent, data.userAgent, data.header, data.headers]
    .map(decoded).join(' ');
  const argumentText = [data.url, data.query, data.args, data.argument, data.request]
    .map(decoded).join(' ');
  const headerLookup = JNDI_LOOKUP.test(headerText);
  const argumentLookup = JNDI_LOOKUP.test(argumentText);
  const sourceAddress = text(data.srcip).trim();

  if ((headerLookup || argumentLookup) && sourceAddress) {
    const matched = pattern(headerLookup ? 'jndi_header_lookup' : 'jndi_argument_lookup');
    return result('block', matched.confidence, matched.name);
  }

  const description = text(alert?.rule?.description).toLowerCase();
  const combined = `${headerText} ${argumentText} ${description}`.toLowerCase();

  if (headerLookup || argumentLookup) {
    const matched = pattern(headerLookup ? 'jndi_header_lookup' : 'jndi_argument_lookup');
    return result('alert', 0.8, matched.name);
  }

  if (/cve-2021-44228|취약점|probe|점검/u.test(combined)) {
    const matched = pattern('known_cve_probe');
    return result('alert', matched.confidence, matched.name);
  }

  const matched = pattern('jndi_reference');
  return result('alert', matched.confidence, matched.name);
}
