import { LocationModel } from '../types/location.types';

export interface LocationValidationState {
  status: 'idle' | 'detecting' | 'in_radius' | 'out_of_radius' | 'error' | 'no_locations';
  matchedLocation: LocationModel | null;
  nearestLocation: LocationModel | null;
  nearestDistanceMeters: number | null;
  userCoords: { latitude: number; longitude: number; accuracy?: number } | null;
  errorMessage?: string;
  checkedAt?: Date;
}

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 * Matches backend SQL formula in Migration 027 (and 023, 024):
 * Earth radius = 6,371,000 meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates user GPS coordinates against all active attendance-enabled locations.
 * Follows the exact logic of Supabase RPC check_in / check_out:
 * - Iterates over all active, attendance-enabled locations with valid coordinates
 * - Calculates distance using Haversine formula
 * - If distance <= radiusMeters, selects the best (closest) matched location
 * - If not in radius, finds the nearest location for informative distance feedback
 */
export function evaluateLocationRadius(
  userLat: number,
  userLng: number,
  locations: LocationModel[],
  accuracy?: number
): LocationValidationState {
  const validLocations = locations.filter(
    (loc) =>
      loc.isActive &&
      loc.isAttendanceEnabled &&
      loc.latitude !== null &&
      loc.longitude !== null &&
      !isNaN(loc.latitude) &&
      !isNaN(loc.longitude)
  );

  if (validLocations.length === 0) {
    return {
      status: 'no_locations',
      matchedLocation: null,
      nearestLocation: null,
      nearestDistanceMeters: null,
      userCoords: { latitude: userLat, longitude: userLng, accuracy },
      checkedAt: new Date(),
    };
  }

  let bestMatchedLocation: LocationModel | null = null;
  let bestMatchedDistance: number | null = null;

  let nearestLocation: LocationModel | null = null;
  let nearestDistance: number | null = null;

  for (const loc of validLocations) {
    const dist = calculateDistanceMeters(userLat, userLng, loc.latitude!, loc.longitude!);

    if (nearestDistance === null || dist < nearestDistance) {
      nearestDistance = dist;
      nearestLocation = loc;
    }

    if (dist <= loc.radiusMeters) {
      if (bestMatchedDistance === null || dist < bestMatchedDistance) {
        bestMatchedDistance = dist;
        bestMatchedLocation = loc;
      }
    }
  }

  if (bestMatchedLocation) {
    return {
      status: 'in_radius',
      matchedLocation: bestMatchedLocation,
      nearestLocation,
      nearestDistanceMeters: Math.round(bestMatchedDistance!),
      userCoords: { latitude: userLat, longitude: userLng, accuracy },
      checkedAt: new Date(),
    };
  }

  return {
    status: 'out_of_radius',
    matchedLocation: null,
    nearestLocation,
    nearestDistanceMeters: Math.round(nearestDistance!),
    userCoords: { latitude: userLat, longitude: userLng, accuracy },
    checkedAt: new Date(),
  };
}

/**
 * Formats distance in meters or kilometers for readable UI display.
 */
export function formatDistanceDisplay(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}
