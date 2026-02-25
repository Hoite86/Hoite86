import { resolveCompatibilityDecision } from '../src/services/compatibility';
import { PrivacyDecision } from '../src/types';

const baseDecision: PrivacyDecision = {
  provider: 'Search',
  allowLocationMasking: true,
  allowTrackerBlocking: true,
  allowQueryMutation: true,
  allowHeaderObfuscation: true,
  notifyOnBlock: false,
  locationRadiusMiles: 50
};

describe('compatibility guards', () => {
  it('preserves decision for non-regulated providers', () => {
    const result = resolveCompatibilityDecision(baseDecision);
    expect(result.strictModeApplied).toBe(false);
    expect(result.effectiveDecision.allowLocationMasking).toBe(true);
  });

  it('relaxes risky obfuscation for regulated providers', () => {
    const result = resolveCompatibilityDecision({ ...baseDecision, provider: 'Banking' });
    expect(result.strictModeApplied).toBe(true);
    expect(result.effectiveDecision.allowLocationMasking).toBe(false);
    expect(result.effectiveDecision.allowHeaderObfuscation).toBe(false);
    expect(result.notices.length).toBeGreaterThan(0);
  });
});
