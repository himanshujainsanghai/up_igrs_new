/**
 * Complaint History Service
 * Handles creation and retrieval of historical complaint snapshots
 */

import ComplaintHistory, { IComplaintHistory } from "../models/ComplaintHistory";
import { Complaint } from "../models/Complaint";
import logger from "../config/logger";

export interface HistoricalComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
}

/**
 * Create a snapshot of complaint counts for an entity
 */
export const createSnapshot = async (
  entityType: "district" | "subdistrict" | "village",
  entityCode: string,
  entityName: string,
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<IComplaintHistory> => {
  try {
    // Build query based on entity type
    let query: any = {};
    if (entityType === "district") {
      query.district_name = entityCode;
    } else if (entityType === "subdistrict") {
      query.subdistrict_lgd = entityCode;
    } else if (entityType === "village") {
      query.village_lgd = entityCode;
    }

    // Get all complaints for this entity
    const complaints = await Complaint.find(query).lean();

    // Calculate counts
    const totalComplaints = complaints.length;
    const byStatus = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };
    const byCategory = {
      roads: 0,
      water: 0,
      electricity: 0,
      documents: 0,
      health: 0,
      education: 0,
      other: 0,
    };

    complaints.forEach((complaint) => {
      // Count by status
      const status = complaint.status || "pending";
      if (status in byStatus) {
        byStatus[status as keyof typeof byStatus]++;
      }

      // Count by category
      const category = (complaint.category || "other").toLowerCase();
      if (category in byCategory) {
        byCategory[category as keyof typeof byCategory]++;
      } else {
        byCategory.other++;
      }
    });

    // Create snapshot
    const snapshot = new ComplaintHistory({
      entityType,
      entityCode,
      entityName,
      snapshotDate: new Date(),
      period,
      totalComplaints,
      byStatus,
      byCategory,
    });

    await snapshot.save();
    logger.info(
      `Created ${period} snapshot for ${entityType} ${entityCode}: ${totalComplaints} complaints`
    );

    return snapshot;
  } catch (error: any) {
    logger.error(`Error creating snapshot for ${entityType} ${entityCode}:`, error);
    throw error;
  }
};

/**
 * Get historical comparison for an entity
 * Returns current count vs previous period count
 */
export const getHistoricalComparison = async (
  entityType: "district" | "subdistrict" | "village",
  entityCode: string,
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<HistoricalComparison | null> => {
  try {
    // Get current count from Complaint model
    let query: any = {};
    if (entityType === "district") {
      query.district_name = entityCode;
    } else if (entityType === "subdistrict") {
      query.subdistrict_lgd = entityCode;
    } else if (entityType === "village") {
      query.village_lgd = entityCode;
    }

    const currentCount = await Complaint.countDocuments(query);

    // Get previous snapshot
    const previousSnapshot = await ComplaintHistory.findOne({
      entityType,
      entityCode,
      period,
    })
      .sort({ snapshotDate: -1 })
      .lean() as IComplaintHistory | null;

    if (!previousSnapshot) {
      // No previous data available
      return {
        current: currentCount,
        previous: 0,
        change: currentCount,
        changePercent: 100,
        trend: "up",
      };
    }

    const previousCount = previousSnapshot.totalComplaints || 0;
    const change = currentCount - previousCount;
    const changePercentStr =
      previousCount > 0 ? ((change / previousCount) * 100).toFixed(1) : "100";

    let trend: "up" | "down" | "stable" = "stable";
    if (change > 0) trend = "up";
    else if (change < 0) trend = "down";

    return {
      current: currentCount,
      previous: previousCount,
      change,
      changePercent: parseFloat(changePercentStr),
      trend,
    };
  } catch (error: any) {
    logger.error(
      `Error getting historical comparison for ${entityType} ${entityCode}:`,
      error
    );
    return null;
  }
};

/**
 * Get historical snapshots for an entity
 */
export const getHistoricalSnapshots = async (
  entityType: "district" | "subdistrict" | "village",
  entityCode: string,
  period: "daily" | "weekly" | "monthly" = "daily",
  limit: number = 30
): Promise<IComplaintHistory[]> => {
  try {
    const snapshots = await ComplaintHistory.find({
      entityType,
      entityCode,
      period,
    })
      .sort({ snapshotDate: -1 })
      .limit(limit)
      .lean();

    return snapshots as unknown as IComplaintHistory[];
  } catch (error: any) {
    logger.error(
      `Error getting historical snapshots for ${entityType} ${entityCode}:`,
      error
    );
    return [];
  }
};

/**
 * Create snapshots for all districts (scheduled task)
 */
export const createAllDistrictSnapshots = async (
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<void> => {
  try {
    // Get all unique districts from complaints
    const districts = await Complaint.distinct("district_name");

    for (const districtCode of districts) {
      if (districtCode) {
        await createSnapshot("district", districtCode, districtCode, period);
      }
    }

    logger.info(`Created ${period} snapshots for ${districts.length} districts`);
  } catch (error: any) {
    logger.error("Error creating district snapshots:", error);
    throw error;
  }
};

