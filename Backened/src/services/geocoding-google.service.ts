import axios from "axios";
import logger from "../config/logger";

// Google Maps Geocoding API key
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyAhVSa9dUXWZVG9wKlDPM-3LNg1U84unz8";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode any location using Google Maps Geocoding API
 * Works for villages, towns, wards, etc.
 */
export const geocodeLocation = async (
  locationName: string,
  subdistrictName?: string,
  districtName?: string,
  stateName?: string
): Promise<GeocodeResult | null> => {
  try {
    // Clean location name - remove administrative suffixes
    const cleanName = locationName
      .replace(/\s*\(NP\)\s*/gi, '')     // Remove (NP) - Nagar Panchayat
      .replace(/\s*\(NPP\)\s*/gi, '')    // Remove (NPP) - Nagar Palika Parishad
      .replace(/\s*\(MB\)\s*/gi, '')     // Remove (MB) - Municipal Board
      .trim();

    // Build search query with hierarchy
    const queryParts = [cleanName];
    if (subdistrictName) queryParts.push(subdistrictName);
    if (districtName) queryParts.push(districtName);
    if (stateName) queryParts.push(stateName);
    queryParts.push("India");
    
    const query = queryParts.join(", ");

    logger.info(`Google Maps geocoding: ${query}`);

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: query,
          key: GOOGLE_MAPS_API_KEY,
          region: 'in',  // Prefer India results
        },
      }
    );

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const result = response.data.results[0];
      logger.info(`✅ Geocoded: ${locationName} → ${result.geometry.location.lat}, ${result.geometry.location.lng}`);
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    if (response.data.status === "ZERO_RESULTS") {
      logger.warn(`❌ No results found for: ${query}`);
    } else if (response.data.status === "REQUEST_DENIED") {
      logger.error(
        `Google Maps API REQUEST_DENIED for: ${query}. ` +
        `Error: ${response.data.error_message || 'No error message'}. ` +
        `Please check: 1) API key is valid, 2) Geocoding API is enabled, 3) Billing is enabled`
      );
    } else if (response.data.status === "OVER_QUERY_LIMIT") {
      logger.error(`Google Maps API quota exceeded. Please wait or upgrade your plan.`);
    } else {
      logger.warn(
        `Geocoding failed for: ${query}, status: ${response.data.status}, ` +
        `message: ${response.data.error_message || 'N/A'}`
      );
    }

    return null;
  } catch (error: any) {
    logger.error(`Error geocoding location ${locationName}:`, error.message);
    return null;
  }
};

/**
 * Geocode a town using Google Maps
 */
export const geocodeTown = async (
  townName: string,
  subdistrictName: string
): Promise<GeocodeResult | null> => {
  return await geocodeLocation(townName, subdistrictName, "Budaun", "Uttar Pradesh");
};

/**
 * Geocode a village using Google Maps
 */
export const geocodeVillage = async (
  villageName: string,
  subdistrictName: string
): Promise<GeocodeResult | null> => {
  return await geocodeLocation(villageName, subdistrictName, "Budaun", "Uttar Pradesh");
};

/**
 * Geocode a ward using Google Maps
 */
export const geocodeWard = async (
  wardName: string,
  subdistrictName: string
): Promise<GeocodeResult | null> => {
  return await geocodeLocation(wardName, subdistrictName, "Budaun", "Uttar Pradesh");
};

export default {
  geocodeLocation,
  geocodeTown,
  geocodeVillage,
  geocodeWard,
};

