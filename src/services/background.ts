import BackgroundFetch, { BackgroundFetchStatus } from 'react-native-background-fetch';

import { randomDelayMs } from './behavior';
import { recommendedBackgroundDelayRange, PrivacyPerformanceProfile } from './performance';
import { resolveLocationForSharing } from './location';
import { rotateSessionId } from './session';
import { PrivacyDecision } from '../types';

export type BackgroundTickSummary = {
  taskId: string;
  provider: string;
  pseudoLocation: string;
  randomizedDelayMs: number;
  sessionId: string;
  timestamp: number;
  performanceProfile: PrivacyPerformanceProfile;
};

type LocationProvider = () => Promise<{ latitude: number; longitude: number }>;

const defaultLocationProvider: LocationProvider = async () => ({
  latitude: 40.7128,
  longitude: -74.006
});

export const configureBackgroundPrivacy = async (
  getDecision: () => PrivacyDecision,
  onTick: (summary: BackgroundTickSummary) => Promise<void>,
  getLocation: LocationProvider = defaultLocationProvider,
  getPerformanceProfile: () => PrivacyPerformanceProfile = () => 'BALANCED'
): Promise<BackgroundFetchStatus> => {
  const status = await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      enableHeadless: true,
      startOnBoot: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY
    },
    async (taskId) => {
      const decision = getDecision();
      const profile = getPerformanceProfile();
      const real = await getLocation();
      const pseudo = resolveLocationForSharing(real, decision);
      const range = recommendedBackgroundDelayRange(profile);
      const delay = randomDelayMs(range.minMs, range.maxMs);
      const session = rotateSessionId();
      await onTick({
        taskId,
        provider: decision.provider,
        pseudoLocation: `${pseudo.latitude},${pseudo.longitude}`,
        randomizedDelayMs: delay,
        sessionId: session,
        timestamp: Date.now(),
        performanceProfile: profile
      });
      BackgroundFetch.finish(taskId);
    },
    (taskId) => {
      BackgroundFetch.finish(taskId);
    }
  );

  if (status === BackgroundFetchStatus.Available) {
    await BackgroundFetch.start();
  }

  return status;
};
