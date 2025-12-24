import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/response";
import { ValidationError } from "../utils/errors";
import logger from "../config/logger";
import Demographics from "../models/Demographics";
import { geocodeLocation } from "../services/geocoding-google.service";
import { validateBudaunLocation } from "../utils/boundary-validation";

/**
 * Geocoding Controller
 * Handles geocoding requests for villages, towns, and wards
 */

/**
 * POST /api/v1/demographics/geocode-towns
 * Geocode towns using Nominatim API
 */
export const geocodeTowns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchSize = 10 } = req.body;

    // Get towns that need geocoding (those without coordinates)
    const towns = await Demographics.find({
      level: "town",
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null }
      ]
    }).limit(parseInt(String(batchSize)));

    logger.info(`Starting geocoding for ${towns.length} towns`);

    let successCount = 0;
    let failedCount = 0;

    for (const town of towns) {
      try {
        // Clean town name - remove administrative suffixes
        const cleanName = town.areaName
          ?.replace(/\s*\(NP\)\s*/gi, '')     // Remove (NP) - Nagar Panchayat
          ?.replace(/\s*\(NPP\)\s*/gi, '')    // Remove (NPP) - Nagar Palika Parishad
          ?.replace(/\s*\(MB\)\s*/gi, '')     // Remove (MB) - Municipal Board
          ?.trim() || town.areaName;
        
        logger.info(`Attempting to geocode: ${town.areaName} → Cleaned: ${cleanName}`);
        
        // Use Google Maps Geocoding API for better accuracy
        const result = await geocodeLocation(
          cleanName || "Unknown",
          town.subdistrict || "Unknown",
          "Budaun",
          "Uttar Pradesh"
        );

        if (result) {
          // Validate coordinates are within Budaun district
          const validation = validateBudaunLocation(
            result.latitude,
            result.longitude,
            town.areaName || "Unknown"
          );
          
          if (validation.valid) {
            // Update town with coordinates
            await Demographics.updateOne(
              { _id: town._id },
              {
                $set: {
                  latitude: result.latitude,
                  longitude: result.longitude,
                  isGeocoded: true
                }
              }
            );
            
            successCount++;
            logger.info(`✅ Geocoded town: ${town.areaName} -> ${result.latitude}, ${result.longitude}`);
          } else {
            failedCount++;
            logger.warn(`❌ Rejected ${town.areaName}: ${validation.reason}`);
          }
        } else {
          failedCount++;
          logger.warn(`Failed to geocode town: ${town.areaName}`);
        }

        // Small delay to avoid overwhelming API (Google Maps allows 50 req/sec)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        failedCount++;
        logger.error(`Error geocoding town ${town.areaName}:`, error.message);
      }
    }

    logger.info(`Town geocoding complete. Success: ${successCount}, Failed: ${failedCount}`);

    sendSuccess(res, {
      success: successCount,
      failed: failedCount,
      total: towns.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/demographics/geocode-wards
 * Geocode wards using Nominatim API
 */
export const geocodeWards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchSize = 10 } = req.body;

    // Get wards that need geocoding
    const wards = await Demographics.find({
      level: "ward",
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null }
      ]
    }).limit(parseInt(String(batchSize)));

    logger.info(`Starting geocoding for ${wards.length} wards`);

    let successCount = 0;
    let failedCount = 0;

    for (const ward of wards) {
      try {
        // Use Google Maps for wards too
        const result = await geocodeLocation(
          ward.areaName || "Unknown",
          ward.subdistrict || "Unknown",
          "Budaun",
          "Uttar Pradesh"
        );

        if (result) {
          // Validate coordinates are within Budaun district
          const validation = validateBudaunLocation(
            result.latitude,
            result.longitude,
            ward.areaName || "Unknown"
          );
          
          if (validation.valid) {
            await Demographics.updateOne(
              { _id: ward._id },
              {
                $set: {
                  latitude: result.latitude,
                  longitude: result.longitude,
                  isGeocoded: true
                }
              }
            );
            
            successCount++;
            logger.info(`✅ Geocoded ward: ${ward.areaName} -> ${result.latitude}, ${result.longitude}`);
          } else {
            failedCount++;
            logger.warn(`❌ Rejected ${ward.areaName}: ${validation.reason}`);
          }
        } else {
          failedCount++;
          logger.warn(`Failed to geocode ward: ${ward.areaName}`);
        }

        // Small delay for Google Maps (50 req/sec allowed)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        failedCount++;
        logger.error(`Error geocoding ward ${ward.areaName}:`, error.message);
      }
    }

    logger.info(`Ward geocoding complete. Success: ${successCount}, Failed: ${failedCount}`);

    sendSuccess(res, {
      success: successCount,
      failed: failedCount,
      total: wards.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/geocoding-status
 * Get geocoding status for all levels
 */
export const getGeocodingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Count geocoded vs not geocoded for each level
    const [
      villagesTotal,
      villagesGeocoded,
      townsTotal,
      townsGeocoded,
      wardsTotal,
      wardsGeocoded
    ] = await Promise.all([
      Demographics.countDocuments({ level: "village" }),
      Demographics.countDocuments({ level: "village", latitude: { $exists: true, $ne: null } }),
      Demographics.countDocuments({ level: "town" }),
      Demographics.countDocuments({ level: "town", latitude: { $exists: true, $ne: null } }),
      Demographics.countDocuments({ level: "ward" }),
      Demographics.countDocuments({ level: "ward", latitude: { $exists: true, $ne: null } })
    ]);

    const status = {
      villages: {
        total: villagesTotal,
        geocoded: villagesGeocoded,
        pending: villagesTotal - villagesGeocoded,
        percentage: villagesTotal > 0 ? ((villagesGeocoded / villagesTotal) * 100).toFixed(1) : 0
      },
      towns: {
        total: townsTotal,
        geocoded: townsGeocoded,
        pending: townsTotal - townsGeocoded,
        percentage: townsTotal > 0 ? ((townsGeocoded / townsTotal) * 100).toFixed(1) : 0
      },
      wards: {
        total: wardsTotal,
        geocoded: wardsGeocoded,
        pending: wardsTotal - wardsGeocoded,
        percentage: wardsTotal > 0 ? ((wardsGeocoded / wardsTotal) * 100).toFixed(1) : 0
      },
      overall: {
        total: villagesTotal + townsTotal + wardsTotal,
        geocoded: villagesGeocoded + townsGeocoded + wardsGeocoded,
        pending: (villagesTotal - villagesGeocoded) + (townsTotal - townsGeocoded) + (wardsTotal - wardsGeocoded)
      }
    };

    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
};

