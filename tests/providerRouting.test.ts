import { providerPoliciesSnapshot, resolveDecisionForUrl, resolveProviderFromUrl } from '../src/services/providerRouting';
import { PrivacyState } from '../src/types';

const state: PrivacyState = {
  enabled: true,
  mode: 'FULL',
  providerRules: [
    {
      provider: 'Meta',
      locationMasking: true,
      trackerBlocking: true,
      queryMutation: true,
      headerObfuscation: true,
      notifyOnBlock: true,
      locationRadiusMiles: 61
    }
  ]
};

describe('provider routing', () => {
  it('routes known provider by URL host', () => {
    expect(resolveProviderFromUrl('https://www.facebook.com')).toEqual('Meta');
    expect(resolveProviderFromUrl('https://maps.google.com')).toEqual('Google');
  });

  it('uses provider-specific policy when routed', () => {
    const decision = resolveDecisionForUrl(state, 'https://www.facebook.com/home');
    expect(decision.provider).toEqual('Meta');
    expect(decision.locationRadiusMiles).toBe(61);
  });

  it('produces provider policy snapshot for tunnel payload', () => {
    const snapshot = providerPoliciesSnapshot(state) as Record<string, { trackerBlocking: boolean }>;
    expect(snapshot.Meta.trackerBlocking).toBe(true);
  });
});
