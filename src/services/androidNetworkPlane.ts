import { NativeModules } from 'react-native';

import { getDnsPolicySnapshot } from './dnsPolicy';
import { providerPoliciesSnapshot } from './providerRouting';
import { PrivacyState } from '../types';

type AndroidVpnModule = {
  startTunnel(config: string): Promise<boolean>;
  stopTunnel(): Promise<boolean>;
  getStatus(): Promise<string>;
  getMetrics?(): Promise<string>;
  evaluateHost?(host: string): Promise<string>;
  getRecentDecisions?(): Promise<string>;
};

const MODULE_NAME = 'VpuVpnModule';
const vpnModule: AndroidVpnModule | undefined = NativeModules[MODULE_NAME];

export type FailStrategy = 'FAIL_OPEN' | 'FAIL_CLOSED';
export type BlockingMode = 'LOG_ONLY' | 'SOFT_BLOCK' | 'HARD_BLOCK';

export type AndroidNetworkPlaneConfig = {
  mode: 'PROTECTIVE' | 'BALANCED';
  rotateExitNodeMinutes: number;
  enforcePrivateDns: boolean;
  failStrategy: FailStrategy;
  blockingMode: BlockingMode;
};

export type NetworkPlaneMetrics = {
  status: string;
  blockedDomains: number;
  forwardedPackets: number;
  policyHits: number;
  policyVersion: string;
  parsedHosts?: number;
  quicPackets?: number;
  blockingMode?: BlockingMode;
};

export type TunnelDecision = {
  host: string;
  provider: string;
  blocked: boolean;
  protocol?: string;
  confidence?: number;
  timestamp?: number;
};

export const isAndroidNetworkPlaneAvailable = (): boolean => Boolean(vpnModule);

export const startAndroidNetworkPlane = async (
  config: AndroidNetworkPlaneConfig,
  state: PrivacyState
): Promise<{ started: boolean; reason: string }> => {
  if (!vpnModule) {
    return {
      started: false,
      reason: 'Native Android VPN module is not linked. Ship VpuVpnModule in android/app.'
    };
  }

  const dnsPolicy = getDnsPolicySnapshot();
  const providerPolicies = providerPoliciesSnapshot(state);
  const payload = JSON.stringify({ ...config, dnsPolicy, providerPolicies });
  const started = await vpnModule.startTunnel(payload);

  return {
    started,
    reason: started ? 'Android network plane started.' : 'Android network plane start request rejected.'
  };
};

export const stopAndroidNetworkPlane = async (): Promise<boolean> => {
  if (!vpnModule) {
    return false;
  }
  return vpnModule.stopTunnel();
};

export const getAndroidNetworkPlaneStatus = async (): Promise<string> => {
  if (!vpnModule) {
    return 'unavailable';
  }
  return vpnModule.getStatus();
};

export const getAndroidNetworkPlaneMetrics = async (): Promise<NetworkPlaneMetrics | null> => {
  if (!vpnModule?.getMetrics) {
    return null;
  }

  const raw = await vpnModule.getMetrics();
  try {
    const parsed = JSON.parse(raw) as NetworkPlaneMetrics;
    return parsed;
  } catch (_error) {
    return null;
  }
};

export const evaluateHostInTunnel = async (
  host: string
): Promise<{ host: string; provider: string; blocked: boolean } | null> => {
  if (!vpnModule?.evaluateHost) {
    return null;
  }

  const raw = await vpnModule.evaluateHost(host);
  try {
    return JSON.parse(raw) as { host: string; provider: string; blocked: boolean };
  } catch (_error) {
    return null;
  }
};

export const getRecentTunnelDecisions = async (): Promise<TunnelDecision[]> => {
  if (!vpnModule?.getRecentDecisions) {
    return [];
  }

  const raw = await vpnModule.getRecentDecisions();
  try {
    return JSON.parse(raw) as TunnelDecision[];
  } catch (_error) {
    return [];
  }
};
