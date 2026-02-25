import {
  determineAdaptivePerformanceProfile,
  obfuscationIntensityForProfile,
  recommendedBackgroundDelayRange
} from '../src/services/performance';

describe('performance adaptation', () => {
  it('returns high privacy profile for healthy runtime', () => {
    const profile = determineAdaptivePerformanceProfile({ wakeups: 100, crashes: 0, batteryLevel: 90 });
    expect(profile).toBe('HIGH_PRIVACY');
    expect(obfuscationIntensityForProfile(profile)).toBe('high');
  });

  it('returns low power profile on low battery or crashes', () => {
    const profile = determineAdaptivePerformanceProfile({ wakeups: 100, crashes: 1, batteryLevel: 50 });
    expect(profile).toBe('LOW_POWER');
    expect(obfuscationIntensityForProfile(profile)).toBe('low');
  });

  it('returns balanced profile for moderate constraints', () => {
    const profile = determineAdaptivePerformanceProfile({ wakeups: 3200, crashes: 0, batteryLevel: 40 });
    expect(profile).toBe('BALANCED');
    const range = recommendedBackgroundDelayRange(profile);
    expect(range.minMs).toBeGreaterThan(0);
    expect(range.maxMs).toBeGreaterThan(range.minMs);
  });
});
