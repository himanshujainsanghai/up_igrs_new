import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { HeatMap } from "../models/HeatMap";
import { sendSuccess } from "../utils/response";
import { NotFoundError } from "../utils/errors";
import logger from "../config/logger";

/**
 * Geo Controller
 * Handles geographic data operations
 */

/**
 * GET /api/v1/geo/uttarpradesh
 * Get Uttar Pradesh GeoJSON data
 */
export const getUPGeoJson = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filePath = path.join(__dirname, "../assets/UttarPradesh.geo.json");

    if (!fs.existsSync(filePath)) {
      throw new Error("Uttar Pradesh GeoJSON file not found");
    }

    const geoData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    logger.info("Uttar Pradesh GeoJSON data fetched");

    sendSuccess(res, geoData);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/geo/badaun
 * Get Badaun district GeoJSON data
 */
export const getBadaunGeoJson = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filePath = path.join(
      __dirname,
      "../assets/districts/badaun/badaun.ervc.geojson"
    );

    if (!fs.existsSync(filePath)) {
      throw new Error("Badaun GeoJSON file not found");
    }

    const geoData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    logger.info("Badaun GeoJSON data fetched");

    sendSuccess(res, geoData);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/geo/heatmap/districts
 * Get all districts with heat map values
 * Returns array of districts with districtCode, districtName, and heatValue
 */
export const getAllDistrictsHeatMap = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch all heat map entries, including totalComplaints for labels
    const districts = await HeatMap.find({})
      .select("districtCode districtName heatValue state totalComplaints")
      .lean()
      .sort({ districtName: 1 });

    // Transform to simplified format
    let districtsData = districts.map((district) => ({
      districtCode: district.districtCode,
      districtName: district.districtName,
      heatValue: district.heatValue,
      state: district.state || "Uttar Pradesh",
      totalComplaints: district.totalComplaints || 0, // Include totalComplaints for map labels
    }));

    // Check if Badaun/Budaun exists in heat map data
    const badaunInHeatMap = districtsData.find(
      (d) => d.districtCode.toLowerCase() === "badaun" || d.districtCode.toLowerCase() === "budaun"
    );

    // If Badaun is not in heat map, calculate from complaints
    if (!badaunInHeatMap) {
      try {
        const { Complaint } = await import("../models/Complaint");
        // Count all complaints for Badaun district (handles both spellings)
        const badaunComplaintCount = await Complaint.countDocuments({
          $or: [
            { district_name: "Badaun" },
            { district_name: "Budaun" },
          ],
        });

        // Add Badaun to the districts data
        districtsData.push({
          districtCode: "Badaun",
          districtName: "Badaun",
          heatValue: badaunComplaintCount, // Use complaint count as heat value
          state: "Uttar Pradesh",
          totalComplaints: badaunComplaintCount,
        });

        logger.info(
          `Added Badaun district with ${badaunComplaintCount} complaints (calculated from complaints collection)`
        );
      } catch (complaintError: any) {
        logger.warn(
          `Could not calculate Badaun complaints: ${complaintError.message}`
        );
        // Add Badaun with 0 complaints if calculation fails
        districtsData.push({
          districtCode: "Badaun",
          districtName: "Badaun",
          heatValue: 0,
          state: "Uttar Pradesh",
          totalComplaints: 0,
        });
      }
    } else {
      // If Badaun exists but totalComplaints is 0 or missing, recalculate
      if (!badaunInHeatMap.totalComplaints || badaunInHeatMap.totalComplaints === 0) {
        try {
          const { Complaint } = await import("../models/Complaint");
          const badaunComplaintCount = await Complaint.countDocuments({
            $or: [
              { district_name: "Badaun" },
              { district_name: "Budaun" },
            ],
          });

          // Update the existing entry
          const badaunIndex = districtsData.findIndex(
            (d) => d.districtCode.toLowerCase() === "badaun" || d.districtCode.toLowerCase() === "budaun"
          );
          if (badaunIndex !== -1) {
            districtsData[badaunIndex].totalComplaints = badaunComplaintCount;
            districtsData[badaunIndex].heatValue = badaunComplaintCount || districtsData[badaunIndex].heatValue;
          }

          logger.info(
            `Updated Badaun district with ${badaunComplaintCount} complaints (calculated from complaints collection)`
          );
        } catch (complaintError: any) {
          logger.warn(
            `Could not recalculate Badaun complaints: ${complaintError.message}`
          );
        }
      }
    }

    logger.info(
      `Fetched ${districtsData.length} districts with heat map values`
    );

    sendSuccess(res, {
      count: districtsData.length,
      districts: districtsData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/geo/heatmap/:districtCode
 * Get complete heat map data for a specific district
 * Returns all heat map data associated with the districtCode
 */
export const getDistrictHeatMapById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { districtCode } = req.params;

    if (!districtCode) {
      throw new NotFoundError("District");
    }

    // Fetch complete heat map data for the district
    const heatMapData = await HeatMap.findOne({
      districtCode: districtCode,
    }).lean();

    if (!heatMapData) {
      throw new NotFoundError("District heat map data");
    }

    logger.info(`Fetched heat map data for district: ${districtCode}`);

    sendSuccess(res, heatMapData);
  } catch (error) {
    next(error);
  }
};

/**
 * Convert EsriJSON to GeoJSON FeatureCollection
 * Handles multiple formats:
 * 1. Direct GeoJSON FeatureCollection
 * 2. Nested array with FeatureCollection
 * 3. Elasticsearch format with _source
 */
const convertEsriJsonToGeoJson = (esriJsonData: any): any => {
  // If it's already a FeatureCollection, return it directly
  if (esriJsonData.type === 'FeatureCollection' && Array.isArray(esriJsonData.features)) {
    return esriJsonData;
  }

  const features: any[] = [];

  // Handle nested array structure (common in Esri/Elasticsearch exports)
  if (Array.isArray(esriJsonData)) {
    esriJsonData.forEach((outerItem: any) => {
      // Handle case where outer array contains FeatureCollection directly
      if (outerItem && outerItem.type === 'FeatureCollection' && Array.isArray(outerItem.features)) {
        features.push(...outerItem.features);
        return;
      }

      // Handle case where outer array contains arrays of items
      if (Array.isArray(outerItem)) {
        outerItem.forEach((item: any) => {
          // Handle nested FeatureCollection
          if (item && item.type === 'FeatureCollection' && Array.isArray(item.features)) {
            features.push(...item.features);
            return;
          }

          // Handle Elasticsearch _source format
          const source = item._source || item;
          
          if (source) {
            // Handle GeoJSON feature
            if (source.type === 'Feature' && source.geometry) {
              features.push({
                type: 'Feature',
                geometry: source.geometry,
                properties: {
                  ...source.properties,
                  name: source.properties?.Asset_Name || source.properties?.name || source.properties?.NAME || null,
                  Asset_Name: source.properties?.Asset_Name || null,
                  poiType: source.properties?.Type || null,
                  Type: source.properties?.Type || null,
                },
              });
              return;
            }

            // Handle direct geometry with coordinates
            if (source.geometry || (source.lat && source.long)) {
              const geometry = source.geometry || {
                type: 'Point',
                coordinates: [source.long, source.lat],
              };

              if (geometry.coordinates) {
                const properties = { ...source };
                delete properties.geometry;
                delete properties.lat;
                delete properties.long;

                features.push({
                  type: 'Feature',
                  geometry,
                  properties: {
                    ...properties,
                    name: properties.Asset_Name || properties.name || properties.NAME || null,
                    Asset_Name: properties.Asset_Name || null,
                    poiType: properties.Type || null,
                    Type: properties.Type || null,
                  },
                });
              }
            }
          }
        });
      }
      // Handle direct _source items
      else if (outerItem && outerItem._source) {
        const source = outerItem._source;
        if (source.geometry || (source.lat && source.long)) {
          const geometry = source.geometry || {
            type: 'Point',
            coordinates: [source.long, source.lat],
          };
          
          const properties = { ...source };
          delete properties.geometry;
          delete properties.lat;
          delete properties.long;

          features.push({
            type: 'Feature',
            geometry,
            properties: {
              ...properties,
              name: properties.Asset_Name || properties.name || properties.NAME || null,
              Asset_Name: properties.Asset_Name || null,
              poiType: properties.Type || null,
              Type: properties.Type || null,
            },
          });
        }
      }
    });
  }

  return {
    type: 'FeatureCollection',
    features: features,
  };
};

/**
 * GET /api/v1/geo/:district/:poi
 * Get Points of Interest (POI) data for a specific district
 * 
 * @param district - District name (e.g., "badaun")
 * @param poi - POI type (e.g., "adhq" or "india-assets")
 * 
 * Returns GeoJSON FeatureCollection of POI locations
 */
export const getDistrictPOI = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { district, poi } = req.params;

    if (!district || !poi) {
      throw new NotFoundError("District or POI type");
    }

    // Normalize district name to lowercase for file path
    const districtLower = district.toLowerCase();

    // Validate POI type
    const validPOITypes = ["adhq", "india-assets"];
    if (!validPOITypes.includes(poi.toLowerCase())) {
      throw new NotFoundError(
        `POI type. Valid types: ${validPOITypes.join(", ")}`
      );
    }

    // Construct file path based on POI type
    let fileName: string;
    if (poi.toLowerCase() === "adhq") {
      fileName = "adhq.esri.json";
    } else if (poi.toLowerCase() === "india-assets") {
      fileName = "indiaAssets.esri.json";
    } else {
      throw new NotFoundError("POI type");
    }

    const filePath = path.join(
      __dirname,
      "../assets/districts",
      districtLower,
      poi.toLowerCase() === "india-assets" ? "india-assets" : "adhq",
      fileName
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(
        `POI data file for ${district}/${poi}`
      );
    }

    // Read and parse EsriJSON file
    const esriJsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Convert EsriJSON to GeoJSON FeatureCollection
    const geoJsonData = convertEsriJsonToGeoJson(esriJsonData);

    logger.info(
      `Fetched ${geoJsonData.features.length} POI features for ${district}/${poi}`
    );

    sendSuccess(res, geoJsonData);
  } catch (error) {
    next(error);
  }
};