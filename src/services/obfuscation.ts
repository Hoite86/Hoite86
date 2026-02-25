import { PrivacyDecision } from '../types';

const USER_AGENT_PROFILES = [
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
    language: 'en-US,en;q=0.9',
    platform: 'android-mobile'
  },
  {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    language: 'en-US,en;q=0.8',
    platform: 'ios-mobile'
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    language: 'en-GB,en;q=0.8',
    platform: 'desktop-fallback'
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

const INTENT_PADDING = ['review', 'guide', 'tips', 'comparison'];

const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const randomizedHeaders = (
  decision: PrivacyDecision,
  sessionId: string
): Record<string, string> => {
  if (!decision.allowHeaderObfuscation) {
    return { 'X-Session-Id': sessionId };
  }

  const profile = randomItem(USER_AGENT_PROFILES);
  return {
    'User-Agent': profile.userAgent,
    'Accept-Language': profile.language,
    'X-Request-Intent': randomItem(['lookup', 'explore', 'browse', 'research']),
    'X-Client-Profile': profile.platform,
    'X-Session-Id': sessionId
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

  if (Math.random() > 0.6) {
    return `${base} ${randomItem(INTENT_PADDING)}`;
  }

  return base;
};
