import { resolvePrivacyDecision } from '../src/services/policyEngine';
import { PrivacyState } from '../src/types';

const state: PrivacyState = {
  enabled: true,
  mode: 'PARTIAL',
  providerRules: [
    {
      provider: 'Google',
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
    const decision = resolvePrivacyDecision(state, 'Google');
    expect(decision.allowQueryMutation).toBe(true);
    expect(decision.locationRadiusMiles).toBe(42);
  });

  it('falls back to mode defaults for unknown provider', () => {
    const decision = resolvePrivacyDecision(state, 'Unknown');
    expect(decision.allowQueryMutation).toBe(false);
    expect(decision.allowHeaderObfuscation).toBe(true);
  });
});
