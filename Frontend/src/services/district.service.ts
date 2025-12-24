import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types";

export interface AdministrativeHead {
  district_profile: {
    name: string;
    state: string;
    headquarters: string;
    official_website?: string;
  };
  legislative_authorities: {
    members_of_legislative_assembly_MLA: Array<{
      constituency_no: string;
      constituency_name: string;
      name: string;
      party: string;
      status: string;
      image?: string;
      contact?: {
        official_address?: string;
        phone?: string;
      };
    }>;
    member_of_legislative_council_MLC: Array<{
      constituency_type: string;
      name: string;
      party: string;
      status: string;
      image?: string;
      contact?: any;
    }>;
    local_body_heads: Array<{
      designation: string;
      name: string;
      party: string;
      level: string;
      image?: string;
      contact?: {
        office_phone?: string;
      };
    }>;
  };
  executive_authorities: {
    general_administration: Array<{
      designation: string;
      name: string;
      role: string;
      image?: string;
      contact?: {
        cug_mobile?: string;
        office_phone?: string;
        email?: string;
        address?: string;
      };
    }>;
    police_administration: Array<{
      designation: string;
      name: string;
      role: string;
      image?: string;
      contact?: {
        cug_mobile?: string;
        office_phone?: string;
        email?: string;
      };
    }>;
  };
}

export interface DemographicReligion {
  district_info: {
    name: string;
    state_code: string;
    district_code: string;
  };
  district_stats: {
    Total: {
      population: { persons: number; males: number; females: number };
      religion: {
        hindu?: { persons: number; males: number; females: number };
        muslim?: { persons: number; males: number; females: number };
        christian?: { persons: number; males: number; females: number };
        sikh?: { persons: number; males: number; females: number };
        buddhist?: { persons: number; males: number; females: number };
        jain?: { persons: number; males: number; females: number };
        others?: { persons: number; males: number; females: number };
        not_stated?: { persons: number; males: number; females: number };
      };
    };
    Rural: any;
    Urban: any;
  };
  sub_districts: Array<{
    name: string;
    code: string;
    stats: any;
    towns: Array<{
      name: string;
      type: string;
      population: any;
      religion: any;
    }>;
  }>;
}

export interface DemographicCaste {
  district_info: {
    name: string;
    state_code: string;
    district_code: string;
    census_year: string;
  };
  demographics: {
    scheduled_tribes: Array<{
      caste_name: string;
      population: { total: number; male: number; female: number };
    }>;
    scheduled_castes: Array<{
      caste_name: string;
      population: { total: number; male: number; female: number };
    }>;
    obcs?: Array<{
      caste_name: string;
      population: { total: number; male: number; female: number };
    }>;
    general?: Array<{
      caste_name: string;
      population: { total: number; male: number; female: number };
    }>;
    minority?: Array<{
      caste_name: string;
      population: { total: number; male: number; female: number };
    }>;
  };
}

export interface DistrictData {
  districtName: string;
  districtLgd: number;
  stateName: string;
  area: number;
  population: number;
  malePopulation: number;
  femalePopulation: number;
  language: string;
  totalVillages: number;
  headquarters?: string;
  complaints: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  complaintsList: any[];
  administrativeHead: AdministrativeHead | null;
  demographicReligion: DemographicReligion | null;
  demographicCaste: DemographicCaste | null;
}

export const districtService = {
  /**
   * Get Badaun district information
   * GET /api/v1/districts/badaun
   */
  async getBadaunDistrict(): Promise<DistrictData> {
    const response = await apiClient.get<ApiResponse<DistrictData>>(
      "/districts/badaun"
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.error?.message || "Failed to fetch Badaun district data"
    );
  },
};
