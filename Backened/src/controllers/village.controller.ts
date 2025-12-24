import { Request, Response, NextFunction } from "express";
import Village from "../models/Village";
import {
  geocodeAllVillages,
  getVillagesGeoJSON,
  getVillageStatistics,
} from "../services/geocoding.service";
import {
  generateAllBadaunVillageBoundaries,
} from "../services/boundary.service";
import { sendSuccess } from "../utils/response";
import logger from "../config/logger";

interface CSVVillageRow {
  sno?: number | string;
  lgdCode: string;
  villageNameEnglish: string;
  villageNameLocal?: string;
  hierarchy: string;
  census2001?: string;
  census2011?: string;
}

/**
 * Extract sub-district name from hierarchy string
 * Example: "Bisauli(Sub-District) / Budaun(District) / Uttar Pradesh(State)"
 */
function extractSubdistrict(hierarchy: string): string {
  const match = hierarchy.match(/^([^(]+)\(Sub-District\)/);
  return match ? match[1].trim() : "";
}

/**
 * Map sub-district names to LGD codes
 */
const subdistrictLGDMap: Record<string, number> = {
  Bilsi: 780,
  Bisauli: 779,
  Budaun: 782,
  Dataganj: 783,
  Sahaswan: 781,
};

/**
 * GET /api/v1/villages/badaun/geojson
 * Get Badaun villages as GeoJSON (points)
 */
export const getBadaunVillagesGeoJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const BADAUN_LGD = 134; // Badaun district LGD code
    const geoJSON = await getVillagesGeoJSON(BADAUN_LGD);

    logger.info(`Returned ${geoJSON.features.length} villages for Badaun`);
    sendSuccess(res, geoJSON);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/badaun/boundaries
 * Get Badaun village boundaries as GeoJSON (polygons)
 */
export const getBadaunVillageBoundaries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const boundaries = await generateAllBadaunVillageBoundaries();

    logger.info(`Returned boundaries for ${boundaries.features.length} villages`);
    sendSuccess(res, boundaries);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/:lgdCode
 * Get village details by LGD code
 */
export const getVillageByLgdCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lgdCode } = req.params;
    
    const Village = require("../models/Village").default;
    const village = await Village.findOne({ lgdCode }).lean();

    if (!village) {
      res.status(404).json({
        success: false,
        error: { message: "Village not found" },
      });
      return;
    }

    logger.info(`Returned village details for LGD: ${lgdCode}`);
    sendSuccess(res, village);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/:lgdCode/complaints
 * Get all complaints for a specific village
 */
export const getVillageComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lgdCode } = req.params;
    
    const { Complaint } = require("../models/Complaint");
    
    const complaints = await Complaint.find({ village_lgd: lgdCode })
      .select("id complaint_id title category sub_category status priority created_at")
      .sort({ created_at: -1 })
      .lean();

    logger.info(`Returned ${complaints.length} complaints for village LGD: ${lgdCode}`);
    sendSuccess(res, { complaints, count: complaints.length });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/:districtLgd/geojson
 * Get villages as GeoJSON for any district
 */
export const getVillagesGeoJSONByDistrict = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const districtLgd = parseInt(req.params.districtLgd);

    if (isNaN(districtLgd)) {
      res.status(400).json({
        success: false,
        error: { message: "Invalid district LGD code" },
      });
      return;
    }

    const geoJSON = await getVillagesGeoJSON(districtLgd);

    logger.info(
      `Returned ${geoJSON.features.length} villages for district ${districtLgd}`
    );
    sendSuccess(res, geoJSON);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/villages/geocode
 * Trigger geocoding for non-geocoded villages using Google Maps API
 */
export const triggerGeocoding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchSize = 10 } = req.body;

    // Use Google Maps Geocoding API
    const result = await geocodeAllVillages(batchSize);

    sendSuccess(res, {
      message: "Geocoding batch completed",
      api: "Google Maps Geocoding API",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/stats
 * Get village statistics (all districts)
 */
export const getVillageStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getVillageStatistics();
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/badaun/stats
 * Get village statistics for Badaun district
 */
export const getBadaunVillageStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const BADAUN_LGD = 134;
    const stats = await getVillageStatistics(BADAUN_LGD);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/villages/test-geocoding
 * Test Google Maps Geocoding API with a sample query
 */
export const testGeocoding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const axios = require("axios");
    const testQuery = "Delhi, India";
    const apiKey = "AIzaSyAhVSa9dUXWZVG9wKlDPM-3LNg1U84unz8";

    logger.info(`Testing geocoding with query: ${testQuery}`);

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: testQuery,
          key: apiKey,
        },
      }
    );

    logger.info(`Geocoding test response status: ${response.data.status}`);
    
    if (response.data.error_message) {
      logger.error(`Geocoding error message: ${response.data.error_message}`);
    }

    sendSuccess(res, {
      testQuery,
      status: response.data.status,
      error_message: response.data.error_message || null,
      results_count: response.data.results?.length || 0,
      first_result: response.data.results?.[0] || null,
      instructions: response.data.status === "REQUEST_DENIED" 
        ? "Enable Geocoding API and Billing in Google Cloud Console"
        : response.data.status === "OK"
        ? "API is working! Issue might be with village names."
        : "Check Google Cloud Console for API status",
    });
  } catch (error: any) {
    logger.error("Error testing geocoding:", error.message);
    next(error);
  }
};

/**
 * GET /api/v1/villages
 * Get all villages with pagination
 */
export const getAllVillages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const villages = await Village.find()
      .limit(limit)
      .skip(skip)
      .sort({ villageName: 1 });

    const total = await Village.countDocuments();

    sendSuccess(res, {
      villages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/villages/upload
 * Upload and import village data from JSON
 * Accepts array of village data in CSV/JSON format
 */
export const uploadVillageData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { villages, districtName = "Budaun", districtLgd = 134 } = req.body;

    if (!villages || !Array.isArray(villages)) {
      res.status(400).json({
        success: false,
        error: {
          message: "Invalid data format. Expected array of villages.",
        },
      });
      return;
    }

    logger.info(`Starting upload of ${villages.length} villages for ${districtName}`);

    let created = 0;
    let existing = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const villageData of villages) {
      try {
        // Extract village information from CSV format (handle multiple column name variations)
        const villageName = 
          villageData.villageNameEnglish || 
          villageData.villageName || 
          villageData["Village Name (In English)"] ||
          villageData["Village Name"];
        
        let lgdCode = 
          villageData.lgdCode || 
          villageData.Village_LGD_Code || 
          villageData["Village LGD Code"] ||
          villageData.VillageLGDCode;
        
        const hierarchy = 
          villageData.hierarchy || 
          villageData.Hierarchy || 
          villageData["Hierarchy"] ||
          "";

        // Clean LGD code (remove slashes and spaces)
        if (lgdCode) {
          lgdCode = String(lgdCode).replace(/\//g, "").replace(/\s/g, "").trim();
        }

        if (!villageName || !lgdCode) {
          failed++;
          const errorMsg = `Missing fields - Name: ${villageName || 'MISSING'}, LGD: ${lgdCode || 'MISSING'}, Row: ${JSON.stringify(villageData).substring(0, 100)}`;
          errors.push(errorMsg);
          logger.warn(errorMsg);
          continue;
        }

        // Extract sub-district from hierarchy
        const subdistrictName = extractSubdistrict(hierarchy) || "Budaun";
        const subdistrictLgd = subdistrictLGDMap[subdistrictName] || 782;

        // Check if village already exists
        const existingVillage = await Village.findOne({ lgdCode });

        if (existingVillage) {
          existing++;
          logger.info(`Already exists: ${villageName} (LGD: ${lgdCode})`);
        } else {
          // Create new village
          await Village.create({
            villageName,
            lgdCode,
            subdistrictName,
            subdistrictLgd,
            districtName,
            districtLgd,
            stateName: "Uttar Pradesh",
            stateLgd: 9,
            isGeocoded: false,
            population: villageData.population || undefined,
            area: villageData.area || undefined,
          });
          created++;
          logger.info(`Created: ${villageName} (LGD: ${lgdCode})`);
        }
      } catch (error: any) {
        failed++;
        errors.push(`Error processing village: ${error.message}`);
        logger.error(`Error processing village:`, error);
      }
    }

    const summary = {
      total: villages.length,
      created,
      existing,
      failed,
      errors: failed > 0 ? errors.slice(0, 10) : [], // Return first 10 errors
    };

    logger.info(`Upload complete: ${created} created, ${existing} existing, ${failed} failed`);

    sendSuccess(res, {
      message: "Village data upload completed",
      summary,
    });
  } catch (error) {
    next(error);
  }
};

