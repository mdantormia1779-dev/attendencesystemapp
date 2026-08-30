/**
 * Geolocation & Geofencing Calculation Utilities
 * Implements Haversine distance metric for office perimeter validation.
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeofenceValidationResult {
  isInside: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  accuracyMeters?: number;
}

/**
 * Calculates Haversine distance in meters between two GPS coordinates (lat1, lng1) and (lat2, lng2)
 */
export function calculateHaversineDistance(
  coord1: GeoCoordinate,
  coord2: GeoCoordinate
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Validates whether user GPS location falls within designated branch geofence perimeter
 */
export function validateGeofence(
  userCoord: GeoCoordinate,
  branchCoord: GeoCoordinate = { latitude: 23.8103, longitude: 90.4125 },
  allowedRadiusMeters: number = 120,
  accuracyMeters?: number
): GeofenceValidationResult {
  const distanceMeters = calculateHaversineDistance(userCoord, branchCoord);
  // Account for GPS positioning accuracy margin (e.g. indoor drift or high-rise reflection)
  const accuracyBuffer = Math.min(Math.max(accuracyMeters || 10, 0), 50);
  const effectiveRadius = allowedRadiusMeters + accuracyBuffer;
  const isInside = distanceMeters <= effectiveRadius;

  return {
    isInside,
    distanceMeters,
    allowedRadiusMeters,
    accuracyMeters,
  };
}
