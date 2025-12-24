/**
 * Complaint History Controller
 * Handles API endpoints for historical complaint data
 */

import { Request, Response, NextFunction } from "express";
import {
  createSnapshot,
  getHistoricalComparison,
  getHistoricalSnapshots,
  createAllDistrictSnapshots,
} from "../services/complaintHistory.service";
import { sendSuccess, sendError } from "../utils/response";
import logger from "../config/logger";

/**
 * POST /api/v1/complaints/history/snapshot
 * Create a snapshot for a specific entity
 */
export const createComplaintSnapshot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, entityCode, entityName, period } = req.body;

    if (!entityType || !entityCode || !entityName) {
      sendError(res, "Missing required fields: entityType, entityCode, entityName", 400);
      return;
    }

    if (!["district", "subdistrict", "village"].includes(entityType)) {
      sendError(res, "Invalid entityType. Must be: district, subdistrict, or village", 400);
      return;
    }

    const snapshot = await createSnapshot(
      entityType,
      entityCode,
      entityName,
      period || "daily"
    );

    sendSuccess(res, snapshot);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/history/comparison
 * Get historical comparison for an entity
 */
export const getComplaintComparison = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, entityCode, period } = req.query;

    if (!entityType || !entityCode) {
      sendError(res, "Missing required query params: entityType, entityCode", 400);
      return;
    }

    if (!["district", "subdistrict", "village"].includes(entityType as string)) {
      sendError(res, "Invalid entityType. Must be: district, subdistrict, or village", 400);
      return;
    }

    const comparison = await getHistoricalComparison(
      entityType as "district" | "subdistrict" | "village",
      entityCode as string,
      (period as "daily" | "weekly" | "monthly") || "daily"
    );

    if (!comparison) {
      sendError(res, "Historical data not found", 404);
      return;
    }

    sendSuccess(res, comparison);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/history/snapshots
 * Get historical snapshots for an entity
 */
export const getComplaintSnapshots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, entityCode, period, limit } = req.query;

    if (!entityType || !entityCode) {
      sendError(res, "Missing required query params: entityType, entityCode", 400);
      return;
    }

    if (!["district", "subdistrict", "village"].includes(entityType as string)) {
      sendError(res, "Invalid entityType. Must be: district, subdistrict, or village", 400);
      return;
    }

    const snapshots = await getHistoricalSnapshots(
      entityType as "district" | "subdistrict" | "village",
      entityCode as string,
      (period as "daily" | "weekly" | "monthly") || "daily",
      limit ? parseInt(limit as string) : 30
    );

    sendSuccess(res, { snapshots, count: snapshots.length });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints/history/snapshot/all-districts
 * Create snapshots for all districts (admin/scheduled task)
 */
export const createAllDistrictSnapshotsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { period } = req.body;

    await createAllDistrictSnapshots(period || "daily");

    sendSuccess(res, { message: "Snapshots created successfully" });
  } catch (error) {
    next(error);
  }
};

