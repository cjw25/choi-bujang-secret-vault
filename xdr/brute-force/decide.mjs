import { extractAlert } from './read-alerts.mjs';
import { failureCount, isSuspiciousFailure, matchStrongPattern, weakPattern } from './match.mjs';
export { writeIntegrationArtifacts } from './ztna-gate.mjs';

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

async function askJevLive(alert) {
  const key = process.env.JEV_API_KEY;
  if (!key) return null;
  const row = extractAlert(alert);
  const state = JSON.stringify({
    ruleLevel: row.ruleLevel,
    description: row.description,
    failedAttempts: failureCount(alert),
    mitreTechnique: 'T1110',
  });
  try {
    const response = await fetch(JEV_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state,
        questions: {
          brute_force_likelihood: {
            type: 'noul',
            instructions: 'Does this weak failed-login signal plausibly indicate a brute-force attack rather than ordinary user mistakes? Do not infer data not in the state.',
          },
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const probability = payload?.answers?.brute_force_likelihood?.noul;
    return typeof probability === 'number' && Number.isFinite(probability)
      && probability >= 0 && probability <= 1 ? probability : null;
  } catch {
    return null;
  }
}

export function createDecider({ askJev = askJevLive } = {}) {
  return async function decideOne(alert) {
    const strong = matchStrongPattern(alert);
    if (strong) {
      return { action: 'block', confidence: strong.confidence, reason: strong.name };
    }
    if (!isSuspiciousFailure(alert)) {
      return { action: 'record', confidence: 0.1, reason: 'no_matching_t1110_pattern' };
    }

    let probability = null;
    try {
      probability = await askJev(alert);
    } catch {
      // Jev 미응답·오류는 자동 차단으로 올리지 않고 alert 로 유지합니다.
    }
    const fallback = weakPattern();
    const confidence = typeof probability === 'number' && Number.isFinite(probability)
      && probability >= 0 && probability <= 1
      ? Math.max(0.5, Math.min(0.84, probability))
      : fallback.confidence;
    return { action: 'alert', confidence, reason: fallback.name };
  };
}

export const decide = createDecider();
