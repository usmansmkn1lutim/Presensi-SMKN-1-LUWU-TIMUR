import { LocationModel } from '../types/location.types';

export interface LocationValidationState {
  status: 'idle' | 'detecting' | 'in_radius' | 'out_of_radius' | 'uncertain' | 'error' | 'no_locations';
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
 * Validates user GPS coordinates against all active attendance-enabled locations,
 * strictly factoring in GPS measurement uncertainty (coords.accuracy).
 *
 * Evaluation principles:
 * - 'in_radius': At least one location satisfies (distance + accuracy <= radiusMeters).
 *   The entire uncertainty circle falls strictly inside the geofence.
 * - 'out_of_radius': For ALL active locations, (distance - accuracy > radiusMeters).
 *   The entire uncertainty circle falls strictly outside all geofences.
 * - 'uncertain': If neither condition is met (e.g. uncertainty circle overlaps boundary,
 *   or accuracy is too coarse to decide with confidence).
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

  // 1. Calculate Haversine distance to all valid locations
  const locationDistances = validLocations.map((loc) => {
    const dist = calculateDistanceMeters(userLat, userLng, loc.latitude!, loc.longitude!);
    return { loc, dist };
  });

  // Track the nearest location overall for user information
  let nearestLocation: LocationModel = locationDistances[0].loc;
  let nearestDistance: number = locationDistances[0].dist;

  for (const item of locationDistances) {
    if (item.dist < nearestDistance) {
      nearestDistance = item.dist;
      nearestLocation = item.loc;
    }
  }

  // Check if accuracy is available and valid
  const isAccuracyValid =
    typeof accuracy === 'number' && !isNaN(accuracy) && accuracy >= 0;

  if (!isAccuracyValid) {
    return {
      status: 'uncertain',
      matchedLocation: null,
      nearestLocation,
      nearestDistanceMeters: Math.round(nearestDistance),
      userCoords: { latitude: userLat, longitude: userLng, accuracy },
      errorMessage: 'Akurasi GPS tidak valid — perbarui lokasi',
      checkedAt: new Date(),
    };
  }

  const acc = accuracy as number;

  // Condition 1: 'in_radius'
  // At least one location satisfies: (distance + accuracy <= radiusMeters)
  let bestMatchedLocation: LocationModel | null = null;
  let bestMatchedDistance: number | null = null;

  for (const item of locationDistances) {
    if (item.dist + acc <= item.loc.radiusMeters) {
      if (bestMatchedDistance === null || item.dist < bestMatchedDistance) {
        bestMatchedDistance = item.dist;
        bestMatchedLocation = item.loc;
      }
    }
  }

  if (bestMatchedLocation) {
    return {
      status: 'in_radius',
      matchedLocation: bestMatchedLocation,
      nearestLocation,
      nearestDistanceMeters: Math.round(bestMatchedDistance!),
      userCoords: { latitude: userLat, longitude: userLng, accuracy: acc },
      checkedAt: new Date(),
    };
  }

  // Condition 2: 'out_of_radius'
  // For ALL valid active locations: (distance - accuracy > radiusMeters)
  const allConfidentlyOutOfRadius = locationDistances.every(
    (item) => item.dist - acc > item.loc.radiusMeters
  );

  if (allConfidentlyOutOfRadius) {
    return {
      status: 'out_of_radius',
      matchedLocation: null,
      nearestLocation,
      nearestDistanceMeters: Math.round(nearestDistance),
      userCoords: { latitude: userLat, longitude: userLng, accuracy: acc },
      checkedAt: new Date(),
    };
  }

  // Condition 3: 'uncertain' (Posisi belum dapat dipastikan)
  return {
    status: 'uncertain',
    matchedLocation: null,
    nearestLocation,
    nearestDistanceMeters: Math.round(nearestDistance),
    userCoords: { latitude: userLat, longitude: userLng, accuracy: acc },
    errorMessage: `Akurasi GPS (±${formatDistanceDisplay(acc)}) belum memadai — lokasi belum dapat dipastikan`,
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
