/**
 * Boundary Validation Utilities
 * Validates if coordinates are within Budaun district bounds
 */

// Budaun District ACTUAL bounds
// Calculated from badaun.ervc.geojson file
// These are the precise boundaries from the GeoJSON polygons
const BUDAUN_BOUNDS = {
  north: 28.52,  // Actual: 28.472255° + buffer
  south: 27.61,  // Actual: 27.657804° - buffer
  east: 79.56,   // Actual: 79.510041° + buffer
  west: 78.52,   // Actual: 78.571968° - buffer (was 78.35° - too loose!)
};

// More strict bounds for better accuracy
const BUDAUN_STRICT_BOUNDS = {
  north: 28.5,
  south: 27.8,
  east: 79.45,
  west: 78.35,
};

/**
 * Check if coordinates are within Budaun district bounds
 */
export function isWithinBudaunBounds(
  latitude: number,
  longitude: number,
  strict: boolean = false
): boolean {
  const bounds = strict ? BUDAUN_STRICT_BOUNDS : BUDAUN_BOUNDS;
  
  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

/**
 * Validate geocoding result for Budaun district
 */
export function validateBudaunLocation(
  latitude: number,
  longitude: number,
  locationName: string
): { valid: boolean; reason?: string } {
  // Check if within bounds
  if (!isWithinBudaunBounds(latitude, longitude)) {
    return {
      valid: false,
      reason: `Coordinates (${latitude}, ${longitude}) are outside Budaun district bounds. May be a different location with the same name.`
    };
  }
  
  // Check if coordinates are not 0,0 (invalid)
  if (latitude === 0 && longitude === 0) {
    return {
      valid: false,
      reason: "Coordinates are 0,0 (invalid)"
    };
  }
  
  // Check if coordinates are valid numbers
  if (isNaN(latitude) || isNaN(longitude)) {
    return {
      valid: false,
      reason: "Coordinates are not valid numbers"
    };
  }
  
  return { valid: true };
}

/**
 * Get district bounds for display
 */
export function getBudaunBounds() {
  return BUDAUN_BOUNDS;
}

export default {
  isWithinBudaunBounds,
  validateBudaunLocation,
  getBudaunBounds,
};

