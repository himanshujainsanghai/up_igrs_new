/**
 * Complaint History Service
 * Handles fetching historical complaint data for comparison
 */

import apiClient from "@/lib/api";
import { ApiResponse } from "@/types";

export interface HistoricalComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
}

export interface ComplaintSnapshot {
  _id: string;
  entityType: "district" | "subdistrict" | "village";
  entityCode: string;
  entityName: string;
  snapshotDate: string;
  period: "daily" | "weekly" | "monthly";
  totalComplaints: number;
  byStatus: {
    pending?: number;
    in_progress?: number;
    resolved?: number;
    rejected?: number;
  };
  byCategory: {
    roads?: number;
    water?: number;
    electricity?: number;
    documents?: number;
    health?: number;
    education?: number;
    other?: number;
  };
}

export const complaintHistoryService = {
  /**
   * Get historical comparison for an entity
   * GET /api/v1/complaints/history/comparison?entityType=district&entityCode=Badaun&period=daily
   */
  async getComparison(
    entityType: "district" | "subdistrict" | "village",
    entityCode: string,
    period: "daily" | "weekly" | "monthly" = "daily"
  ): Promise<HistoricalComparison> {
    const response = await apiClient.get<ApiResponse<HistoricalComparison>>(
      `/complaints/history/comparison`,
      {
        params: { entityType, entityCode, period },
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch historical comparison"
    );
  },

  /**
   * Get historical snapshots for an entity
   * GET /api/v1/complaints/history/snapshots?entityType=district&entityCode=Badaun&period=daily&limit=30
   */
  async getSnapshots(
    entityType: "district" | "subdistrict" | "village",
    entityCode: string,
    period: "daily" | "weekly" | "monthly" = "daily",
    limit: number = 30
  ): Promise<ComplaintSnapshot[]> {
    const response = await apiClient.get<
      ApiResponse<{ snapshots: ComplaintSnapshot[]; count: number }>
    >(`/complaints/history/snapshots`, {
      params: { entityType, entityCode, period, limit },
    });

    if (response.success && response.data) {
      return response.data.snapshots;
    }

    throw new Error(
      response.error?.message || "Failed to fetch historical snapshots"
    );
  },

  /**
   * Create a snapshot for an entity (admin only)
   * POST /api/v1/complaints/history/snapshot
   */
  async createSnapshot(
    entityType: "district" | "subdistrict" | "village",
    entityCode: string,
    entityName: string,
    period: "daily" | "weekly" | "monthly" = "daily"
  ): Promise<ComplaintSnapshot> {
    const response = await apiClient.post<ApiResponse<ComplaintSnapshot>>(
      `/complaints/history/snapshot`,
      {
        entityType,
        entityCode,
        entityName,
        period,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to create snapshot"
    );
  },
};

