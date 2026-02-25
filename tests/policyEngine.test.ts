import { resolvePrivacyDecision } from '../src/services/policyEngine';
import { PrivacyState } from '../src/types';

const state: PrivacyState = {
  enabled: true,
  mode: 'PARTIAL',
  providerRules: [
    {
      provider: 'Search',
      locationMasking: true,
      trackerBlocking: true,
      queryMutation: true,
      headerObfuscation: true,
      notifyOnBlock: true,
      locationRadiusMiles: 42
    }
  ]
};

describe('policy engine', () => {
  it('uses provider overrides when available', () => {
    const decision = resolvePrivacyDecision(state, 'Search');
    expect(decision.allowQueryMutation).toBe(true);
    expect(decision.locationRadiusMiles).toBe(42);
  });



  it('uses GenericWeb fallback rule for uncataloged providers', () => {
    const fallbackState: PrivacyState = {
      ...state,
      providerRules: [
        ...state.providerRules,
        {
          provider: 'GenericWeb',
          locationMasking: true,
          trackerBlocking: true,
          queryMutation: true,
          headerObfuscation: true,
          notifyOnBlock: false,
          locationRadiusMiles: 30
        }
      ]
    };

    const decision = resolvePrivacyDecision(fallbackState, 'UnknownDestination');
    expect(decision.provider).toBe('UnknownDestination');
    expect(decision.allowQueryMutation).toBe(true);
    expect(decision.locationRadiusMiles).toBe(30);
  });

  it('falls back to mode defaults for unknown provider', () => {
    const decision = resolvePrivacyDecision(state, 'Unknown');
    expect(decision.allowQueryMutation).toBe(false);
    expect(decision.allowHeaderObfuscation).toBe(true);
  });
});
