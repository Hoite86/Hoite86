# Home Test Runs Checklist (Android VPU)

Use this checklist in your home IDE/device lab before declaring an alpha candidate.

## 0) Environment prep

1. Install deps:
   - `npm install`
2. Ensure Android SDK + JDK are available and an emulator/device is connected.
3. For native tests, run from the native package root if your Gradle wrapper lives there.

## 1) JS/TS correctness

1. Unit tests:
   - `npm test`
2. Re-run specific high-risk suites after any policy/parser changes:
   - `npm test -- trackerIntel.test.ts`
   - `npm test -- policyUpdates.test.ts`
   - `npm test -- trackerBlocker.test.ts`

## 2) Native packet parser safety

1. Run JVM unit tests including parser property test:
   - `./gradlew test`
2. Validate no crashes in parser fuzz/property tests:
   - confirm `PacketInspectorPropertyTest` passes.
3. Add/expand corpus with malformed QUIC/TLS examples for any parser bug found.

## 3) Tunnel lifecycle and enforcement checks (on device)

1. Start app and grant VPN permission.
2. Verify lifecycle transitions:
   - start -> active -> stop -> stopped
3. Validate fail strategies:
   - `FAIL_CLOSED`: blocked host traffic must be dropped.
   - `FAIL_OPEN`: blocked host event logged but traffic still forwarded when policy requires soft behavior.
4. Validate native-first precedence:
   - when tunnel active, WebView is supplemental telemetry only.

## 4) Policy update trust flow

1. Test valid signed update apply path.
2. Test rollback floor behavior (older versions rejected).
3. Test revoked key path:
   - push key to revoked list and confirm update is rejected.
4. Test release-channel min version gates (`dev`/`beta`/`stable`).

## 5) False-positive governance

1. Validate all action stages:
   - `LOG` -> `SOFT_BLOCK` -> `QUARANTINE` -> `HARD_BLOCK`.
2. Validate global allow exceptions.
3. Validate provider-specific allow exceptions.
4. Run calibration per cohort (`dev`, `beta`, `prod`) and compare block rates.

## 6) Observability + release gates

1. Validate queue/backoff under offline conditions:
   - disconnect network, generate events, reconnect, verify flush.
2. Run release-gate script with real soak output:
   - `node scripts/evaluate-release-gates.mjs metrics.json`
3. Confirm CI gate workflow passes on branch.

## 7) Long-run Android matrix (required before alpha)

Run on:
- Pixel (Android 12/13/14/15)
- Samsung (Android 12/13/14)
- Xiaomi (Android 12/13/14)

Scenarios:
- Doze (2h/6h)
- App standby bucket transitions
- Battery saver on/off
- 24h soak, then 72h soak
- Wi-Fi <-> LTE switching
- app kill/restart recovery loop

Capture:
- ANR rate
- crash count
- tunnel uptime
- wakeups/hour
- battery delta/hour
- policy-hit and blocked-domain rates

## Alpha go/no-go threshold

Use these minimum gates:
- ANR < 0.1%
- critical crashes = 0 in 72h soak
- tunnel uptime > 99%
- fail strategy correctness verified across devices/OEMs

## (Later Date) items to complete in home IDE

1. Full QUIC CRYPTO frame reassembly + SNI extraction.
2. TLS record/stream reassembly across fragmented packets.
3. Production key hierarchy and CI signing pipeline (offline root + online signer), rotation, revocation incident drill.
4. Durable encrypted on-disk observability queue.
