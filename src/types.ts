export type PrivacyMode = 'FULL' | 'PARTIAL' | 'TRUSTED';

export type ProviderRule = {
  provider: string;
  locationMasking: boolean;
  trackerBlocking: boolean;
  queryMutation: boolean;
  headerObfuscation: boolean;
  notifyOnBlock: boolean;
  locationRadiusMiles: number;
  allowExceptions?: string[];
};

export type PrivacyState = {
  enabled: boolean;
  mode: PrivacyMode;
  providerRules: ProviderRule[];
};

export type PrivacyRuntimeStatus = {
  backgroundAvailable: boolean;
  lastBackgroundTick: number | null;
  activeSessionId: string;
  blockedTrackers: number;
  lastMaskedLocation: string;
  batteryImpactHint: 'LOW' | 'MEDIUM';
  activeProvider: string;
  networkPlaneStatus: 'unavailable' | 'starting' | 'active' | 'error';
  policyVersion: string;
  policyHits: number;
  wakeups: number;
  crashes: number;
  releaseGateStatus: 'green' | 'yellow' | 'red';
};

export type PrivacyDecision = {
  provider: string;
  allowLocationMasking: boolean;
  allowTrackerBlocking: boolean;
  allowQueryMutation: boolean;
  allowHeaderObfuscation: boolean;
  notifyOnBlock: boolean;
  locationRadiusMiles: number;
};
