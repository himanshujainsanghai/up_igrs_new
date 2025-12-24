import axios from "axios";
import Village from "../models/Village";
import logger from "../config/logger";

// Google Maps Geocoding API key (same as frontend)
const GOOGLE_MAPS_API_KEY = "AIzaSyAhVSa9dUXWZVG9wKlDPM-3LNg1U84unz8";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode a village using Google Maps Geocoding API
 */
export const geocodeVillage = async (
  villageName: string,
  subdistrictName: string,
  districtName: string,
  stateName: string
): Promise<GeocodeResult | null> => {
  try {
    // Build search query
    const query = `${villageName}, ${subdistrictName}, ${districtName}, ${stateName}, India`;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: query,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    if (response.data.status === "ZERO_RESULTS") {
      logger.warn(`No results found for: ${query}`);
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
    logger.error(`Error geocoding village ${villageName}:`, error.message);
    return null;
  }
};

/**
 * Geocode all villages in the database that haven't been geocoded yet
 * Uses batch processing to avoid hitting API rate limits
 */
export const geocodeAllVillages = async (
  batchSize: number = 10,
  delayMs: number = 1000
): Promise<{ success: number; failed: number }> => {
  let successCount = 0;
  let failedCount = 0;

  try {
    // Get all non-geocoded villages
    const villages = await Village.find({ isGeocoded: false }).limit(batchSize);

    logger.info(`Starting geocoding for ${villages.length} villages`);

    for (const village of villages) {
      try {
        const result = await geocodeVillage(
          village.villageName,
          village.subdistrictName,
          village.districtName,
          village.stateName
        );

        if (result) {
          village.latitude = result.latitude;
          village.longitude = result.longitude;
          village.isGeocoded = true;
          await village.save();
          successCount++;
          logger.info(
            `Geocoded: ${village.villageName} -> ${result.latitude}, ${result.longitude}`
          );
        } else {
          failedCount++;
          logger.warn(`Failed to geocode: ${village.villageName}`);
        }

        // Delay to avoid hitting rate limits (Google Maps allows 50 req/sec)
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error: any) {
        failedCount++;
        logger.error(
          `Error processing village ${village.villageName}:`,
          error.message
        );
      }
    }

    logger.info(
      `Geocoding batch complete. Success: ${successCount}, Failed: ${failedCount}`
    );
    return { success: successCount, failed: failedCount };
  } catch (error: any) {
    logger.error("Error in geocodeAllVillages:", error.message);
    throw error;
  }
};

/**
 * Get villages as GeoJSON for a specific district
 */
export const getVillagesGeoJSON = async (districtLgd: number) => {
  try {
    const villages = await Village.find({
      districtLgd,
      isGeocoded: true,
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
    }).sort({ villageName: 1 });

    // Convert to GeoJSON format
    const geoJSON = {
      type: "FeatureCollection",
      features: villages.map((village) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            Number(village.longitude),
            Number(village.latitude),
          ],
        },
        properties: {
          name: village.villageName,
          lgdCode: village.lgdCode,
          subdistrictName: village.subdistrictName,
          districtName: village.districtName,
          population: village.population,
          area: village.area,
          sarpanch: village.sarpanch,
          poiType: "Village",
          Type: "Village",
        },
      })),
    };

    return geoJSON;
  } catch (error: any) {
    logger.error("Error generating villages GeoJSON:", error.message);
    throw error;
  }
};

/**
 * Get village statistics
 */
export const getVillageStatistics = async (districtLgd?: number) => {
  try {
    const filter: any = {};
    if (districtLgd) {
      filter.districtLgd = districtLgd;
    }

    const totalVillages = await Village.countDocuments(filter);
    const geocodedVillages = await Village.countDocuments({
      ...filter,
      isGeocoded: true,
    });
    const pendingVillages = totalVillages - geocodedVillages;

    return {
      total: totalVillages,
      geocoded: geocodedVillages,
      pending: pendingVillages,
      percentageComplete:
        totalVillages > 0 ? (geocodedVillages / totalVillages) * 100 : 0,
    };
  } catch (error: any) {
    logger.error("Error getting village statistics:", error.message);
    throw error;
  }
};

