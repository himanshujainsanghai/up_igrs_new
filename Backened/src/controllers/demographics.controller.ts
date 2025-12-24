import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../utils/response";
import { NotFoundError, ValidationError } from "../utils/errors";
import logger from "../config/logger";
import Demographics from "../models/Demographics";
import {
  getDistrictDemographics,
  getSubdistrictDemographics,
  getAllSubdistrictsDemographics,
  getVillageDemographics,
  getVillageDemographicsSummary,
  getTownDemographicsSummary,
  getSubdistrictVillageCount,
  searchVillagesByName,
} from "../utils/demographics.helper";

/**
 * Demographics Controller
 * Handles census demographic data requests
 */

/**
 * GET /api/v1/demographics/district/:districtLgd
 * Get complete demographics for a district (Total, Urban, Rural)
 */
export const getDistrictDemographicsById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { districtLgd } = req.params;

    if (!districtLgd) {
      throw new ValidationError("District LGD is required");
    }

    const lgd = parseInt(districtLgd, 10);
    if (isNaN(lgd)) {
      throw new ValidationError("Invalid district LGD");
    }

    const demographics = await getDistrictDemographics(lgd);

    if (!demographics) {
      throw new NotFoundError("District demographics");
    }

    logger.info(`Fetched demographics for district LGD: ${lgd}`);

    sendSuccess(res, demographics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/subdistrict/:subdistrictLgd
 * Get complete demographics for a subdistrict (Total, Urban, Rural)
 */
export const getSubdistrictDemographicsById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subdistrictLgd } = req.params;

    if (!subdistrictLgd) {
      throw new ValidationError("Subdistrict LGD is required");
    }

    const lgd = parseInt(subdistrictLgd, 10);
    if (isNaN(lgd)) {
      throw new ValidationError("Invalid subdistrict LGD");
    }

    const demographics = await getSubdistrictDemographics(lgd);

    if (!demographics) {
      throw new NotFoundError("Subdistrict demographics");
    }

    logger.info(`Fetched demographics for subdistrict LGD: ${lgd}`);

    sendSuccess(res, demographics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/subdistricts
 * Get demographics for all subdistricts
 */
export const getAllSubdistricts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subdistricts = await getAllSubdistrictsDemographics();

    logger.info(`Fetched demographics for ${subdistricts.length} subdistricts`);

    sendSuccess(res, {
      count: subdistricts.length,
      subdistricts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/village/:villageCode
 * Get demographics for a specific village
 */
export const getVillageDemographicsById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { villageCode } = req.params;

    if (!villageCode) {
      throw new ValidationError("Village code is required");
    }

    const demographics = await getVillageDemographics(villageCode);

    if (!demographics) {
      throw new NotFoundError("Village demographics");
    }

    logger.info(`Fetched demographics for village code: ${villageCode}`);

    sendSuccess(res, demographics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/search/villages?name=...&subdistrictLgd=...
 * Search villages by name
 */
export const searchVillages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, subdistrictLgd } = req.query;

    if (!name || typeof name !== "string") {
      throw new ValidationError("Search name is required");
    }

    const lgd = subdistrictLgd ? parseInt(String(subdistrictLgd), 10) : undefined;

    const villages = await searchVillagesByName(name, lgd);

    logger.info(
      `Searched villages with name: ${name}, found: ${villages.length}`
    );

    sendSuccess(res, {
      count: villages.length,
      villages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/towns?subdistrictLgd=...
 * Get all towns, optionally filtered by subdistrict
 */
export const getTowns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subdistrictLgd } = req.query;

    const query: any = { level: "town" };
    
    if (subdistrictLgd) {
      const lgd = parseInt(String(subdistrictLgd), 10);
      if (!isNaN(lgd)) {
        query.subdistrictLgd = lgd;
      }
    }

    const towns = await Demographics.find(query)
      .select('areaName subdistrictLgd subdistrict totalPopulation totalHouseholds latitude longitude isGeocoded')
      .sort({ totalPopulation: -1 })
      .lean();

    logger.info(
      `Fetched ${towns.length} towns${subdistrictLgd ? ` for subdistrict ${subdistrictLgd}` : ''}`
    );

    sendSuccess(res, {
      count: towns.length,
      towns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/wards?subdistrictLgd=...&town=...
 * Get all wards, optionally filtered by subdistrict or town
 */
export const getWards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subdistrictLgd, town } = req.query;

    const query: any = { level: "ward" };
    
    if (subdistrictLgd) {
      const lgd = parseInt(String(subdistrictLgd), 10);
      if (!isNaN(lgd)) {
        query.subdistrictLgd = lgd;
      }
    }
    
    if (town && typeof town === "string") {
      // Filter wards by town name (wards have town name as prefix)
      query.areaName = new RegExp(`^${town}`, 'i');
    }

    const wards = await Demographics.find(query)
      .select('areaName subdistrictLgd subdistrict totalPopulation totalHouseholds latitude longitude isGeocoded')
      .sort({ areaName: 1 })
      .lean();

    logger.info(
      `Fetched ${wards.length} wards`
    );

    sendSuccess(res, {
      count: wards.length,
      wards,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/village/:villageCode/summary
 * Get complete demographics summary for a village (Total, Urban, Rural format)
 */
export const getVillageDemographicsSummaryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { villageCode } = req.params;

    if (!villageCode) {
      throw new ValidationError("Village code is required");
    }

    const demographics = await getVillageDemographicsSummary(villageCode);

    if (!demographics) {
      // Return empty structure with 0s if not found
      sendSuccess(res, {
        areaName: "Unknown",
        level: "village",
        total: {
          population: 0,
          male: 0,
          female: 0,
          households: 0,
          children: 0,
          sc: 0,
          st: 0,
        },
        rural: {
          population: 0,
          male: 0,
          female: 0,
          households: 0,
        },
        urban: {
          population: 0,
          male: 0,
          female: 0,
          households: 0,
        },
        metrics: {
          sexRatio: 0,
          childRatio: 0,
          scPercentage: 0,
          stPercentage: 0,
          urbanPercentage: 0,
          ruralPercentage: 0,
        },
      });
      return;
    }

    logger.info(`Fetched demographics summary for village code: ${villageCode}`);

    sendSuccess(res, demographics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/town/:townCode/summary
 * Get complete demographics summary for a town (Total, Urban, Rural format)
 */
export const getTownDemographicsSummaryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { townCode } = req.params;

    if (!townCode) {
      throw new ValidationError("Town code is required");
    }

    const demographics = await getTownDemographicsSummary(townCode);

    if (!demographics) {
      // Return empty structure with 0s if not found
      sendSuccess(res, {
        areaName: "Unknown",
        level: "town",
        total: {
          population: 0,
          male: 0,
          female: 0,
          households: 0,
          children: 0,
          sc: 0,
          st: 0,
        },
        rural: {
          population: 0,
          male: 0,
          female: 0,
          households: 0,
        },
        urban: {
          population: 0,
          male: 0,
          female: 0,
          households: 0,
        },
        metrics: {
          sexRatio: 0,
          childRatio: 0,
          scPercentage: 0,
          stPercentage: 0,
          urbanPercentage: 0,
          ruralPercentage: 0,
        },
      });
      return;
    }

    logger.info(`Fetched demographics summary for town code: ${townCode}`);

    sendSuccess(res, demographics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/demographics/subdistrict/:subdistrictLgd/village-count
 * Get village count for a subdistrict
 */
export const getSubdistrictVillageCountById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subdistrictLgd } = req.params;

    if (!subdistrictLgd) {
      throw new ValidationError("Subdistrict LGD is required");
    }

    const lgd = parseInt(subdistrictLgd, 10);
    if (isNaN(lgd)) {
      throw new ValidationError("Invalid subdistrict LGD");
    }

    const count = await getSubdistrictVillageCount(lgd);

    logger.info(`Fetched village count for subdistrict LGD: ${lgd}, count: ${count}`);

    sendSuccess(res, {
      subdistrictLgd: lgd,
      villageCount: count,
    });
  } catch (error) {
    next(error);
  }
};

