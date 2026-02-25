import { shouldBlockDomain } from '../src/services/dnsPolicy';
import { setTrackerIntel } from '../src/services/trackerIntel';
import { PrivacyDecision } from '../src/types';

const decision: PrivacyDecision = {
  provider: 'Google',
  allowLocationMasking: true,
  allowTrackerBlocking: true,
  allowQueryMutation: true,
  allowHeaderObfuscation: true,
  notifyOnBlock: true,
  locationRadiusMiles: 50
};

describe('dns policy', () => {
  beforeEach(() => {
    setTrackerIntel({ blockingMode: 'HARD_BLOCK', globalAllowExceptions: ['signal.org'] });
  });

  it('blocks known and heuristic tracking domains', () => {
    expect(shouldBlockDomain('https://ads.twitter.com/i/adsct', decision)).toBe(true);
    expect(shouldBlockDomain('https://unknownsite.example/telemetry/collect', decision)).toBe(true);
    expect(shouldBlockDomain('https://legit.example/path?a=fingerprint_hash', decision)).toBe(true);
  });

  it('respects policy and allow exceptions', () => {
    expect(shouldBlockDomain('https://signal.org', decision)).toBe(false);
    expect(
      shouldBlockDomain('https://doubleclick.net', { ...decision, allowTrackerBlocking: false })
    ).toBe(false);
  });
});
