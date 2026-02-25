import { PrivacyDecision } from '../types';
import { getActivePolicyUpdate } from './policyUpdates';
import { detectTrackingAttempt, getTrackerIntel, setTrackerIntel } from './trackerIntel';

let dnsAllowlist = ['signal.org', 'whatsapp.com'];
let policyVersion = 'local';

const extractHost = (urlOrHost: string): string => {
  try {
    return new URL(urlOrHost).hostname.toLowerCase();
  } catch (_error) {
    return urlOrHost.toLowerCase();
  }
};

const hostMatches = (host: string, pattern: string): boolean => host === pattern || host.endsWith(`.${pattern}`);

export const shouldBlockDomain = (urlOrHost: string, decision: PrivacyDecision): boolean => {
  if (!decision.allowTrackerBlocking) {
    return false;
  }

  const host = extractHost(urlOrHost);
  if (dnsAllowlist.some((entry) => hostMatches(host, entry))) {
    return false;
  }

  const detection = detectTrackingAttempt(urlOrHost, decision.provider);
  return detection.action === 'HARD_BLOCK';
};

export const refreshDnsPolicyFromSecureUpdate = async (): Promise<boolean> => {
  const update = await getActivePolicyUpdate();
  if (!update) {
    return false;
  }

  dnsAllowlist = update.dnsAllowlist;
  policyVersion = update.version;
  setTrackerIntel({
    domainSuffixes: update.dnsBlocklist,
    urlKeywords: update.trackerIntel?.urlKeywords,
    pathKeywords: update.trackerIntel?.pathKeywords,
    queryParamKeywords: update.trackerIntel?.queryParamKeywords,
    scriptSignatures: update.trackerIntel?.scriptSignatures,
    globalAllowExceptions: update.trackerIntel?.globalAllowExceptions,
    providerAllowExceptions: update.trackerIntel?.providerAllowExceptions,
    blockingMode: update.trackerIntel?.blockingMode,
    confidenceThresholdSoft: update.trackerIntel?.confidenceThresholdSoft,
    confidenceThresholdHard: update.trackerIntel?.confidenceThresholdHard,
    version: update.version
  });
  return true;
};

export const getDnsPolicySnapshot = (): {
  blocklist: string[];
  allowlist: string[];
  version: string;
  trackerIntel: ReturnType<typeof getTrackerIntel>;
} => ({
  blocklist: getTrackerIntel().domainSuffixes,
  allowlist: dnsAllowlist,
  version: policyVersion,
  trackerIntel: getTrackerIntel()
});
