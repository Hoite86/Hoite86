import { providerPoliciesSnapshot, resolveDecisionForUrl, resolveProviderFromUrl } from '../src/services/providerRouting';
import { PrivacyState } from '../src/types';

const state: PrivacyState = {
  enabled: true,
  mode: 'FULL',
  providerRules: [
    {
      provider: 'Social',
      locationMasking: true,
      trackerBlocking: true,
      queryMutation: true,
      headerObfuscation: true,
      notifyOnBlock: true,
      locationRadiusMiles: 61
    },
    {
      provider: 'GenericWeb',
      locationMasking: true,
      trackerBlocking: true,
      queryMutation: false,
      headerObfuscation: true,
      notifyOnBlock: false,
      locationRadiusMiles: 25
    }
  ]
};

describe('provider routing', () => {
  it('routes known provider groups by URL host', () => {
    expect(resolveProviderFromUrl('https://www.facebook.com')).toEqual('Social');
    expect(resolveProviderFromUrl('https://maps.google.com')).toEqual('Search');
    expect(resolveProviderFromUrl('https://www.chase.com')).toEqual('Banking');
  });

  it('routes local destinations separately', () => {
    expect(resolveProviderFromUrl('http://localhost:8080')).toEqual('LocalNetwork');
    expect(resolveProviderFromUrl('http://192.168.1.22')).toEqual('LocalNetwork');
  });

  it('falls back to GenericWeb for model/service-agnostic handling', () => {
    expect(resolveProviderFromUrl('https://unknown-example-domain.dev')).toEqual('GenericWeb');
  });

  it('uses provider-specific policy when routed', () => {
    const decision = resolveDecisionForUrl(state, 'https://www.facebook.com/home');
    expect(decision.provider).toEqual('Social');
    expect(decision.locationRadiusMiles).toBe(61);
  });

  it('uses GenericWeb default policy when provider has no dedicated rule', () => {
    const decision = resolveDecisionForUrl(state, 'https://model-agnostic-host.example/path');
    expect(decision.provider).toEqual('GenericWeb');
    expect(decision.locationRadiusMiles).toBe(25);
    expect(decision.allowQueryMutation).toBe(false);
  });

  it('produces provider policy snapshot for tunnel payload', () => {
    const snapshot = providerPoliciesSnapshot(state) as Record<string, { trackerBlocking: boolean }>;
    expect(snapshot.Social.trackerBlocking).toBe(true);
    expect(snapshot.GenericWeb.trackerBlocking).toBe(true);
  });
});
