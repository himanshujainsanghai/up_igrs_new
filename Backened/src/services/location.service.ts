/**
 * Location Service
 * Handles reverse geocoding and location validation
 */

import { env } from '../config/env';
import logger from '../config/logger';

// LocationIQ API configuration (or use any geocoding service)
const LOCATIONIQ_API_KEY = env.LOCATIONIQ_API_KEY || '';
const LOCATIONIQ_API_URL = 'https://us1.locationiq.com/v1';

/**
 * Reverse geocode coordinates to address
 */
export interface ReverseGeocodeOptions {
  lat: number;
  lon: number;
}

export interface ReverseGeocodeResult {
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    formatted_address: string;
  };
  coordinates: {
    lat: number;
    lon: number;
  };
}

export const reverseGeocode = async (
  options: ReverseGeocodeOptions
): Promise<ReverseGeocodeResult> => {
  try {
    const { lat, lon } = options;

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
    }

    // If LocationIQ API key is not set, return mock data for development
    if (!LOCATIONIQ_API_KEY) {
      logger.warn('LocationIQ API key not set. Using mock data for reverse geocoding.');
      return {
        address: {
          formatted_address: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
          city: 'Unknown',
          state: 'Unknown',
          country: 'India',
        },
        coordinates: { lat, lon },
      };
    }

    // Call LocationIQ Reverse Geocoding API
    const url = `${LOCATIONIQ_API_URL}/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      address?: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
        country?: string;
      };
      lat: string | number;
      lon: string | number;
    };

    // Format address
    const address = data.address || {};
    const formattedAddress = [
      address.house_number,
      address.road,
      address.suburb,
      address.city,
      address.state,
      address.postcode,
      address.country,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      address: {
        house_number: address.house_number,
        road: address.road,
        suburb: address.suburb,
        city: address.city || address.town || address.village,
        state: address.state,
        postcode: address.postcode,
        country: address.country,
        formatted_address: formattedAddress || `${lat}, ${lon}`,
      },
      coordinates: {
        lat: parseFloat(String(data.lat)),
        lon: parseFloat(String(data.lon)),
      },
    };
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    throw new Error(
      `Failed to reverse geocode: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Forward geocode address to coordinates
 */
export interface ForwardGeocodeOptions {
  address: string;
  limit?: number;
}

export interface ForwardGeocodeResult {
  coordinates: {
    lat: number;
    lon: number;
  };
  address: {
    formatted_address: string;
    city?: string;
    state?: string;
    country?: string;
  };
  confidence: number;
}

export const forwardGeocode = async (
  options: ForwardGeocodeOptions
): Promise<ForwardGeocodeResult[]> => {
  try {
    const { address, limit = 5 } = options;

    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }

    // If LocationIQ API key is not set, return empty results
    if (!LOCATIONIQ_API_KEY) {
      logger.warn('LocationIQ API key not set. Forward geocoding unavailable.');
      return [];
    }

    // Call LocationIQ Forward Geocoding API
    const encodedAddress = encodeURIComponent(address);
    const url = `${LOCATIONIQ_API_URL}/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodedAddress}&format=json&limit=${limit}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle single result or array of results
    const results = Array.isArray(data) ? data : [data];

    return results.map((item: any) => {
      const addressParts = item.address || {};
      const formattedAddress = [
        addressParts.house_number,
        addressParts.road,
        addressParts.suburb,
        addressParts.city || addressParts.town || addressParts.village,
        addressParts.state,
        addressParts.postcode,
        addressParts.country,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        coordinates: {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        },
        address: {
          formatted_address: formattedAddress || item.display_name,
          city: addressParts.city || addressParts.town || addressParts.village,
          state: addressParts.state,
          country: addressParts.country,
        },
        confidence: item.importance || 0.5, // LocationIQ importance score (0-1)
      };
    });
  } catch (error) {
    logger.error('Forward geocoding error:', error);
    throw new Error(
      `Failed to geocode address: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Validate location coordinates
 */
export interface ValidateLocationOptions {
  lat?: number;
  lon?: number;
  address?: string;
}

export interface ValidateLocationResult {
  valid: boolean;
  coordinates?: {
    lat: number;
    lon: number;
  };
  address?: string;
  error?: string;
}

export const validateLocation = async (
  options: ValidateLocationOptions
): Promise<ValidateLocationResult> => {
  try {
    const { lat, lon, address } = options;

    // Validate coordinates if provided
    if (lat !== undefined && lon !== undefined) {
      if (lat < -90 || lat > 90) {
        return {
          valid: false,
          error: 'Invalid latitude. Must be between -90 and 90.',
        };
      }

      if (lon < -180 || lon > 180) {
        return {
          valid: false,
          error: 'Invalid longitude. Must be between -180 and 180.',
        };
      }

      // If address is also provided, reverse geocode to verify
      if (address) {
        try {
          const geocodeResult = await reverseGeocode({ lat, lon });
          return {
            valid: true,
            coordinates: { lat, lon },
            address: geocodeResult.address.formatted_address,
          };
        } catch (error) {
          return {
            valid: true, // Coordinates are valid even if geocoding fails
            coordinates: { lat, lon },
            address,
          };
        }
      }

      return {
        valid: true,
        coordinates: { lat, lon },
      };
    }

    // Validate address if provided
    if (address) {
      if (address.trim().length < 5) {
        return {
          valid: false,
          error: 'Address must be at least 5 characters long.',
        };
      }

      try {
        const geocodeResults = await forwardGeocode({ address, limit: 1 });
        if (geocodeResults.length > 0) {
          return {
            valid: true,
            coordinates: geocodeResults[0].coordinates,
            address: geocodeResults[0].address.formatted_address,
          };
        }
      } catch (error) {
        // Address format might be valid even if geocoding fails
        return {
          valid: true,
          address,
        };
      }

      return {
        valid: true,
        address,
      };
    }

    return {
      valid: false,
      error: 'Either coordinates (lat, lon) or address must be provided.',
    };
  } catch (error) {
    logger.error('Location validation error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export interface CalculateDistanceOptions {
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
  unit?: 'km' | 'miles';
}

export const calculateDistance = (options: CalculateDistanceOptions): number => {
  const { lat1, lon1, lat2, lon2, unit = 'km' } = options;

  const R = unit === 'km' ? 6371 : 3959; // Earth radius in km or miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

export default {
  reverseGeocode,
  forwardGeocode,
  validateLocation,
  calculateDistance,
};

