# Virtual Private User (VPU) React Native App (Android-first)

This repository contains an Android-focused React Native Virtual Private User (VPU) implementation designed to obfuscate identity signals, apply dynamic provider policy routing, and move toward device-wide enforcement through a native VPN tunnel path.

## What is implemented now

### 1) Native Android VPN module + service path (end-to-end scaffolding)

- Added native Kotlin module/package/service under `android/vpu-native/`:
  - `VpuVpnModule.kt` (React Native bridge methods: `startTunnel`, `stopTunnel`, `getStatus`, `getMetrics`, `evaluateHost`, `getRecentDecisions`)
  - `VpuVpnService.kt` (`VpnService` lifecycle, tunnel setup, DNS servers, fail-open/fail-closed behavior)
  - `VpuVpnPackage.kt` (RN package registration)
  - `TunnelPolicyRouter.kt` + model classes for provider-aware enforcement data
- Tunnel config now supports:
  - `failStrategy`: `FAIL_CLOSED` or `FAIL_OPEN`
  - DNS policy snapshot
  - provider policy snapshot
  - staged blocking mode (`LOG_ONLY` / `SOFT_BLOCK` / `HARD_BLOCK`)

### 2) Native packet intelligence (priority work in progress)

- Added `PacketInspector.kt` for packet-level host extraction attempts:
  - DNS query parsing from UDP/53
  - TLS ClientHello SNI extraction for TCP/443 with malformed-record bounds checks
  - QUIC Initial parsing hook with SNI extraction attempt from embedded ClientHello bytes
- Added decision feedback loop from tunnel to JS (`getRecentDecisions`) for authoritative telemetry.
- **(Later Date)** Full QUIC CRYPTO frame reassembly/parsing and robust fragmented TLS stream reassembly still require deeper native development in home IDE.

### 3) Dynamic policy routing moved into tunnel enforcement path

- Added provider policy snapshot packaging to network plane startup payload.
- Added native `evaluateHost` bridge and tunnel-side router logic so provider-aware checks exist in native path too, not only WebView interception.
- Native-first precedence now applies when tunnel is active; WebView logic is supplemental telemetry.

### 4) Production observability + backend operationalization

- Added `src/services/observability.ts` for:
  - crash signal capture (global handler),
  - wakeup tracking via AppState,
  - metric event stream.
- Added backend pipeline adapter in `src/services/observabilityBackend.ts`:
  - durable in-memory queue,
  - retry/backoff,
  - backpressure via max queue and batch size.
- Added release gate automation:
  - `scripts/evaluate-release-gates.mjs`
  - `npm run release:gate`
  - `.github/workflows/release-gate.yml` for CI execution.
- **(Later Date)** Add encrypted on-disk queue and privacy-minimized envelope signing for offline durability in production.

### 5) Long-run Android test matrix

- Added `docs.android-test-matrix.md` covering:
  - Pixel/Samsung/Xiaomi targets,
  - Android 12–15 ranges,
  - Doze/App Standby/Battery Saver scenarios,
  - 24h/72h reliability soak gates.

### 6) Cryptographic policy signing + rollback protection

- Added policy payload signature fields (`signatureAlgorithm`, `keyId`, `keyChainLevel`, `releaseChannel`) and WebCrypto verification flow with pinned key IDs.
- Added version pinning floor enforcement, channel minimum version checks, and revoked key list support.
- **(Later Date)** Replace placeholder key material/signature generation with production CI signing keys (offline root + online signer), formal key rotation policy, and incident revocation playbooks.

### 7) False-positive governance for service-agnostic heuristics

- Added confidence scoring and staged enforcement actions:
  - `ALLOW`, `LOG`, `SOFT_BLOCK`, `QUARANTINE`, `HARD_BLOCK`
- Added global and provider-level allow exceptions.
- Added cohort calibration (`dev`/`beta`/`prod`) for threshold tuning.
- Added policy-update support for confidence thresholds, blocking mode, and exception controls without app release.

## Likely implementation challenges and current handling

1. **Encrypted protocol visibility**
   - QUIC/TLS complexity and fragmentation make host attribution difficult.
   - Current implementation handles initial parsing and malformed guards; full stream/frame reassembly is pending **(Later Date)**.

2. **False positives vs privacy strength**
   - Heuristic blocking can impact legitimate telemetry.
   - Current implementation adds staged actions + exceptions + cohort threshold calibration.

3. **Crypto key lifecycle complexity**
   - Signing trust and anti-rollback are operational systems.
   - Current implementation starts pinned keys/revocation/version controls; CI key hierarchy and rotations remain **(Later Date)**.

4. **OEM background behavior variance**
   - Doze/vendor process policies can disrupt background behavior.
   - Current matrix defines OEM/version scenarios but still must be executed and measured.

5. **Observability durability and privacy**
   - Telemetry pipelines need resilience and minimization.
   - Current implementation has queue/retry/backoff and gating hooks; durable encrypted persistence remains **(Later Date)**.

## Core app behavior

- Dynamic per-provider policy routing in app runtime.
- Background tasks continue to refresh session/location obfuscation state.
- Native tunnel is authoritative when active; WebView only supplements detections.
- Signed update + rollback controls are exposed for policy operations.

## File map

- `App.tsx` — orchestration, runtime telemetry, tunnel lifecycle, update controls.
- `src/services/androidNetworkPlane.ts` — JS bridge facade for native VPN module.
- `src/services/providerRouting.ts` — URL-to-provider and policy snapshot mapping.
- `src/services/dnsPolicy.ts` — block/allow policy + secure-refresh behavior.
- `src/services/trackerIntel.ts` — confidence scoring, staged blocking, allow exceptions.
- `src/services/observability.ts` — runtime metrics capture.
- `src/services/observabilityBackend.ts` — backend push + queue/retry/backoff + release gate evaluation.
- `src/services/policyUpdates.ts` — signed updates + version pinning + rollback controls.
- `android/vpu-native/*` — native Android VPN module/service/scaffolding.
- `scripts/evaluate-release-gates.mjs` — release gate automation.
- `scripts/release-gate-selftest.mjs` — validator self-test for schema/threshold behavior.
- `metrics.template.json` — required soak metrics schema template for CI gate artifacts.
- `.github/workflows/release-gate.yml` — CI release gate workflow.
- `docs.android-test-matrix.md` — reliability and platform validation matrix.
- `docs/home-test-runs.md` — step-by-step home IDE/device validation checklist before alpha.

## Run

```bash
npm install
npm test
npm start
npm run release:gate
npm run release:gate:template
npm run release:gate:selftest
```

## Important production notes

- Full packet parsing/host extraction in tunnel loop is improved but still not complete for all modern encrypted traffic patterns.
- Background scheduling remains OS-governed on Android.
- Egress IP rotation still requires external relay/proxy infrastructure.
