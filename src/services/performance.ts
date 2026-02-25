export type PrivacyPerformanceProfile = 'HIGH_PRIVACY' | 'BALANCED' | 'LOW_POWER';

export type PerformanceInputs = {
  batteryLevel?: number;
  wakeups: number;
  crashes: number;
  batteryImpactHint?: 'LOW' | 'MEDIUM';
};

export const determineAdaptivePerformanceProfile = (
  input: PerformanceInputs
): PrivacyPerformanceProfile => {
  const battery = input.batteryLevel ?? 100;

  if (input.crashes > 0 || battery <= 15 || input.wakeups > 6000) {
    return 'LOW_POWER';
  }

  if (battery <= 35 || input.batteryImpactHint === 'MEDIUM' || input.wakeups > 3000) {
    return 'BALANCED';
  }

  return 'HIGH_PRIVACY';
};

export const recommendedBackgroundDelayRange = (
  profile: PrivacyPerformanceProfile
): { minMs: number; maxMs: number } => {
  if (profile === 'LOW_POWER') return { minMs: 900, maxMs: 2200 };
  if (profile === 'BALANCED') return { minMs: 350, maxMs: 1400 };
  return { minMs: 120, maxMs: 900 };
};

export const obfuscationIntensityForProfile = (
  profile: PrivacyPerformanceProfile
): 'high' | 'medium' | 'low' => {
  if (profile === 'LOW_POWER') return 'low';
  if (profile === 'BALANCED') return 'medium';
  return 'high';
};
