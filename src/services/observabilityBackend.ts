import { MetricEvent } from './observability';

type ReleaseGateInput = {
  crashes: number;
  wakeups: number;
  blockedDomains: number;
  policyHits: number;
  tunnelStatus: string;
};

const DEFAULT_ENDPOINT = 'https://vpu-control-plane.example/ingest';
const MAX_QUEUE = 5000;
const MAX_BATCH = 200;

let backendEndpoint = DEFAULT_ENDPOINT;
let releaseGateStatus: 'green' | 'yellow' | 'red' = 'green';
let queue: MetricEvent[] = [];
let retryAttempt = 0;
let nextAllowedSendAt = 0;

const enqueue = (events: MetricEvent[]): void => {
  queue = [...queue, ...events].slice(-MAX_QUEUE);
};

const computeBackoffMs = (): number => {
  const base = Math.min(60_000, 1000 * 2 ** retryAttempt);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
};

export const configureObservabilityBackend = (endpoint: string): void => {
  backendEndpoint = endpoint;
};

export const pushObservabilityBatch = async (events: MetricEvent[]): Promise<boolean> => {
  const now = Date.now();
  enqueue(events);

  if (queue.length === 0) {
    return true;
  }

  if (now < nextAllowedSendAt) {
    return false;
  }

  const batch = queue.slice(0, MAX_BATCH);

  try {
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: batch.map((event) => ({
          name: event.name,
          value: event.value,
          timestamp: event.timestamp,
          tags: event.tags
        })),
        sentAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      retryAttempt += 1;
      nextAllowedSendAt = now + computeBackoffMs();
      return false;
    }

    queue = queue.slice(batch.length);
    retryAttempt = 0;
    nextAllowedSendAt = 0;
    return true;
  } catch (_error) {
    retryAttempt += 1;
    nextAllowedSendAt = now + computeBackoffMs();
    return false;
  }
};

export const observabilityQueueDepth = (): number => queue.length;

export const evaluateReleaseGate = (input: ReleaseGateInput): 'green' | 'yellow' | 'red' => {
  if (input.tunnelStatus !== 'active') {
    releaseGateStatus = 'red';
    return releaseGateStatus;
  }

  if (input.crashes > 0 || input.wakeups > 5000) {
    releaseGateStatus = 'red';
    return releaseGateStatus;
  }

  if (input.blockedDomains === 0 && input.policyHits > 100) {
    releaseGateStatus = 'yellow';
    return releaseGateStatus;
  }

  releaseGateStatus = 'green';
  return releaseGateStatus;
};

export const getReleaseGateStatus = (): 'green' | 'yellow' | 'red' => releaseGateStatus;


export const resetObservabilityBackendForTests = (): void => {
  queue = [];
  retryAttempt = 0;
  nextAllowedSendAt = 0;
  releaseGateStatus = 'green';
  backendEndpoint = DEFAULT_ENDPOINT;
};
