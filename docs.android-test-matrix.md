# Android Long-Run Test Matrix (VPU)

## Device/OEM Coverage

| OEM | Device class | OS versions | Focus |
|---|---|---|---|
| Google Pixel | Pixel 6/7/8 | Android 12, 13, 14, 15 | Baseline platform behavior |
| Samsung | S22/S23/A54 | Android 12, 13, 14 | OEM battery controls and background limits |
| Xiaomi | 12/13/Redmi Note series | Android 12, 13, 14 | Aggressive process management |

## Power/Background Scenarios

1. **Doze mode**
   - enter device idle for 2h/6h windows
   - verify VPN remains active and fail strategy behavior
   - verify background tick scheduling degradation is measurable and logged

2. **App standby buckets**
   - force app into `active`, `working_set`, `frequent`, `rare`
   - validate wakeup counts, tunnel status transitions, and policy enforcement continuity

3. **Battery saver enabled**
   - ensure fail-open/fail-closed strategy executes as configured
   - verify CPU/memory ceilings

## Reliability Runs

- 24-hour soak with periodic network switches (Wi-Fi <-> LTE)
- 72-hour soak with random app foreground/background transitions
- crash-recovery loop: kill process while tunnel active and ensure state recovers correctly

## Metrics to capture

- ANR count
- crash count
- battery delta per hour
- wakeups per hour
- blocked-domain count
- policy-hit count
- tunnel active uptime

## Release gate

- no critical crashes for 72-hour soak
- ANR rate < 0.1%
- tunnel uptime > 99%
- fail strategy correctness verified across all tested devices
