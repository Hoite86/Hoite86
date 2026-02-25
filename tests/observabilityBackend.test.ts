import {
  configureObservabilityBackend,
  evaluateReleaseGate,
  getReleaseGateStatus,
  observabilityQueueDepth,
  pushObservabilityBatch,
  resetObservabilityBackendForTests
} from '../src/services/observabilityBackend';
import { MetricEvent } from '../src/services/observability';

const event = (idx: number): MetricEvent => ({
  name: `metric_${idx}`,
  value: idx,
  timestamp: Date.now(),
  tags: { idx: String(idx) }
});

describe('observability backend', () => {
  beforeEach(() => {
    resetObservabilityBackendForTests();
    configureObservabilityBackend('https://example.invalid/ingest');
    jest.restoreAllMocks();
    (globalThis as unknown as { fetch?: unknown }).fetch = jest.fn(async () => ({ ok: true }));
  });

  it('flushes queue on successful push', async () => {
    const ok = await pushObservabilityBatch([event(1), event(2)]);
    expect(ok).toBe(true);
    expect(observabilityQueueDepth()).toBe(0);
  });

  it('retains queue and backs off on failed push', async () => {
    (globalThis as unknown as { fetch?: unknown }).fetch = jest.fn(async () => ({ ok: false }));

    const first = await pushObservabilityBatch([event(1)]);
    expect(first).toBe(false);
    expect(observabilityQueueDepth()).toBe(1);

    const second = await pushObservabilityBatch([event(2)]);
    expect(second).toBe(false);
    expect(observabilityQueueDepth()).toBe(2);
  });

  it('trims queue with backpressure cap', async () => {
    (globalThis as unknown as { fetch?: unknown }).fetch = jest.fn(async () => ({ ok: false }));

    const many = Array.from({ length: 5200 }, (_, idx) => event(idx));
    await pushObservabilityBatch(many);
    expect(observabilityQueueDepth()).toBeLessThanOrEqual(5000);
  });



  it('does not perform network send while backoff window is active', async () => {
    const fetchMock = jest.fn(async () => ({ ok: false }));
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock;

    const first = await pushObservabilityBatch([event(1)]);
    const second = await pushObservabilityBatch([event(2)]);

    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(observabilityQueueDepth()).toBe(2);
  });

  it('evaluates release gates by tunnel/crash/wakeup thresholds', () => {
    expect(
      evaluateReleaseGate({ crashes: 0, wakeups: 10, blockedDomains: 2, policyHits: 50, tunnelStatus: 'active' })
    ).toBe('green');
    expect(getReleaseGateStatus()).toBe('green');

    expect(
      evaluateReleaseGate({ crashes: 0, wakeups: 10, blockedDomains: 0, policyHits: 101, tunnelStatus: 'active' })
    ).toBe('yellow');

    expect(
      evaluateReleaseGate({ crashes: 1, wakeups: 10, blockedDomains: 2, policyHits: 50, tunnelStatus: 'active' })
    ).toBe('red');

    expect(
      evaluateReleaseGate({ crashes: 0, wakeups: 10, blockedDomains: 2, policyHits: 50, tunnelStatus: 'stopped' })
    ).toBe('red');
  });
});
