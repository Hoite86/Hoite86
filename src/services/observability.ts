import { AppState, AppStateStatus } from 'react-native';

export type MetricEvent = {
  name: string;
  value: number;
  tags?: Record<string, string | number | boolean>;
  timestamp: number;
};

let wakeups = 0;
let crashes = 0;
let appState: AppStateStatus = 'active';
const events: MetricEvent[] = [];

const pushEvent = (event: MetricEvent): void => {
  events.push(event);
  if (events.length > 500) {
    events.shift();
  }
};

export const initObservability = (): void => {
  AppState.addEventListener('change', (next) => {
    appState = next;
    if (next === 'active') {
      wakeups += 1;
      pushEvent({ name: 'app_wakeup', value: wakeups, timestamp: Date.now() });
    }
  });

  const originalHandler = (global as unknown as { ErrorUtils?: unknown }).ErrorUtils as
    | { setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void }
    | undefined;

  if (originalHandler) {
    originalHandler.setGlobalHandler((error, isFatal) => {
      crashes += 1;
      pushEvent({
        name: 'app_crash',
        value: crashes,
        tags: { fatal: Boolean(isFatal), message: error.message },
        timestamp: Date.now()
      });
    });
  }
};

export const recordMetric = (
  name: string,
  value = 1,
  tags?: Record<string, string | number | boolean>
): void => {
  pushEvent({ name, value, tags, timestamp: Date.now() });
};

export const observabilitySnapshot = (): {
  wakeups: number;
  crashes: number;
  appState: AppStateStatus;
  events: MetricEvent[];
} => ({ wakeups, crashes, appState, events: [...events] });
