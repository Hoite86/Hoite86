import { PrivacyDecision } from '../types';

const USER_AGENT_PROFILES = [
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
    language: 'en-US,en;q=0.9',
    platform: 'android-mobile',
    secChUa: '"Chromium";v="124", "Android WebView";v="124"',
    secChUaPlatform: '"Android"'
  },
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/123.0.0.0 Mobile Safari/537.36',
    language: 'en-GB,en;q=0.8',
    platform: 'android-galaxy',
    secChUa: '"Chromium";v="123", "Mobile Safari";v="537"',
    secChUaPlatform: '"Android"'
  },
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; OnePlus CPH2583) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
    language: 'en-US,en;q=0.8',
    platform: 'android-oneplus',
    secChUa: '"Chromium";v="124", "Mobile";v="124"',
    secChUaPlatform: '"Android"'
  }
];

const QUERY_SYNONYMS: Record<string, string[]> = {
  best: ['top', 'recommended', 'popular'],
  restaurants: ['dining spots', 'food places', 'places to eat'],
  near: ['around', 'close to'],
  cheap: ['budget', 'affordable'],
  new: ['updated', 'recent'],
  york: ['nyc', 'new york city']
};

const INTENT_PADDING = ['review', 'guide', 'tips', 'comparison', 'alternatives'];
const NETWORK_PROFILES = ['wifi', '5g', 'lte', 'unknown'];
const TZ_PROFILES = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];
const SCREEN_BUCKETS = ['small', 'medium', 'large'];

const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const pseudoStableId = (seed: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `vpu_${Math.abs(hash >>> 0).toString(16)}`;
};

export type ObfuscatedDeviceSignals = {
  pseudoDeviceId: string;
  pseudoAdId: string;
  timezone: string;
  screenBucket: string;
  networkProfile: string;
  sdkBucket: string;
};

export const obfuscateDeviceSignals = (
  decision: PrivacyDecision,
  sessionId: string
): ObfuscatedDeviceSignals => {
  if (!decision.allowHeaderObfuscation) {
    return {
      pseudoDeviceId: sessionId,
      pseudoAdId: sessionId,
      timezone: 'UTC',
      screenBucket: 'medium',
      networkProfile: 'unknown',
      sdkBucket: 'android-generic'
    };
  }

  return {
    pseudoDeviceId: pseudoStableId(`${sessionId}:${decision.provider}:device`),
    pseudoAdId: pseudoStableId(`${sessionId}:${decision.provider}:ad`),
    timezone: randomItem(TZ_PROFILES),
    screenBucket: randomItem(SCREEN_BUCKETS),
    networkProfile: randomItem(NETWORK_PROFILES),
    sdkBucket: randomItem(['android-33', 'android-34', 'android-35'])
  };
};

export const randomizedHeaders = (
  decision: PrivacyDecision,
  sessionId: string
): Record<string, string> => {
  if (!decision.allowHeaderObfuscation) {
    return { 'X-Session-Id': sessionId };
  }

  const profile = randomItem(USER_AGENT_PROFILES);
  const deviceSignals = obfuscateDeviceSignals(decision, sessionId);

  return {
    'User-Agent': profile.userAgent,
    'Accept-Language': profile.language,
    'Sec-CH-UA': profile.secChUa,
    'Sec-CH-UA-Platform': profile.secChUaPlatform,
    'X-Request-Intent': randomItem(['lookup', 'explore', 'browse', 'research']),
    'X-Client-Profile': profile.platform,
    'X-Session-Id': sessionId,
    'X-Pseudo-Device-Id': deviceSignals.pseudoDeviceId,
    'X-Pseudo-Ad-Id': deviceSignals.pseudoAdId,
    'X-Network-Profile': deviceSignals.networkProfile,
    'X-Screen-Bucket': deviceSignals.screenBucket,
    'X-Timezone-Bucket': deviceSignals.timezone,
    'X-SDK-Bucket': deviceSignals.sdkBucket,
    DNT: '1'
  };
};

export const mutateSearchQuery = (query: string, decision: PrivacyDecision): string => {
  if (!decision.allowQueryMutation) {
    return query;
  }

  const base = query
    .split(' ')
    .map((term) => {
      const synonyms = QUERY_SYNONYMS[term.toLowerCase()];
      return synonyms ? randomItem(synonyms) : term;
    })
    .join(' ');

  if (Math.random() > 0.55) {
    return `${base} ${randomItem(INTENT_PADDING)}`;
  }

  return base;
};

export const obfuscateMetricValue = (
  metricName: string,
  value: number,
  decision: PrivacyDecision
): number => {
  if (!decision.allowHeaderObfuscation) {
    return value;
  }

  const profile = metricName.toLowerCase();
  if (profile.includes('latency') || profile.includes('duration')) {
    return Math.max(0, Math.round(value * (0.9 + Math.random() * 0.25)));
  }

  if (profile.includes('count') || profile.includes('events')) {
    return Math.max(0, Math.round(value + (Math.random() > 0.5 ? 1 : -1)));
  }

  return Number((value * (0.95 + Math.random() * 0.1)).toFixed(2));
};

export type ObfuscationIntensity = 'high' | 'medium' | 'low';

export const randomizedInteractionDelays = (
  decision: PrivacyDecision,
  intensity: ObfuscationIntensity = 'high'
): { scrollDelayMs: number; clickDelayMs: number; typingDelayMs: number } => {
  if (!decision.allowQueryMutation) {
    return { scrollDelayMs: 0, clickDelayMs: 0, typingDelayMs: 0 };
  }

  if (intensity === 'low') {
    return {
      scrollDelayMs: Math.floor(40 + Math.random() * 120),
      clickDelayMs: Math.floor(20 + Math.random() * 80),
      typingDelayMs: Math.floor(15 + Math.random() * 60)
    };
  }

  if (intensity === 'medium') {
    return {
      scrollDelayMs: Math.floor(50 + Math.random() * 180),
      clickDelayMs: Math.floor(30 + Math.random() * 120),
      typingDelayMs: Math.floor(25 + Math.random() * 90)
    };
  }

  return {
    scrollDelayMs: Math.floor(60 + Math.random() * 260),
    clickDelayMs: Math.floor(40 + Math.random() * 180),
    typingDelayMs: Math.floor(35 + Math.random() * 140)
  };
};
