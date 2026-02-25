import { maskLocation, resolveLocationForSharing } from '../src/services/location';
import { PrivacyDecision } from '../src/types';

const fullDecision: PrivacyDecision = {
  provider: 'Google',
  allowLocationMasking: true,
  allowTrackerBlocking: true,
  allowQueryMutation: true,
  allowHeaderObfuscation: true,
  notifyOnBlock: true,
  locationRadiusMiles: 50
};

describe('maskLocation', () => {
  it('returns coordinates different from the source with stable precision', () => {
    const source = { latitude: 37.7749, longitude: -122.4194 };
    const masked = maskLocation(source, 50);

    expect(masked.latitude).not.toBeNaN();
    expect(masked.longitude).not.toBeNaN();
    expect(masked).not.toEqual(source);
    expect(masked.latitude.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(6);
  });

  it('respects policy when masking disabled', () => {
    const source = { latitude: 47.6062, longitude: -122.3321 };
    const resolved = resolveLocationForSharing(source, {
      ...fullDecision,
      allowLocationMasking: false
    });
    expect(resolved).toEqual(source);
  });
});
