export type BlockingMode = 'LOG_ONLY' | 'SOFT_BLOCK' | 'HARD_BLOCK';
export type EnvironmentCohort = 'dev' | 'beta' | 'prod';

export type TrackerIntelSnapshot = {
  domainSuffixes: string[];
  urlKeywords: string[];
  pathKeywords: string[];
  queryParamKeywords: string[];
  scriptSignatures: string[];
  globalAllowExceptions: string[];
  providerAllowExceptions: Record<string, string[]>;
  blockingMode: BlockingMode;
  confidenceThresholdSoft: number;
  confidenceThresholdHard: number;
  confidenceThresholdQuarantine: number;
  environmentCohort: EnvironmentCohort;
  version: string;
};

export type TrackerDecision = {
  blocked: boolean;
  reason: string;
  confidence: number;
  action: 'ALLOW' | 'LOG' | 'SOFT_BLOCK' | 'QUARANTINE' | 'HARD_BLOCK';
};

const DEFAULT_INTEL: TrackerIntelSnapshot = {
  domainSuffixes: [
    'doubleclick.net',
    'googletagmanager.com',
    'google-analytics.com',
    'adservice.google.com',
    'scorecardresearch.com',
    'adnxs.com',
    'branch.io',
    'appsflyer.com',
    'adjust.com',
    'mixpanel.com',
    'segment.io',
    'hotjar.com',
    'fullstory.com',
    'newrelic.com',
    'datadoghq.com',
    'sentry.io',
    'optimizely.com',
    'quantserve.com',
    'outbrain.com',
    'taboola.com',
    'tealiumiq.com',
    'criteo.com'
  ],
  urlKeywords: ['analytics', 'telemetry', 'metrics', 'beacon', 'fingerprint', 'profil', 'track', 'ads'],
  pathKeywords: ['/collect', '/events', '/pixel', '/beacon', '/measure', '/track', '/telemetry'],
  queryParamKeywords: ['utm_', 'fbclid', 'gclid', 'msclkid', 'ttclid', 'clickid', 'fingerprint', 'device_id'],
  scriptSignatures: [
    'googletagmanager',
    'google-analytics',
    'gtag(',
    'fbq(',
    'mixpanel',
    'amplitude',
    'newrelic',
    'datadog',
    'sentry',
    'segment'
  ],
  globalAllowExceptions: ['signal.org', 'whatsapp.com'],
  providerAllowExceptions: {},
  blockingMode: 'HARD_BLOCK',
  confidenceThresholdSoft: 0.45,
  confidenceThresholdHard: 0.75,
  confidenceThresholdQuarantine: 0.6,
  environmentCohort: 'beta',
  version: 'intel-v3'
};

let activeIntel: TrackerIntelSnapshot = DEFAULT_INTEL;

const safeUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch (_error) {
    return null;
  }
};

const hostMatches = (host: string, suffix: string): boolean => host === suffix || host.endsWith(`.${suffix}`);

const isAllowException = (host: string, provider?: string): boolean => {
  if (activeIntel.globalAllowExceptions.some((entry) => hostMatches(host, entry))) {
    return true;
  }

  if (provider) {
    const providerEntries = activeIntel.providerAllowExceptions[provider] ?? [];
    if (providerEntries.some((entry) => hostMatches(host, entry))) {
      return true;
    }
  }

  return false;
};

const actionForConfidence = (confidence: number): TrackerDecision['action'] => {
  if (activeIntel.blockingMode === 'LOG_ONLY') {
    return 'LOG';
  }

  if (activeIntel.blockingMode === 'SOFT_BLOCK') {
    return confidence >= activeIntel.confidenceThresholdSoft ? 'SOFT_BLOCK' : 'LOG';
  }

  if (confidence >= activeIntel.confidenceThresholdHard) {
    return 'HARD_BLOCK';
  }

  if (confidence >= activeIntel.confidenceThresholdQuarantine) {
    return 'QUARANTINE';
  }

  if (confidence >= activeIntel.confidenceThresholdSoft) {
    return 'SOFT_BLOCK';
  }

  return 'LOG';
};

export const applyCohortCalibration = (cohort: EnvironmentCohort): void => {
  activeIntel.environmentCohort = cohort;
  if (cohort === 'dev') {
    activeIntel.confidenceThresholdSoft = 0.35;
    activeIntel.confidenceThresholdQuarantine = 0.55;
    activeIntel.confidenceThresholdHard = 0.85;
    activeIntel.blockingMode = 'SOFT_BLOCK';
    return;
  }

  if (cohort === 'beta') {
    activeIntel.confidenceThresholdSoft = 0.45;
    activeIntel.confidenceThresholdQuarantine = 0.6;
    activeIntel.confidenceThresholdHard = 0.8;
    activeIntel.blockingMode = 'HARD_BLOCK';
    return;
  }

  activeIntel.confidenceThresholdSoft = 0.5;
  activeIntel.confidenceThresholdQuarantine = 0.65;
  activeIntel.confidenceThresholdHard = 0.78;
  activeIntel.blockingMode = 'HARD_BLOCK';
};

export const setTrackerIntel = (intel: Partial<TrackerIntelSnapshot>): void => {
  activeIntel = {
    ...activeIntel,
    ...intel,
    domainSuffixes: intel.domainSuffixes ?? activeIntel.domainSuffixes,
    urlKeywords: intel.urlKeywords ?? activeIntel.urlKeywords,
    pathKeywords: intel.pathKeywords ?? activeIntel.pathKeywords,
    queryParamKeywords: intel.queryParamKeywords ?? activeIntel.queryParamKeywords,
    scriptSignatures: intel.scriptSignatures ?? activeIntel.scriptSignatures,
    globalAllowExceptions: intel.globalAllowExceptions ?? activeIntel.globalAllowExceptions,
    providerAllowExceptions: intel.providerAllowExceptions ?? activeIntel.providerAllowExceptions,
    blockingMode: intel.blockingMode ?? activeIntel.blockingMode,
    confidenceThresholdSoft: intel.confidenceThresholdSoft ?? activeIntel.confidenceThresholdSoft,
    confidenceThresholdHard: intel.confidenceThresholdHard ?? activeIntel.confidenceThresholdHard,
    confidenceThresholdQuarantine:
      intel.confidenceThresholdQuarantine ?? activeIntel.confidenceThresholdQuarantine,
    environmentCohort: intel.environmentCohort ?? activeIntel.environmentCohort,
    version: intel.version ?? activeIntel.version
  };
};

export const addProviderAllowException = (provider: string, hostSuffix: string): void => {
  const existing = activeIntel.providerAllowExceptions[provider] ?? [];
  if (!existing.includes(hostSuffix)) {
    activeIntel.providerAllowExceptions[provider] = [...existing, hostSuffix];
  }
};

export const removeProviderAllowException = (provider: string, hostSuffix: string): void => {
  const existing = activeIntel.providerAllowExceptions[provider] ?? [];
  activeIntel.providerAllowExceptions[provider] = existing.filter((entry) => entry !== hostSuffix);
};

export const getTrackerIntel = (): TrackerIntelSnapshot => activeIntel;

export const detectTrackingAttempt = (urlOrHost: string, provider?: string): TrackerDecision => {
  const normalized = urlOrHost.toLowerCase();
  const parsed = safeUrl(urlOrHost);
  const host = parsed?.hostname?.toLowerCase() ?? normalized;

  if (isAllowException(host, provider)) {
    return { blocked: false, reason: 'allow_exception', confidence: 0, action: 'ALLOW' };
  }

  if (activeIntel.domainSuffixes.some((suffix) => hostMatches(host, suffix))) {
    const action = actionForConfidence(0.95);
    return { blocked: action === 'HARD_BLOCK', reason: 'domain_suffix', confidence: 0.95, action };
  }

  let confidence = 0;
  let reason = 'none';

  if (activeIntel.urlKeywords.some((keyword) => normalized.includes(keyword))) {
    confidence = Math.max(confidence, 0.6);
    reason = 'url_keyword';
  }

  const pathname = parsed?.pathname?.toLowerCase() ?? normalized;
  if (activeIntel.pathKeywords.some((keyword) => pathname.includes(keyword))) {
    confidence = Math.max(confidence, 0.7);
    reason = 'path_keyword';
  }

  const query = parsed?.search?.toLowerCase() ?? '';
  if (activeIntel.queryParamKeywords.some((keyword) => query.includes(keyword))) {
    confidence = Math.max(confidence, 0.85);
    reason = 'query_param';
  }

  if (confidence === 0) {
    return { blocked: false, reason: 'none', confidence: 0, action: 'ALLOW' };
  }

  const action = actionForConfidence(confidence);
  return {
    blocked: action === 'HARD_BLOCK',
    reason,
    confidence,
    action
  };
};

export const detectTrackingScript = (content: string): TrackerDecision => {
  const normalized = content.toLowerCase();
  const matched = activeIntel.scriptSignatures.find((signature) =>
    normalized.includes(signature.toLowerCase())
  );

  if (!matched) {
    return { blocked: false, reason: 'none', confidence: 0, action: 'ALLOW' };
  }

  const action = actionForConfidence(0.9);
  return {
    blocked: action === 'HARD_BLOCK',
    reason: `script_signature:${matched}`,
    confidence: 0.9,
    action
  };
};
