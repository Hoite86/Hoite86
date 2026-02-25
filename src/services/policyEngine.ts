import { PrivacyDecision, PrivacyMode, PrivacyState, ProviderRule } from '../types';

const MODE_DEFAULTS: Record<PrivacyMode, Omit<PrivacyDecision, 'provider'>> = {
  FULL: {
    allowLocationMasking: true,
    allowTrackerBlocking: true,
    allowQueryMutation: true,
    allowHeaderObfuscation: true,
    notifyOnBlock: true,
    locationRadiusMiles: 50
  },
  PARTIAL: {
    allowLocationMasking: true,
    allowTrackerBlocking: true,
    allowQueryMutation: false,
    allowHeaderObfuscation: true,
    notifyOnBlock: false,
    locationRadiusMiles: 20
  },
  TRUSTED: {
    allowLocationMasking: false,
    allowTrackerBlocking: true,
    allowQueryMutation: false,
    allowHeaderObfuscation: false,
    notifyOnBlock: false,
    locationRadiusMiles: 5
  }
};

const normalizeProvider = (provider: string): string => provider.trim().toLowerCase();

const matchRule = (provider: string, rules: ProviderRule[]): ProviderRule | undefined => {
  const normalized = normalizeProvider(provider);
  const direct = rules.find((rule) => normalizeProvider(rule.provider) === normalized);
  if (direct) return direct;

  return rules.find((rule) => {
    const candidate = normalizeProvider(rule.provider);
    return candidate === '*' || candidate === 'default' || candidate === 'genericweb';
  });
};

export const resolvePrivacyDecision = (
  state: PrivacyState,
  provider: string
): PrivacyDecision => {
  const defaults = MODE_DEFAULTS[state.mode];
  const rule = matchRule(provider, state.providerRules);

  if (!state.enabled) {
    return {
      provider,
      allowLocationMasking: false,
      allowTrackerBlocking: false,
      allowQueryMutation: false,
      allowHeaderObfuscation: false,
      notifyOnBlock: false,
      locationRadiusMiles: 0
    };
  }

  if (!rule) {
    return {
      provider,
      ...defaults
    };
  }

  return {
    provider,
    allowLocationMasking: rule.locationMasking,
    allowTrackerBlocking: rule.trackerBlocking,
    allowQueryMutation: rule.queryMutation,
    allowHeaderObfuscation: rule.headerObfuscation,
    notifyOnBlock: rule.notifyOnBlock,
    locationRadiusMiles: rule.locationRadiusMiles
  };
};
