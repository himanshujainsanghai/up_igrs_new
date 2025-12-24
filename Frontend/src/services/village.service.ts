import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { FeatureCollection } from "geojson";

export interface VillageStats {
  total: number;
  geocoded: number;
  pending: number;
  percentageComplete: number;
}

export interface Village {
  id: string;
  villageName: string;
  lgdCode: string;
  subdistrictName: string;
  subdistrictLgd: number;
  districtName: string;
  districtLgd: number;
  stateName: string;
  stateLgd: number;
  latitude?: number;
  longitude?: number;
  isGeocoded: boolean;
  population?: number;
  area?: number;
  sarpanch?: string;
}

export interface VillagesResponse {
  villages: Village[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const villageService = {
  /**
   * Get Badaun villages as GeoJSON (points)
   * GET /api/v1/villages/badaun/geojson
   */
  async getBadaunVillagesGeoJSON(): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      "/villages/badaun/geojson"
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch Badaun villages GeoJSON"
    );
  },

  /**
   * Get Badaun village boundaries as GeoJSON (polygons)
   * GET /api/v1/villages/badaun/boundaries
   */
  async getBadaunVillageBoundaries(): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      "/villages/badaun/boundaries"
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch Badaun village boundaries"
    );
  },

  /**
   * Get villages for any district as GeoJSON
   * GET /api/v1/villages/:districtLgd/geojson
   */
  async getVillagesGeoJSONByDistrict(
    districtLgd: number
  ): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      `/villages/${districtLgd}/geojson`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch villages GeoJSON"
    );
  },

  /**
   * Get Badaun village statistics
   * GET /api/v1/villages/badaun/stats
   */
  async getBadaunVillageStats(): Promise<VillageStats> {
    const response = await apiClient.get<ApiResponse<VillageStats>>(
      "/villages/badaun/stats"
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch Badaun village statistics"
    );
  },

  /**
   * Get village statistics (all districts)
   * GET /api/v1/villages/stats
   */
  async getVillageStats(): Promise<VillageStats> {
    const response = await apiClient.get<ApiResponse<VillageStats>>(
      "/villages/stats"
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch village statistics"
    );
  },

  /**
   * Trigger geocoding for pending villages
   * POST /api/v1/villages/geocode
   */
  async triggerGeocoding(
    batchSize: number = 10
  ): Promise<{ success: number; failed: number; message: string }> {
    const response = await apiClient.post<
      ApiResponse<{ success: number; failed: number; message: string }>
    >("/villages/geocode", { batchSize });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to trigger geocoding"
    );
  },

  /**
   * Get all villages with pagination
   * GET /api/v1/villages
   */
  async getAllVillages(
    page: number = 1,
    limit: number = 50
  ): Promise<VillagesResponse> {
    const response = await apiClient.get<ApiResponse<VillagesResponse>>(
      `/villages?page=${page}&limit=${limit}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || "Failed to fetch villages");
  },

  /**
   * Get village details by LGD code
   * GET /api/v1/villages/:lgdCode
   */
  async getVillageByLgdCode(lgdCode: string): Promise<Village | null> {
    try {
      const response = await apiClient.get<ApiResponse<Village>>(
        `/villages/${lgdCode}`
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (err) {
      console.error("Failed to fetch village details:", err);
      return null;
    }
  },

  /**
   * Get complaints for a specific village
   * GET /api/v1/villages/:lgdCode/complaints
   */
  async getVillageComplaints(lgdCode: string): Promise<{
    complaints: any[];
    count: number;
  }> {
    const response = await apiClient.get<
      ApiResponse<{ complaints: any[]; count: number }>
    >(`/villages/${lgdCode}/complaints`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch village complaints"
    );
  },

  /**
   * Upload village data from JSON/CSV
   * POST /api/v1/villages/upload
   */
  async uploadVillageData(
    villages: any[],
    districtName?: string,
    districtLgd?: number
  ): Promise<{
    message: string;
    summary: {
      total: number;
      created: number;
      existing: number;
      failed: number;
      errors: string[];
    };
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        message: string;
        summary: {
          total: number;
          created: number;
          existing: number;
          failed: number;
          errors: string[];
        };
      }>
    >("/villages/upload", {
      villages,
      districtName,
      districtLgd,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to upload village data"
    );
  },
};

