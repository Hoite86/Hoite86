import { shouldBlockRequest } from '../src/services/trackerBlocker';
import { setTrackerIntel } from '../src/services/trackerIntel';

describe('tracker blocker', () => {
  beforeEach(() => {
    setTrackerIntel({ blockingMode: 'HARD_BLOCK' });
  });

  it('blocks known tracking endpoints and service-agnostic telemetry paths', () => {
    expect(shouldBlockRequest('https://www.google-analytics.com/g/collect')).toBe(true);
    expect(shouldBlockRequest('https://connect.facebook.net/en_US/fbevents.js')).toBe(true);
    expect(shouldBlockRequest('https://api.random-vendor.io/v1/telemetry/events')).toBe(true);
  });

  it('allows non-tracking urls', () => {
    expect(shouldBlockRequest('https://news.ycombinator.com')).toBe(false);
  });
});
