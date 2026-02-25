import { PrivacyDecision, PrivacyState } from '../types';
import { resolvePrivacyDecision } from './policyEngine';

type ProviderMapping = {
  provider: string;
  hosts: string[];
};

const PROVIDER_MAPPINGS: ProviderMapping[] = [
  { provider: 'Google', hosts: ['google.com', 'gstatic.com', 'googleapis.com', 'youtube.com'] },
  { provider: 'Meta', hosts: ['facebook.com', 'fbcdn.net', 'instagram.com', 'whatsapp.com'] },
  { provider: 'TikTok', hosts: ['tiktok.com', 'byteoversea.com', 'tiktokcdn.com'] },
  { provider: 'Microsoft', hosts: ['microsoft.com', 'bing.com', 'live.com'] },
  { provider: 'Messaging', hosts: ['telegram.org', 'signal.org', 'discord.com'] }
];

const parseHost = (urlOrHost: string): string => {
  try {
    return new URL(urlOrHost).hostname.toLowerCase();
  } catch (_error) {
    return urlOrHost.toLowerCase();
  }
};

export const resolveProviderFromUrl = (urlOrHost: string): string => {
  const host = parseHost(urlOrHost);
  const match = PROVIDER_MAPPINGS.find((mapping) =>
    mapping.hosts.some((entry) => host === entry || host.endsWith(`.${entry}`))
  );
  return match?.provider ?? 'Unknown';
};

export const resolveDecisionForUrl = (state: PrivacyState, urlOrHost: string): PrivacyDecision => {
  const provider = resolveProviderFromUrl(urlOrHost);
  return resolvePrivacyDecision(state, provider);
};

export const providerPoliciesSnapshot = (state: PrivacyState): Record<string, unknown> => {
  return state.providerRules.reduce<Record<string, unknown>>((acc, rule) => {
    acc[rule.provider] = {
      trackerBlocking: rule.trackerBlocking,
      queryMutation: rule.queryMutation,
      locationMasking: rule.locationMasking,
      locationRadiusMiles: rule.locationRadiusMiles,
      notifyOnBlock: rule.notifyOnBlock,
      allowExceptions: rule.allowExceptions ?? []
    };
    return acc;
  }, {});
};

export const listKnownProviders = (): string[] => PROVIDER_MAPPINGS.map((entry) => entry.provider);
