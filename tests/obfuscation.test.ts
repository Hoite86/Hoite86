import {
  mutateSearchQuery,
  obfuscateDeviceSignals,
  obfuscateMetricValue,
  randomizedHeaders,
  randomizedInteractionDelays
} from '../src/services/obfuscation';
import { PrivacyDecision } from '../src/types';

const fullDecision: PrivacyDecision = {
  provider: 'Search',
  allowLocationMasking: true,
  allowTrackerBlocking: true,
  allowQueryMutation: true,
  allowHeaderObfuscation: true,
  notifyOnBlock: true,
  locationRadiusMiles: 50
};

describe('obfuscation utilities', () => {
  it('generates enriched obfuscated headers when enabled', () => {
    const headers = randomizedHeaders(fullDecision, 'sess_1');
    expect(headers['User-Agent']).toBeTruthy();
    expect(headers['Accept-Language']).toBeTruthy();
    expect(headers['Sec-CH-UA']).toBeTruthy();
    expect(headers['X-Session-Id']).toEqual('sess_1');
    expect(headers['X-Pseudo-Device-Id']).toMatch(/^vpu_/);
    expect(headers.DNT).toBe('1');
  });

  it('returns minimal headers when obfuscation disabled', () => {
    const headers = randomizedHeaders(
      { ...fullDecision, allowHeaderObfuscation: false },
      'sess_2'
    );
    expect(headers).toEqual({ 'X-Session-Id': 'sess_2' });
  });

  it('mutates known query terms into alternatives', () => {
    const result = mutateSearchQuery('best restaurants near new york', fullDecision);
    expect(result).not.toEqual('best restaurants near new york');
  });

  it('creates pseudo device signals when enabled', () => {
    const signals = obfuscateDeviceSignals(fullDecision, 'sess_3');
    expect(signals.pseudoDeviceId).toMatch(/^vpu_/);
    expect(signals.pseudoAdId).toMatch(/^vpu_/);
    expect(signals.networkProfile).toBeTruthy();
  });

  it('obfuscates metrics for dynamic telemetry noise', () => {
    const jittered = obfuscateMetricValue('request_count', 10, fullDecision);
    expect(jittered).toBeGreaterThanOrEqual(9);
    expect(jittered).toBeLessThanOrEqual(11);
  });

  it('returns randomized interaction delays when query obfuscation is enabled', () => {
    const delays = randomizedInteractionDelays(fullDecision);
    expect(delays.scrollDelayMs).toBeGreaterThan(0);
    expect(delays.clickDelayMs).toBeGreaterThan(0);
    expect(delays.typingDelayMs).toBeGreaterThan(0);
  });
});
