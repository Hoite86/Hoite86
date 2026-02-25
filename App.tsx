import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BackgroundFetchStatus } from 'react-native-background-fetch';

import { PrivacyDashboard } from './src/components/PrivacyDashboard';
import {
  evaluateHostInTunnel,
  getAndroidNetworkPlaneMetrics,
  getAndroidNetworkPlaneStatus,
  getRecentTunnelDecisions,
  isAndroidNetworkPlaneAvailable,
  startAndroidNetworkPlane,
  stopAndroidNetworkPlane
} from './src/services/androidNetworkPlane';
import { configureBackgroundPrivacy } from './src/services/background';
import { getDnsPolicySnapshot, refreshDnsPolicyFromSecureUpdate, shouldBlockDomain } from './src/services/dnsPolicy';
import { notifyPrivacyAction, initNotifications } from './src/services/notifications';
import { mutateSearchQuery, randomizedHeaders } from './src/services/obfuscation';
import { initObservability, observabilitySnapshot, recordMetric } from './src/services/observability';
import {
  configureObservabilityBackend,
  evaluateReleaseGate,
  observabilityQueueDepth,
  pushObservabilityBatch
} from './src/services/observabilityBackend';
import { resolvePrivacyDecision } from './src/services/policyEngine';
import { applyPolicyUpdate, rollbackPolicyUpdate } from './src/services/policyUpdates';
import { resolveDecisionForUrl, resolveProviderFromUrl } from './src/services/providerRouting';
import { getSessionId } from './src/services/session';
import { shouldBlockRequest, trackerBlockingScript } from './src/services/trackerBlocker';
import { applyCohortCalibration, detectTrackingAttempt } from './src/services/trackerIntel';
import { PrivacyRuntimeStatus, PrivacyState, ProviderRule } from './src/types';

const defaultRules: ProviderRule[] = [
  {
    provider: 'Google',
    locationMasking: true,
    trackerBlocking: true,
    queryMutation: true,
    headerObfuscation: true,
    notifyOnBlock: true,
    locationRadiusMiles: 50,
    allowExceptions: ['mail.google.com']
  },
  {
    provider: 'Meta',
    locationMasking: true,
    trackerBlocking: true,
    queryMutation: true,
    headerObfuscation: true,
    notifyOnBlock: true,
    locationRadiusMiles: 50,
    allowExceptions: []
  },
  {
    provider: 'TikTok',
    locationMasking: true,
    trackerBlocking: true,
    queryMutation: true,
    headerObfuscation: true,
    notifyOnBlock: true,
    locationRadiusMiles: 55,
    allowExceptions: []
  },
  {
    provider: 'Messaging',
    locationMasking: false,
    trackerBlocking: true,
    queryMutation: false,
    headerObfuscation: false,
    notifyOnBlock: false,
    locationRadiusMiles: 5,
    allowExceptions: ['signal.org', 'whatsapp.com']
  }
];

const initialUrl = 'https://example.org';

export default function App() {
  const [eventLog, setEventLog] = useState('Booting privacy engine...');
  const [activeUrl, setActiveUrl] = useState(initialUrl);
  const [state, setState] = useState<PrivacyState>({
    enabled: true,
    mode: 'FULL',
    providerRules: defaultRules
  });
  const [runtime, setRuntime] = useState<PrivacyRuntimeStatus>({
    backgroundAvailable: false,
    lastBackgroundTick: null,
    activeSessionId: getSessionId(),
    blockedTrackers: 0,
    lastMaskedLocation: 'unknown',
    batteryImpactHint: 'LOW',
    activeProvider: resolveProviderFromUrl(initialUrl),
    networkPlaneStatus: 'unavailable',
    policyVersion: getDnsPolicySnapshot().version,
    policyHits: 0,
    wakeups: 0,
    crashes: 0,
    releaseGateStatus: 'green'
  });

  const activeDecision = useMemo(() => resolveDecisionForUrl(state, activeUrl), [state, activeUrl]);
  const webHeaders = useMemo(
    () => randomizedHeaders(activeDecision, runtime.activeSessionId),
    [activeDecision, runtime.activeSessionId]
  );

  useEffect(() => {
    initNotifications().catch(() => undefined);
    initObservability();
    applyCohortCalibration('beta');
    configureObservabilityBackend('https://vpu-control-plane.example/ingest');

    const bootstrap = async () => {
      await refreshDnsPolicyFromSecureUpdate();
      setRuntime((prev) => ({ ...prev, policyVersion: getDnsPolicySnapshot().version }));

      if (!isAndroidNetworkPlaneAvailable()) {
        setEventLog('Android VPN network plane unavailable (native module not linked).');
        setRuntime((prev) => ({ ...prev, networkPlaneStatus: 'unavailable', releaseGateStatus: 'red' }));
        return;
      }

      setRuntime((prev) => ({ ...prev, networkPlaneStatus: 'starting' }));
      const result = await startAndroidNetworkPlane(
        {
          mode: state.mode === 'FULL' ? 'PROTECTIVE' : 'BALANCED',
          rotateExitNodeMinutes: 5,
          enforcePrivateDns: true,
          failStrategy: state.mode === 'TRUSTED' ? 'FAIL_OPEN' : 'FAIL_CLOSED',
          blockingMode: state.mode === 'TRUSTED' ? 'SOFT_BLOCK' : 'HARD_BLOCK'
        },
        state
      );

      if (!result.started) {
        setEventLog(result.reason);
        setRuntime((prev) => ({ ...prev, networkPlaneStatus: 'error', releaseGateStatus: 'red' }));
        return;
      }

      const status = await getAndroidNetworkPlaneStatus();
      setEventLog(status === 'active' ? 'Android network plane active.' : `Network plane: ${status}`);
      setRuntime((prev) => ({ ...prev, networkPlaneStatus: status === 'active' ? 'active' : 'starting' }));
      recordMetric('network_plane_start', 1, { status });
    };

    bootstrap().catch(() => {
      setEventLog('Failed to initialize Android network plane.');
      setRuntime((prev) => ({ ...prev, networkPlaneStatus: 'error', releaseGateStatus: 'red' }));
      recordMetric('network_plane_start_failure', 1);
    });

    const metricsInterval = setInterval(async () => {
      const metrics = await getAndroidNetworkPlaneMetrics();
      const obs = observabilitySnapshot();
      const gate = evaluateReleaseGate({
        crashes: obs.crashes,
        wakeups: obs.wakeups,
        blockedDomains: metrics?.blockedDomains ?? 0,
        policyHits: metrics?.policyHits ?? 0,
        tunnelStatus: metrics?.status ?? runtime.networkPlaneStatus
      });

      const recentDecisions = await getRecentTunnelDecisions();
      const hardBlocks = recentDecisions.filter((d) => d.blocked).length;
      const supplementalBlocked = runtime.networkPlaneStatus === 'active' ? hardBlocks : (metrics?.blockedDomains ?? 0);

      setRuntime((prev) => ({
        ...prev,
        policyHits: metrics?.policyHits ?? prev.policyHits,
        blockedTrackers: supplementalBlocked || prev.blockedTrackers,
        policyVersion: metrics?.policyVersion ?? prev.policyVersion,
        wakeups: obs.wakeups,
        crashes: obs.crashes,
        releaseGateStatus: gate
      }));

      await pushObservabilityBatch(obs.events.slice(-50));
      recordMetric('observability_queue_depth', observabilityQueueDepth());
    }, 5000);

    return () => {
      clearInterval(metricsInterval);
      stopAndroidNetworkPlane().catch(() => undefined);
    };
  }, [state, runtime.networkPlaneStatus]);

  useEffect(() => {
    configureBackgroundPrivacy(
      () => resolvePrivacyDecision(state, runtime.activeProvider),
      async (summary) => {
        setRuntime((prev) => ({
          ...prev,
          lastBackgroundTick: summary.timestamp,
          activeSessionId: summary.sessionId,
          lastMaskedLocation: summary.pseudoLocation,
          backgroundAvailable: true
        }));
        setEventLog(
          `Task ${summary.taskId} [${summary.provider}] location=${summary.pseudoLocation} delay=${summary.randomizedDelayMs}ms`
        );
        recordMetric('background_tick', 1, { provider: summary.provider });
        await notifyPrivacyAction('Privacy engine refreshed in background.');
      }
    )
      .then((status) => {
        if (status !== BackgroundFetchStatus.Available) {
          setEventLog('Background task support limited in current runtime.');
        }
      })
      .catch(() => setEventLog('Background task unavailable in this runtime.'));
  }, [state, runtime.activeProvider]);

  const syntheticSearchPreview = useMemo(
    () => mutateSearchQuery('best restaurants near new york', activeDecision),
    [activeDecision]
  );

  const simulateSecureUpdate = async (): Promise<void> => {
    const nextVersion = `v${Date.now()}`;
    const success = await applyPolicyUpdate({
      version: nextVersion,
      signature: 'REPLACE_WITH_REAL_SIGNATURE_BASE64',
      signatureAlgorithm: 'RSA-PSS-SHA256',
      keyId: 'vpu-root-2026',
      keyChainLevel: 'online',
      dnsBlocklist: [...getDnsPolicySnapshot().blocklist, 'newtracker.example'],
      dnsAllowlist: getDnsPolicySnapshot().allowlist,
      providerRules: state.providerRules,
      trackerIntel: {
        urlKeywords: ['analytics', 'telemetry', 'fingerprint', 'profil', 'track', 'beacon'],
        pathKeywords: ['/collect', '/events', '/pixel', '/telemetry', '/measure'],
        queryParamKeywords: ['utm_', 'clickid', 'fingerprint', 'device_id'],
        scriptSignatures: ['gtag(', 'fbq(', 'mixpanel', 'segment', 'newrelic', 'sentry'],
        blockingMode: 'HARD_BLOCK',
        confidenceThresholdSoft: 0.45,
        confidenceThresholdHard: 0.75,
        confidenceThresholdQuarantine: 0.6,
        environmentCohort: 'beta'
      },
      generatedAt: new Date().toISOString(),
      releaseChannel: 'beta',
      rollbackFloorVersion: runtime.policyVersion
    });

    if (success) {
      await refreshDnsPolicyFromSecureUpdate();
      setRuntime((prev) => ({ ...prev, policyVersion: getDnsPolicySnapshot().version }));
      setEventLog(`Policy update applied: ${nextVersion}`);
      recordMetric('policy_update_applied', 1, { version: nextVersion });
    } else {
      setEventLog('Policy update rejected (signature/version pin verification failed).');
      recordMetric('policy_update_rejected', 1);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <PrivacyDashboard
          state={state}
          onEnabledChange={(enabled) => setState((prev) => ({ ...prev, enabled }))}
          onModeChange={(mode) => setState((prev) => ({ ...prev, mode }))}
          onProviderRuleChange={(provider, patch) =>
            setState((prev) => ({
              ...prev,
              providerRules: prev.providerRules.map((rule) =>
                rule.provider === provider ? { ...rule, ...patch } : rule
              )
            }))
          }
        />

        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Runtime Status</Text>
          <Text style={styles.logText}>Provider: {runtime.activeProvider}</Text>
          <Text style={styles.logText}>Session: {runtime.activeSessionId}</Text>
          <Text style={styles.logText}>Blocked trackers/domains: {runtime.blockedTrackers}</Text>
          <Text style={styles.logText}>Masked location: {runtime.lastMaskedLocation}</Text>
          <Text style={styles.logText}>Network plane: {runtime.networkPlaneStatus}</Text>
          <Text style={styles.logText}>Policy version: {runtime.policyVersion}</Text>
          <Text style={styles.logText}>Policy hits: {runtime.policyHits}</Text>
          <Text style={styles.logText}>Wakeups: {runtime.wakeups}</Text>
          <Text style={styles.logText}>Crashes: {runtime.crashes}</Text>
          <Text style={styles.logText}>Release gate: {runtime.releaseGateStatus}</Text>
          <Text style={styles.logText}>Battery hint: {runtime.batteryImpactHint}</Text>
          <Text style={styles.logText}>Last event: {eventLog}</Text>
          <Text style={styles.logText}>Query preview: {syntheticSearchPreview}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setRuntime((prev) => ({ ...prev, blockedTrackers: 0, policyHits: 0 }));
                setEventLog('Counters reset.');
              }}
            >
              <Text style={styles.buttonText}>Reset Counters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={simulateSecureUpdate}>
              <Text style={styles.buttonText}>Apply Signed Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                const rolledBack = await rollbackPolicyUpdate();
                if (rolledBack) {
                  await refreshDnsPolicyFromSecureUpdate();
                  setRuntime((prev) => ({ ...prev, policyVersion: getDnsPolicySnapshot().version }));
                  setEventLog('Policy rollback completed.');
                  recordMetric('policy_update_rolled_back', 1);
                } else {
                  setEventLog('Rollback blocked by version pinning or missing snapshot.');
                }
              }}
            >
              <Text style={styles.buttonText}>Rollback Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        <WebView
          source={{ uri: initialUrl, headers: webHeaders }}
          injectedJavaScript={trackerBlockingScript}
          onNavigationStateChange={(navState) => {
            const url = navState.url || initialUrl;
            const provider = resolveProviderFromUrl(url);
            setActiveUrl(url);
            setRuntime((prev) => ({ ...prev, activeProvider: provider }));
          }}
          onShouldStartLoadWithRequest={(request) => {
            const decision = resolveDecisionForUrl(state, request.url);

            if (runtime.networkPlaneStatus === 'active') {
              // Native-first precedence: tunnel is authoritative while WebView remains supplemental telemetry.
              const detection = detectTrackingAttempt(request.url, decision.provider);
              if (detection.action !== 'ALLOW') {
                recordMetric('supplemental_webview_detection', 1, {
                  provider: decision.provider,
                  action: detection.action,
                  confidence: detection.confidence
                });
              }

              try {
                const host = new URL(request.url).hostname;
                evaluateHostInTunnel(host).catch(() => undefined);
              } catch (_error) {
                // no-op
              }

              return true;
            }

            if (!decision.allowTrackerBlocking) {
              return true;
            }

            const blockedByPolicy = shouldBlockRequest(request.url) || shouldBlockDomain(request.url, decision);
            if (blockedByPolicy) {
              setRuntime((prev) => ({
                ...prev,
                blockedTrackers: prev.blockedTrackers + 1,
                policyHits: prev.policyHits + 1
              }));
              recordMetric('request_blocked', 1, { provider: decision.provider, url: request.url });
              if (decision.notifyOnBlock) {
                notifyPrivacyAction(`Blocked request for ${decision.provider}`).catch(() => undefined);
              }
            }
            return !blockedByPolicy;
          }}
          onMessage={(event) => {
            if (runtime.networkPlaneStatus !== 'active') {
              setRuntime((prev) => ({ ...prev, blockedTrackers: prev.blockedTrackers + 1 }));
            }
            recordMetric('webview_tracker_event', 1, { payload: event.nativeEvent.data });
            if (activeDecision.notifyOnBlock) {
              notifyPrivacyAction(event.nativeEvent.data).catch(() => undefined);
            }
          }}
          style={styles.webview}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 12, paddingBottom: 24 },
  logCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 12 },
  logTitle: { color: '#e2e8f0', fontWeight: '600', marginBottom: 6 },
  logText: { color: '#cbd5e1', fontSize: 12, marginBottom: 2 },
  buttonRow: { gap: 8, marginTop: 10 },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  webview: { height: 420, borderRadius: 12, overflow: 'hidden' }
});
