/**
 * Geo Service
 * Maps to backend /api/v1/geo routes
 */

import apiClient from "@/lib/api";
import { ApiResponse } from "@/types";
import type { FeatureCollection } from "geojson";

// District Heat Map Data Interface (matches backend HeatMap model)
export interface DistrictHeatMapData {
  id: string;
  districtCode: string;
  districtName: string;
  heatValue: number;
  state?: string;
  totalComplaints?: number;
  byStatus?: {
    pending?: number;
    in_progress?: number;
    resolved?: number;
    rejected?: number;
  };
  byCategory?: {
    roads?: { count: number; sub?: { [key: string]: number } };
    water?: { count: number; sub?: { [key: string]: number } };
    electricity?: { count: number; sub?: { [key: string]: number } };
    documents?: { count: number; sub?: { [key: string]: number } };
    health?: { count: number; sub?: { [key: string]: number } };
    education?: { count: number; sub?: { [key: string]: number } };
    other?: { count: number; sub?: { [key: string]: number } };
  };
  timeSeries?: Array<{
    date: string;
    count: number;
  }>;
  normalized?: {
    per100k?: number;
    perKm2?: number;
  };
  topIssues?: Array<{
    category: string;
    sub?: string;
    count: number;
  }>;
  lastAggregatedAt?: string;
  meta?: {
    population?: number;
    areaKm2?: number;
  };
  created_at?: string;
  updated_at?: string;
}

// District Summary Interface (for list endpoint)
export interface DistrictSummary {
  districtCode: string;
  districtName: string;
  heatValue: number;
  state?: string;
  totalComplaints?: number; // Added for map labels
}

// Subdistrict Demographics Interface (Census 2011 data)
export interface SubdistrictDemographics {
  areaName: string;
  level: string;
  districtLgd?: number;
  subdistrictLgd?: number;
  total: {
    population: number;
    male: number;
    female: number;
    households: number;
    children: number;
    sc: number;
    st: number;
  };
  urban: {
    population: number;
    male: number;
    female: number;
    households: number;
  };
  rural: {
    population: number;
    male: number;
    female: number;
    households: number;
  };
  metrics: {
    sexRatio: number;
    childRatio: number;
    scPercentage: number;
    stPercentage: number;
    urbanPercentage: number;
    ruralPercentage: number;
  };
}

export const geoService = {
  /**
   * Get Uttar Pradesh GeoJSON data
   * GET /api/v1/geo/uttarpradesh
   */
  async getUttarPradeshGeoJson(): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      "/geo/uttarpradesh"
    );

    if (response.success && response.data) {
      // Validate that it's a FeatureCollection
      if (response.data.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON data: expected FeatureCollection");
      }
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch Uttar Pradesh GeoJSON"
    );
  },

  /**
   * Get Badaun district GeoJSON data
   * GET /api/v1/geo/badaun
   */
  async getBadaunGeoJson(): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      "/geo/badaun"
    );

    if (response.success && response.data) {
      // Validate that it's a FeatureCollection
      if (response.data.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON data: expected FeatureCollection");
      }
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch Badaun GeoJSON"
    );
  },

  /**
   * Get district POI (Points of Interest) data
   * GET /api/v1/geo/:district/:poi
   * 
   * @param district - District name (e.g., "badaun")
   * @param poi - POI type ("adhq" or "india-assets")
   */
  async getDistrictPOI(
    district: string,
    poi: "adhq" | "india-assets"
  ): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      `/geo/${district}/${poi}`
    );

    if (response.success && response.data) {
      // Validate that it's a FeatureCollection
      if (response.data.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON data: expected FeatureCollection");
      }
      return response.data;
    }

    throw new Error(
      response.error?.message || `Failed to fetch ${district} ${poi} data`
    );
  },

  /**
   * Get all districts with heat map values
   * GET /api/v1/geo/heatmap/districts
   */
  async getAllDistrictsHeatMap(): Promise<{
    count: number;
    districts: DistrictSummary[];
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        count: number;
        districts: DistrictSummary[];
      }>
    >("/geo/heatmap/districts");

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch districts heat map"
    );
  },

  /**
   * Get complete heat map data for a specific district
   * GET /api/v1/geo/heatmap/:districtCode
   */
  async getDistrictHeatMapByCode(
    districtCode: string
  ): Promise<DistrictHeatMapData> {
    const response = await apiClient.get<ApiResponse<DistrictHeatMapData>>(
      `/geo/heatmap/${encodeURIComponent(districtCode)}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "District heat map data not found"
    );
  },

  /**
   * Get Points of Interest (POI) data for a specific district
   * GET /api/v1/geo/:district/:poi
   *
   * @param district - District name (e.g., "badaun")
   * @param poiType - POI type: "adhq" or "india-assets"
   *
   * @returns GeoJSON FeatureCollection of POI locations
   */
  async getDistrictPOI(
    district: string,
    poiType: "adhq" | "india-assets"
  ): Promise<FeatureCollection> {
    const response = await apiClient.get<ApiResponse<FeatureCollection>>(
      `/geo/${encodeURIComponent(district)}/${encodeURIComponent(poiType)}`
    );

    if (response.success && response.data) {
      // Validate that it's a FeatureCollection
      if (response.data.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON data: expected FeatureCollection");
      }
      return response.data;
    }

    throw new Error(
      response.error?.message ||
        `Failed to fetch ${poiType} POI data for ${district}`
    );
  },

  /**
   * Get demographics for a subdistrict
   * GET /api/v1/demographics/subdistrict/:subdistrictLgd
   * 
   * @param subdistrictLgd - Subdistrict LGD code (e.g., 780 for Bilsi)
   * @returns Complete demographics with Total/Urban/Rural breakdown
   */
  async getSubdistrictDemographics(
    subdistrictLgd: number
  ): Promise<SubdistrictDemographics> {
    const response = await apiClient.get<ApiResponse<SubdistrictDemographics>>(
      `/demographics/subdistrict/${subdistrictLgd}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Subdistrict demographics not found"
    );
  },

  /**
   * Get demographics for district
   * GET /api/v1/demographics/district/:districtLgd
   */
  async getDistrictDemographics(
    districtLgd: number
  ): Promise<SubdistrictDemographics> {
    const response = await apiClient.get<ApiResponse<SubdistrictDemographics>>(
      `/demographics/district/${districtLgd}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "District demographics not found"
    );
  },

  /**
   * Get demographics for village
   * GET /api/v1/demographics/village/:villageCode
   */
  async getVillageDemographics(
    villageCode: string
  ): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/demographics/village/${villageCode}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Village demographics not found"
    );
  },

  /**
   * Get demographics summary for village (Total, Urban, Rural format)
   * GET /api/v1/demographics/village/:villageCode/summary
   */
  async getVillageDemographicsSummary(
    villageCode: string
  ): Promise<SubdistrictDemographics> {
    const response = await apiClient.get<ApiResponse<SubdistrictDemographics>>(
      `/demographics/village/${villageCode}/summary`
    );

    if (response.success && response.data) {
      return response.data;
    }

    // Return empty structure with 0s if not found
    return {
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
    };
  },

  /**
   * Get demographics summary for town (Total, Urban, Rural format)
   * GET /api/v1/demographics/town/:townCode/summary
   */
  async getTownDemographicsSummary(
    townCode: string
  ): Promise<SubdistrictDemographics> {
    const response = await apiClient.get<ApiResponse<SubdistrictDemographics>>(
      `/demographics/town/${townCode}/summary`
    );

    if (response.success && response.data) {
      return response.data;
    }

    // Return empty structure with 0s if not found
    return {
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
    };
  },

  /**
   * Get village count for a subdistrict
   * GET /api/v1/demographics/subdistrict/:subdistrictLgd/village-count
   */
  async getSubdistrictVillageCount(
    subdistrictLgd: number
  ): Promise<number> {
    const response = await apiClient.get<ApiResponse<{
      subdistrictLgd: number;
      villageCount: number;
    }>>(
      `/demographics/subdistrict/${subdistrictLgd}/village-count`
    );

    if (response.success && response.data) {
      return response.data.villageCount || 0;
    }

    return 0;
  },
};
