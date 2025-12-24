import axios from "axios";
import Village from "../models/Village";
import logger from "../config/logger";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode a village using OpenStreetMap Nominatim (FREE alternative)
 * No API key required, completely free
 */
export const geocodeVillageNominatim = async (
  villageName: string,
  subdistrictName: string,
  districtName: string,
  stateName: string
): Promise<GeocodeResult | null> => {
  try {
    // Build search query
    const query = `${villageName}, ${subdistrictName}, ${districtName}, ${stateName}, India`;

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          limit: 1,
          countrycodes: "in", // Restrict to India
        },
        headers: {
          "User-Agent": "GrievanceAidApp/1.0 (Badaun Village Mapping)",
        },
      }
    );

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };
    }

    logger.warn(`No results found for: ${query}`);
    return null;
  } catch (error: any) {
    logger.error(`Error geocoding village ${villageName}:`, error.message);
    return null;
  }
};

/**
 * Geocode all villages using FREE Nominatim API
 * Rate limit: 1 request per second (strictly enforced)
 */
export const geocodeAllVillagesNominatim = async (
  batchSize: number = 10,
  delayMs: number = 1100 // Nominatim requires 1 second between requests
): Promise<{ success: number; failed: number }> => {
  let successCount = 0;
  let failedCount = 0;

  try {
    const villages = await Village.find({ isGeocoded: false }).limit(batchSize);

    logger.info(
      `Starting FREE Nominatim geocoding for ${villages.length} villages`
    );

    for (const village of villages) {
      try {
        const result = await geocodeVillageNominatim(
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

        // IMPORTANT: Nominatim requires 1 second between requests
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
      `Nominatim geocoding batch complete. Success: ${successCount}, Failed: ${failedCount}`
    );
    return { success: successCount, failed: failedCount };
  } catch (error: any) {
    logger.error("Error in geocodeAllVillagesNominatim:", error.message);
    throw error;
  }
};

export const getVillagesGeoJSON = async (districtLgd: number) => {
  try {
    const villages = await Village.find({
      districtLgd,
      isGeocoded: true,
    }).sort({ villageName: 1 });

    const geoJSON = {
      type: "FeatureCollection",
      features: villages.map((village) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(village.longitude), Number(village.latitude)],
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

