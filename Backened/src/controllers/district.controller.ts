import { Request, Response, NextFunction } from "express";
import District from "../models/District";
import { Complaint } from "../models/Complaint";
import DistrictAdministrativeHead from "../models/DistrictAdministrativeHead";
import DemographicReligion from "../models/DemographicReligion";
import DemographicCaste from "../models/DemographicCaste";
import { sendSuccess } from "../utils/response";
import logger from "../config/logger";

/**
 * GET /api/v1/districts/badaun
 * Get Badaun district information
 */
export const getBadaunDistrict = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const district = await District.findOne({ districtLgd: 134 });

    if (!district) {
      res.status(404).json({
        success: false,
        error: { message: "Badaun district data not found" },
      });
      return;
    }

    // Get complaint statistics
    const allComplaints = await Complaint.find({
      district_name: "Budaun",
    }).lean();

    const complaintStats = {
      total: allComplaints.length,
      byStatus: allComplaints.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCategory: allComplaints.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: allComplaints.reduce((acc, c) => {
        acc[c.priority] = (acc[c.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Fetch administrative heads data
    const administrativeHead = await DistrictAdministrativeHead.findOne({
      district: district._id,
    })
      .populate("district", "districtName districtLgd stateName")
      .lean();

    // Fetch demographic religion data
    const demographicReligion = await DemographicReligion.findOne({
      district: district._id,
    })
      .populate("district", "districtName districtLgd stateName")
      .lean();

    // Fetch demographic caste data
    const demographicCaste = await DemographicCaste.findOne({
      district: district._id,
    })
      .populate("district", "districtName districtLgd stateName")
      .lean();

    const response = {
      ...district.toObject(),
      complaints: complaintStats,
      complaintsList: allComplaints.map((c) => ({
        id: c.id,
        complaint_id: c.complaint_id,
        title: c.title,
        category: c.category,
        sub_category: c.sub_category,
        status: c.status,
        priority: c.priority,
        village_name: c.village_name,
        subdistrict_name: c.subdistrict_name,
        created_at: c.created_at,
      })),
      administrativeHead: administrativeHead || null,
      demographicReligion: demographicReligion || null,
      demographicCaste: demographicCaste || null,
    };

    logger.info(
      `Returned Badaun district info with ${allComplaints.length} complaints`
    );
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};
