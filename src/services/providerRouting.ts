import { PrivacyDecision, PrivacyState } from '../types';
import { resolvePrivacyDecision } from './policyEngine';

type ProviderMapping = {
  provider: string;
  hosts: string[];
};

const PROVIDER_MAPPINGS: ProviderMapping[] = [
  { provider: 'Search', hosts: ['google.com', 'gstatic.com', 'googleapis.com', 'bing.com', 'duckduckgo.com'] },
  { provider: 'Social', hosts: ['facebook.com', 'fbcdn.net', 'instagram.com', 'x.com', 'twitter.com', 'tiktok.com'] },
  { provider: 'Messaging', hosts: ['whatsapp.com', 'signal.org', 'telegram.org', 'discord.com'] },
  { provider: 'Cloud', hosts: ['cloudflare.com', 'akamai.net', 'fastly.net', 'amazonaws.com'] },
  { provider: 'Analytics', hosts: ['doubleclick.net', 'googletagmanager.com', 'google-analytics.com', 'mixpanel.com'] },
  { provider: 'Banking', hosts: ['chase.com', 'bankofamerica.com', 'wellsfargo.com', 'capitalone.com'] },
  { provider: 'Healthcare', hosts: ['mychart.org', 'cvs.com', 'walgreens.com'] },
  { provider: 'Government', hosts: ['irs.gov', 'ssa.gov', 'usa.gov'] },
  { provider: 'Navigation', hosts: ['maps.google.com', 'waze.com', 'here.com'] }
];

const parseHost = (urlOrHost: string): string => {
  try {
    return new URL(urlOrHost).hostname.toLowerCase();
  } catch (_error) {
    return urlOrHost.toLowerCase();
  }
};

const isLocalHost = (host: string): boolean => {
  return host === 'localhost' || host.endsWith('.local') || /^\d+\.\d+\.\d+\.\d+$/.test(host);
};

export const resolveProviderFromUrl = (urlOrHost: string): string => {
  const host = parseHost(urlOrHost);

  if (isLocalHost(host)) {
    return 'LocalNetwork';
  }

  const match = PROVIDER_MAPPINGS.find((mapping) =>
    mapping.hosts.some((entry) => host === entry || host.endsWith(`.${entry}`))
  );

  return match?.provider ?? 'GenericWeb';
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
