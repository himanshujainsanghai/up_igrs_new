import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Complaint } from "../models/Complaint";
import { HeatMap } from "../models/HeatMap";
import DistrictAdministrativeHead from "../models/DistrictAdministrativeHead";
import DemographicReligion from "../models/DemographicReligion";
import DemographicCaste from "../models/DemographicCaste";
import District from "../models/District";
import { sendSuccess } from "../utils/response";
import { ValidationError, ConflictError } from "../utils/errors";
import logger from "../config/logger";

/**
 * Test Controller
 * Handles test routes for development/testing purposes
 */

/**
 * GET /api/v1/test/admins
 * Get all admin users (auth-free route for testing)
 * Returns complete details of all users with role='admin'
 */
export const getAllAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch all users with role='admin'
    // Exclude password field for security
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .lean()
      .sort({ created_at: -1 });

    logger.info(`Fetched ${admins.length} admin users`);

    sendSuccess(res, {
      count: admins.length,
      admins,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/test/create-admin
 * Create a new admin user (auth-free route for testing)
 * Requires: email, name, password in req.body
 * Role is automatically set to 'admin'
 */
export const createAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Please provide a valid email address");
    }

    // Validate password length
    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin user
    const admin = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name?.trim() || undefined,
      role: "admin",
      isActive: true,
    });

    await admin.save();

    // Return user without password
    const adminResponse = await User.findById(admin._id)
      .select("-password")
      .lean();

    logger.info(`Admin user created: ${email}`);

    sendSuccess(res, adminResponse, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/test/complaints
 * Get all complaints data (auth-free route for testing)
 * Returns all complaints without pagination
 */
export const getAllComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch all complaints, sorted by creation date (newest first)
    const complaints = await Complaint.find({}).lean().sort({ created_at: -1 });

    logger.info(`Fetched ${complaints.length} complaints`);

    sendSuccess(res, {
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/test/heatmap
 * Create or update heat map data (auth-free route for testing)
 * Accepts single object or array of heat map data in req.body
 * If districtCode exists, updates the existing record; otherwise creates new
 *
 * Single object: { districtCode: "Agra", districtName: "Agra", heatValue: 150, ... }
 * Array of objects: [{ districtCode: "Agra", ... }, { districtCode: "Aligarh", ... }]
 */
export const createHeatMap = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inputData = req.body;

    // Check if input is array or single object
    const isArray = Array.isArray(inputData);
    const heatMapDataArray = isArray ? inputData : [inputData];

    if (heatMapDataArray.length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Process each heat map entry
    const results = [];
    const errors = [];

    for (let i = 0; i < heatMapDataArray.length; i++) {
      const heatMapData = heatMapDataArray[i];
      const index = isArray ? i : null;

      try {
        // Validate required fields for this entry
        if (!heatMapData.districtCode) {
          throw new ValidationError(
            `District code is required${
              index !== null ? ` for item at index ${index}` : ""
            }`
          );
        }
        if (!heatMapData.districtName) {
          throw new ValidationError(
            `District name is required${
              index !== null ? ` for item at index ${index}` : ""
            }`
          );
        }
        if (
          heatMapData.heatValue === undefined ||
          heatMapData.heatValue === null
        ) {
          throw new ValidationError(
            `Heat value is required${
              index !== null ? ` for item at index ${index}` : ""
            }`
          );
        }

        // Check if heat map entry already exists for this district
        const existingHeatMap = await HeatMap.findOne({
          districtCode: heatMapData.districtCode,
        });

        let heatMap;

        if (existingHeatMap) {
          // Update existing record - merge provided data with existing data
          Object.assign(existingHeatMap, heatMapData);
          heatMap = await existingHeatMap.save();
          logger.info(
            `Updated heat map for district: ${heatMapData.districtCode}`
          );

          results.push({
            districtCode: heatMapData.districtCode,
            status: "updated",
            data: await HeatMap.findById(heatMap._id).lean(),
          });
        } else {
          // Create new record - save data as-is
          heatMap = new HeatMap(heatMapData);
          await heatMap.save();
          logger.info(
            `Created heat map for district: ${heatMapData.districtCode}`
          );

          results.push({
            districtCode: heatMapData.districtCode,
            status: "created",
            data: await HeatMap.findById(heatMap._id).lean(),
          });
        }
      } catch (error: any) {
        // Collect error for this entry but continue processing others
        const errorMessage = error?.message || "Unknown error occurred";
        errors.push({
          index: index !== null ? index : 0,
          districtCode: heatMapData?.districtCode || "unknown",
          error: errorMessage,
        });
        logger.error(
          `Failed to process heat map entry at index ${
            index !== null ? index : 0
          }: ${errorMessage}`
        );
      }
    }

    // Prepare response
    const response: any = {
      processed: results.length,
      failed: errors.length,
      total: heatMapDataArray.length,
    };

    // If single object was sent, return single result for backward compatibility
    if (!isArray) {
      if (results.length > 0) {
        const result = results[0];
        sendSuccess(res, result.data, result.status === "created" ? 201 : 200);
        return;
      } else if (errors.length > 0) {
        // If single object failed, throw the error
        throw new ValidationError(errors[0].error);
      }
    }

    // For array input, return detailed results
    response.results = results;
    if (errors.length > 0) {
      response.errors = errors;
    }

    // Determine status code based on results
    let statusCode = 200;
    if (results.length === heatMapDataArray.length) {
      // All succeeded - use 201 if all were created, 200 if mixed
      const allCreated = results.every((r) => r.status === "created");
      statusCode = allCreated ? 201 : 200;
    } else if (results.length > 0) {
      // Partial success - 207 Multi-Status (but we'll use 200 with errors in response)
      statusCode = 200;
    } else {
      // All failed
      statusCode = 400;
    }

    logger.info(
      `Processed ${results.length}/${heatMapDataArray.length} heat map entries${
        errors.length > 0 ? ` (${errors.length} failed)` : ""
      }`
    );

    sendSuccess(res, response, statusCode);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/test/administrative-head
 * Create or update district administrative head data (auth-free route for testing)
 * Requires: district (ObjectId) and administrative head data in req.body
 *
 * Request body format:
 * {
 *   "district": "507f1f77bcf86cd799439011", // District ObjectId
 *   "district_profile": {
 *     "name": "Badaun (Budaun)",
 *     "state": "Uttar Pradesh",
 *     "headquarters": "Budaun City",
 *     "official_website": "https://budaun.nic.in"
 *   },
 *   "legislative_authorities": { ... },
 *   "executive_authorities": { ... }
 * }
 */
export const createAdministrativeHead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      district,
      district_profile,
      legislative_authorities,
      executive_authorities,
    } = req.body;

    // Validate required fields
    if (!district) {
      throw new ValidationError("District ObjectId is required");
    }

    // Validate district ObjectId format
    if (!mongoose.Types.ObjectId.isValid(district)) {
      throw new ValidationError("Invalid district ObjectId format");
    }

    // Check if district exists
    const districtExists = await District.findById(district);
    if (!districtExists) {
      throw new ValidationError(
        "District not found with the provided ObjectId"
      );
    }

    // Validate required district_profile fields
    if (
      !district_profile ||
      !district_profile.name ||
      !district_profile.state ||
      !district_profile.headquarters
    ) {
      throw new ValidationError(
        "district_profile with name, state, and headquarters is required"
      );
    }

    // Validate legislative_authorities structure
    if (!legislative_authorities) {
      throw new ValidationError("legislative_authorities is required");
    }

    // Validate executive_authorities structure
    if (!executive_authorities) {
      throw new ValidationError("executive_authorities is required");
    }

    // Check if administrative head already exists for this district
    const existingHead = await DistrictAdministrativeHead.findOne({ district });

    let administrativeHead;
    let isUpdate = false;

    if (existingHead) {
      // Update existing record
      existingHead.district_profile = district_profile;
      existingHead.legislative_authorities = legislative_authorities;
      existingHead.executive_authorities = executive_authorities;
      administrativeHead = await existingHead.save();
      isUpdate = true;
      logger.info(`Updated administrative head for district: ${district}`);
    } else {
      // Create new record
      administrativeHead = new DistrictAdministrativeHead({
        district,
        district_profile,
        legislative_authorities,
        executive_authorities,
      });
      await administrativeHead.save();
      logger.info(`Created administrative head for district: ${district}`);
    }

    // Return the created/updated document with populated district
    const result = await DistrictAdministrativeHead.findById(
      administrativeHead._id
    )
      .populate("district", "districtName districtLgd stateName")
      .lean();

    sendSuccess(
      res,
      {
        status: isUpdate ? "updated" : "created",
        data: result,
      },
      isUpdate ? 200 : 201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/test/demographic-religion
 * Create or update demographic religion data (auth-free route for testing)
 * Requires: district (ObjectId) and demographic religion data in req.body
 *
 * Request body format:
 * {
 *   "district": "507f1f77bcf86cd799439011", // District ObjectId
 *   "district_info": {
 *     "name": "Budaun",
 *     "state_code": "09",
 *     "district_code": "149"
 *   },
 *   "district_stats": { ... },
 *   "sub_districts": [ ... ]
 * }
 */
export const createDemographicReligion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { district, district_info, district_stats, sub_districts } = req.body;

    // Validate required fields
    if (!district) {
      throw new ValidationError("District ObjectId is required");
    }

    // Validate district ObjectId format
    if (!mongoose.Types.ObjectId.isValid(district)) {
      throw new ValidationError("Invalid district ObjectId format");
    }

    // Check if district exists
    const districtExists = await District.findById(district);
    if (!districtExists) {
      throw new ValidationError(
        "District not found with the provided ObjectId"
      );
    }

    // Validate required district_info fields
    if (
      !district_info ||
      !district_info.name ||
      !district_info.state_code ||
      !district_info.district_code
    ) {
      throw new ValidationError(
        "district_info with name, state_code, and district_code is required"
      );
    }

    // Validate district_stats structure
    if (!district_stats) {
      throw new ValidationError("district_stats is required");
    }

    if (
      !district_stats.Total ||
      !district_stats.Rural ||
      !district_stats.Urban
    ) {
      throw new ValidationError(
        "district_stats must contain Total, Rural, and Urban breakdowns"
      );
    }

    // Check if demographic religion already exists for this district
    const existingData = await DemographicReligion.findOne({ district });

    let demographicReligion;
    let isUpdate = false;

    if (existingData) {
      // Update existing record
      existingData.district_info = district_info;
      existingData.district_stats = district_stats;
      existingData.sub_districts = sub_districts || [];
      demographicReligion = await existingData.save();
      isUpdate = true;
      logger.info(`Updated demographic religion for district: ${district}`);
    } else {
      // Create new record
      demographicReligion = new DemographicReligion({
        district,
        district_info,
        district_stats,
        sub_districts: sub_districts || [],
      });
      await demographicReligion.save();
      logger.info(`Created demographic religion for district: ${district}`);
    }

    // Return the created/updated document with populated district
    const result = await DemographicReligion.findById(demographicReligion._id)
      .populate("district", "districtName districtLgd stateName")
      .lean();

    sendSuccess(
      res,
      {
        status: isUpdate ? "updated" : "created",
        data: result,
      },
      isUpdate ? 200 : 201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/test/demographic-caste
 * Create or update demographic caste data (auth-free route for testing)
 * Requires: district (ObjectId) and demographic caste data in req.body
 *
 * Request body format:
 * {
 *   "district": "507f1f77bcf86cd799439011", // District ObjectId
 *   "district_info": {
 *     "name": "Budaun",
 *     "state_code": "09",
 *     "district_code": "149",
 *     "census_year": "2011"
 *   },
 *   "demographics": {
 *     "scheduled_tribes": [ ... ],
 *     "scheduled_castes": [ ... ],
 *     "obcs": [ ... ],
 *     "general": [ ... ],
 *     "minority": [ ... ]
 *   }
 * }
 */
export const createDemographicCaste = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { district, district_info, demographics } = req.body;

    // Validate required fields
    if (!district) {
      throw new ValidationError("District ObjectId is required");
    }

    // Validate district ObjectId format
    if (!mongoose.Types.ObjectId.isValid(district)) {
      throw new ValidationError("Invalid district ObjectId format");
    }

    // Check if district exists
    const districtExists = await District.findById(district);
    if (!districtExists) {
      throw new ValidationError(
        "District not found with the provided ObjectId"
      );
    }

    // Validate required district_info fields
    if (
      !district_info ||
      !district_info.name ||
      !district_info.state_code ||
      !district_info.district_code ||
      !district_info.census_year
    ) {
      throw new ValidationError(
        "district_info with name, state_code, district_code, and census_year is required"
      );
    }

    // Validate demographics structure
    if (!demographics) {
      throw new ValidationError("demographics is required");
    }

    if (
      !demographics.scheduled_tribes ||
      !Array.isArray(demographics.scheduled_tribes)
    ) {
      throw new ValidationError(
        "demographics.scheduled_tribes must be an array"
      );
    }

    if (
      !demographics.scheduled_castes ||
      !Array.isArray(demographics.scheduled_castes)
    ) {
      throw new ValidationError(
        "demographics.scheduled_castes must be an array"
      );
    }

    // Check if demographic caste already exists for this district
    const existingData = await DemographicCaste.findOne({ district });

    let demographicCaste;
    let isUpdate = false;

    if (existingData) {
      // Update existing record
      existingData.district_info = district_info;
      existingData.demographics = demographics;
      demographicCaste = await existingData.save();
      isUpdate = true;
      logger.info(`Updated demographic caste for district: ${district}`);
    } else {
      // Create new record
      demographicCaste = new DemographicCaste({
        district,
        district_info,
        demographics,
      });
      await demographicCaste.save();
      logger.info(`Created demographic caste for district: ${district}`);
    }

    // Return the created/updated document with populated district
    const result = await DemographicCaste.findById(demographicCaste._id)
      .populate("district", "districtName districtLgd stateName")
      .lean();

    sendSuccess(
      res,
      {
        status: isUpdate ? "updated" : "created",
        data: result,
      },
      isUpdate ? 200 : 201
    );
  } catch (error) {
    next(error);
  }
};
