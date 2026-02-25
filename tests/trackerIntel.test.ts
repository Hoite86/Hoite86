import {
  addProviderAllowException,
  applyCohortCalibration,
  detectTrackingAttempt,
  detectTrackingScript,
  removeProviderAllowException,
  setTrackerIntel
} from '../src/services/trackerIntel';

describe('tracker intel', () => {
  beforeEach(() => {
    setTrackerIntel({
      blockingMode: 'HARD_BLOCK',
      confidenceThresholdSoft: 0.45,
      confidenceThresholdQuarantine: 0.6,
      confidenceThresholdHard: 0.75,
      globalAllowExceptions: ['signal.org'],
      providerAllowExceptions: {}
    });
    applyCohortCalibration('beta');
  });

  it('detects service-agnostic tracking attempts with confidence and actions', () => {
    const decision = detectTrackingAttempt('https://vendor.example/collect?device_id=abc');
    expect(decision.confidence).toBeGreaterThan(0.7);
    expect(['SOFT_BLOCK', 'QUARANTINE', 'HARD_BLOCK']).toContain(decision.action);
  });

  it('respects global allow exceptions', () => {
    const decision = detectTrackingAttempt('https://signal.org');
    expect(decision.action).toBe('ALLOW');
  });

  it('supports provider-specific allow exceptions', () => {
    addProviderAllowException('Google', 'analytics.google.com');
    expect(detectTrackingAttempt('https://analytics.google.com/collect', 'Google').action).toBe('ALLOW');

    removeProviderAllowException('Google', 'analytics.google.com');
    expect(detectTrackingAttempt('https://analytics.google.com/collect', 'Google').action).not.toBe('ALLOW');
  });

  it('uses quarantine stage between soft and hard thresholds', () => {
    setTrackerIntel({
      blockingMode: 'HARD_BLOCK',
      confidenceThresholdSoft: 0.4,
      confidenceThresholdQuarantine: 0.6,
      confidenceThresholdHard: 0.95,
      queryParamKeywords: ['clickid']
    });

    const decision = detectTrackingAttempt('https://example.com/path?clickid=abc');
    expect(decision.confidence).toBe(0.85);
    expect(decision.action).toBe('QUARANTINE');
    expect(decision.blocked).toBe(false);
  });

  it('detects tracking script signatures', () => {
    expect(detectTrackingScript('window.gtag("config", "X")').action).not.toBe('ALLOW');
    expect(detectTrackingScript('console.log("hello")').action).toBe('ALLOW');
  });
});
