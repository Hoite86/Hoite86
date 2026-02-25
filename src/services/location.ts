import { PrivacyDecision } from '../types';

export type Coordinates = { latitude: number; longitude: number; accuracyMeters?: number };

const EARTH_RADIUS_MILES = 3958.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const maskLocation = (
  real: Coordinates,
  radiusMiles: number,
  minOffsetMiles = 0.35
): Coordinates => {
  const distance = Math.max(minOffsetMiles, Math.random() * radiusMiles);
  const bearing = Math.random() * 2 * Math.PI;

  const lat1 = toRadians(real.latitude);
  const lon1 = toRadians(real.longitude);
  const angularDistance = distance / EARTH_RADIUS_MILES;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: Number(toDegrees(lat2).toFixed(6)),
    longitude: Number(toDegrees(lon2).toFixed(6)),
    accuracyMeters: Number((radiusMiles * 1609.34).toFixed(0))
  };
};

export const resolveLocationForSharing = (
  real: Coordinates,
  decision: PrivacyDecision
): Coordinates => {
  if (!decision.allowLocationMasking) {
    return real;
  }

  return maskLocation(real, decision.locationRadiusMiles);
};
