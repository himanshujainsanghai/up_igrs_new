/**
 * Demographics Helper Utilities
 * Helper functions to query and aggregate census demographic data
 */

import Demographics, { IDemographics } from "../models/Demographics";

export interface DemographicsSummary {
  areaName: string;
  level: string;
  districtLgd?: number;
  subdistrictLgd?: number;
  
  // Total population (all residence types combined)
  total: {
    population: number;
    male: number;
    female: number;
    households: number;
    children: number;
    sc: number;
    st: number;
  };
  
  // Rural population
  rural: {
    population: number;
    male: number;
    female: number;
    households: number;
  };
  
  // Urban population
  urban: {
    population: number;
    male: number;
    female: number;
    households: number;
  };
  
  // Calculated metrics
  metrics: {
    sexRatio: number;  // Females per 1000 males
    childRatio: number;  // % of 0-6 years
    scPercentage: number;  // % Scheduled Caste
    stPercentage: number;  // % Scheduled Tribe
    urbanPercentage: number;  // % Urban
    ruralPercentage: number;  // % Rural
  };
}

/**
 * Get complete demographics for a subdistrict (Total, Urban, Rural)
 */
export async function getSubdistrictDemographics(
  subdistrictLgd: number
): Promise<DemographicsSummary | null> {
  try {
    // Fetch all 3 residence types
    const [totalData, ruralData, urbanData] = await Promise.all([
      Demographics.findOne({ 
        level: "subdistrict", 
        subdistrictLgd, 
        residence: "total" 
      }),
      Demographics.findOne({ 
        level: "subdistrict", 
        subdistrictLgd, 
        residence: "rural" 
      }),
      Demographics.findOne({ 
        level: "subdistrict", 
        subdistrictLgd, 
        residence: "urban" 
      })
    ]);
    
    if (!totalData) return null;
    
    // Build summary
    const summary: DemographicsSummary = {
      areaName: totalData.subdistrict || "Unknown",
      level: "subdistrict",
      districtLgd: totalData.districtLgd,
      subdistrictLgd: subdistrictLgd,
      
      total: {
        population: totalData.totalPopulation || 0,
        male: totalData.malePopulation || 0,
        female: totalData.femalePopulation || 0,
        households: totalData.totalHouseholds || 0,
        children: totalData.childPopulation || 0,
        sc: totalData.scPopulation || 0,
        st: totalData.stPopulation || 0,
      },
      
      rural: {
        population: ruralData?.totalPopulation || 0,
        male: ruralData?.malePopulation || 0,
        female: ruralData?.femalePopulation || 0,
        households: ruralData?.totalHouseholds || 0,
      },
      
      urban: {
        population: urbanData?.totalPopulation || 0,
        male: urbanData?.malePopulation || 0,
        female: urbanData?.femalePopulation || 0,
        households: urbanData?.totalHouseholds || 0,
      },
      
      metrics: {
        sexRatio: totalData.malePopulation 
          ? parseFloat(((totalData.femalePopulation || 0) / totalData.malePopulation * 1000).toFixed(0))
          : 0,
        childRatio: totalData.totalPopulation
          ? parseFloat(((totalData.childPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        scPercentage: totalData.totalPopulation
          ? parseFloat(((totalData.scPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        stPercentage: totalData.totalPopulation
          ? parseFloat(((totalData.stPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        urbanPercentage: totalData.totalPopulation
          ? parseFloat(((urbanData?.totalPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        ruralPercentage: totalData.totalPopulation
          ? parseFloat(((ruralData?.totalPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
      }
    };
    
    return summary;
  } catch (error) {
    console.error("Error fetching subdistrict demographics:", error);
    return null;
  }
}

/**
 * Get complete demographics for district (Total, Urban, Rural)
 */
export async function getDistrictDemographics(
  districtLgd: number
): Promise<DemographicsSummary | null> {
  try {
    // Fetch all 3 residence types
    const [totalData, ruralData, urbanData] = await Promise.all([
      Demographics.findOne({ 
        level: "district", 
        districtLgd, 
        residence: "total" 
      }),
      Demographics.findOne({ 
        level: "district", 
        districtLgd, 
        residence: "rural" 
      }),
      Demographics.findOne({ 
        level: "district", 
        districtLgd, 
        residence: "urban" 
      })
    ]);
    
    if (!totalData) return null;
    
    const summary: DemographicsSummary = {
      areaName: totalData.district || "Unknown",
      level: "district",
      districtLgd: districtLgd,
      
      total: {
        population: totalData.totalPopulation || 0,
        male: totalData.malePopulation || 0,
        female: totalData.femalePopulation || 0,
        households: totalData.totalHouseholds || 0,
        children: totalData.childPopulation || 0,
        sc: totalData.scPopulation || 0,
        st: totalData.stPopulation || 0,
      },
      
      rural: {
        population: ruralData?.totalPopulation || 0,
        male: ruralData?.malePopulation || 0,
        female: ruralData?.femalePopulation || 0,
        households: ruralData?.totalHouseholds || 0,
      },
      
      urban: {
        population: urbanData?.totalPopulation || 0,
        male: urbanData?.malePopulation || 0,
        female: urbanData?.femalePopulation || 0,
        households: urbanData?.totalHouseholds || 0,
      },
      
      metrics: {
        sexRatio: totalData.malePopulation 
          ? parseFloat(((totalData.femalePopulation || 0) / totalData.malePopulation * 1000).toFixed(0))
          : 0,
        childRatio: totalData.totalPopulation
          ? parseFloat(((totalData.childPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        scPercentage: totalData.totalPopulation
          ? parseFloat(((totalData.scPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        stPercentage: totalData.totalPopulation
          ? parseFloat(((totalData.stPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        urbanPercentage: totalData.totalPopulation
          ? parseFloat(((urbanData?.totalPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
        ruralPercentage: totalData.totalPopulation
          ? parseFloat(((ruralData?.totalPopulation || 0) / totalData.totalPopulation * 100).toFixed(2))
          : 0,
      }
    };
    
    return summary;
  } catch (error) {
    console.error("Error fetching district demographics:", error);
    return null;
  }
}

/**
 * Get all subdistricts with complete demographics
 */
export async function getAllSubdistrictsDemographics(): Promise<DemographicsSummary[]> {
  const subdistrictLgds = [778, 779, 780, 781, 782, 783];  // All 6 subdistricts
  const results: DemographicsSummary[] = [];
  
  for (const lgd of subdistrictLgds) {
    const demo = await getSubdistrictDemographics(lgd);
    if (demo) {
      results.push(demo);
    }
  }
  
  return results;
}

/**
 * Get village demographics (usually only has Total, not separate Urban/Rural)
 */
export async function getVillageDemographics(
  villageCode: string
): Promise<IDemographics | null> {
  return await Demographics.findOne({
    level: "village",
    townVillageCode: villageCode
  });
}

/**
 * Get complete demographics for a village in summary format (Total, Urban, Rural)
 * Villages are typically rural, so Urban will usually be 0
 */
export async function getVillageDemographicsSummary(
  villageCode: string
): Promise<DemographicsSummary | null> {
  try {
    // Fetch village data (usually only has "total" or "rural" residence)
    const villageData = await Demographics.findOne({
      level: "village",
      townVillageCode: villageCode
    });

    if (!villageData) return null;

    // Villages are typically rural, so if residence is "rural", use it for both total and rural
    // If residence is "total", assume it's rural
    const isRural = villageData.residence === "rural" || villageData.residence === "total";
    
    const totalPop = villageData.totalPopulation || 0;
    const totalMale = villageData.malePopulation || 0;
    const totalFemale = villageData.femalePopulation || 0;
    const totalHouseholds = villageData.totalHouseholds || 0;
    const totalChildren = villageData.childPopulation || 0;
    const totalSC = villageData.scPopulation || 0;
    const totalST = villageData.stPopulation || 0;

    // Build summary - villages are typically rural
    const summary: DemographicsSummary = {
      areaName: villageData.townVillageWard || villageData.areaName || "Unknown",
      level: "village",
      districtLgd: villageData.districtLgd,
      subdistrictLgd: villageData.subdistrictLgd,
      
      total: {
        population: totalPop,
        male: totalMale,
        female: totalFemale,
        households: totalHouseholds,
        children: totalChildren,
        sc: totalSC,
        st: totalST,
      },
      
      rural: {
        population: isRural ? totalPop : 0,
        male: isRural ? totalMale : 0,
        female: isRural ? totalFemale : 0,
        households: isRural ? totalHouseholds : 0,
      },
      
      urban: {
        population: 0, // Villages are typically rural
        male: 0,
        female: 0,
        households: 0,
      },
      
      metrics: {
        sexRatio: totalMale > 0
          ? parseFloat(((totalFemale / totalMale) * 1000).toFixed(0))
          : 0,
        childRatio: totalPop > 0
          ? parseFloat(((totalChildren / totalPop) * 100).toFixed(2))
          : 0,
        scPercentage: totalPop > 0
          ? parseFloat(((totalSC / totalPop) * 100).toFixed(2))
          : 0,
        stPercentage: totalPop > 0
          ? parseFloat(((totalST / totalPop) * 100).toFixed(2))
          : 0,
        urbanPercentage: 0, // Villages are typically rural
        ruralPercentage: isRural ? 100 : 0,
      }
    };
    
    return summary;
  } catch (error) {
    console.error("Error fetching village demographics summary:", error);
    return null;
  }
}

/**
 * Get complete demographics for a town in summary format (Total, Urban, Rural)
 * Towns are typically urban, so Rural will usually be 0
 */
export async function getTownDemographicsSummary(
  townCode: string
): Promise<DemographicsSummary | null> {
  try {
    // Fetch town data (usually has "urban" or "total" residence)
    const townData = await Demographics.findOne({
      level: "town",
      townVillageCode: townCode
    });

    if (!townData) return null;

    // Towns are typically urban
    const isUrban = townData.residence === "urban" || townData.residence === "total";
    
    const totalPop = townData.totalPopulation || 0;
    const totalMale = townData.malePopulation || 0;
    const totalFemale = townData.femalePopulation || 0;
    const totalHouseholds = townData.totalHouseholds || 0;
    const totalChildren = townData.childPopulation || 0;
    const totalSC = townData.scPopulation || 0;
    const totalST = townData.stPopulation || 0;

    // Build summary - towns are typically urban
    const summary: DemographicsSummary = {
      areaName: townData.townVillageWard || townData.areaName || "Unknown",
      level: "town",
      districtLgd: townData.districtLgd,
      subdistrictLgd: townData.subdistrictLgd,
      
      total: {
        population: totalPop,
        male: totalMale,
        female: totalFemale,
        households: totalHouseholds,
        children: totalChildren,
        sc: totalSC,
        st: totalST,
      },
      
      rural: {
        population: 0, // Towns are typically urban
        male: 0,
        female: 0,
        households: 0,
      },
      
      urban: {
        population: isUrban ? totalPop : 0,
        male: isUrban ? totalMale : 0,
        female: isUrban ? totalFemale : 0,
        households: isUrban ? totalHouseholds : 0,
      },
      
      metrics: {
        sexRatio: totalMale > 0
          ? parseFloat(((totalFemale / totalMale) * 1000).toFixed(0))
          : 0,
        childRatio: totalPop > 0
          ? parseFloat(((totalChildren / totalPop) * 100).toFixed(2))
          : 0,
        scPercentage: totalPop > 0
          ? parseFloat(((totalSC / totalPop) * 100).toFixed(2))
          : 0,
        stPercentage: totalPop > 0
          ? parseFloat(((totalST / totalPop) * 100).toFixed(2))
          : 0,
        urbanPercentage: isUrban ? 100 : 0,
        ruralPercentage: 0, // Towns are typically urban
      }
    };
    
    return summary;
  } catch (error) {
    console.error("Error fetching town demographics summary:", error);
    return null;
  }
}

/**
 * Get village count for a subdistrict
 */
export async function getSubdistrictVillageCount(
  subdistrictLgd: number
): Promise<number> {
  try {
    const count = await Demographics.countDocuments({
      level: "village",
      subdistrictLgd: subdistrictLgd
    });
    return count;
  } catch (error) {
    console.error("Error fetching village count:", error);
    return 0;
  }
}

/**
 * Search villages by name
 */
export async function searchVillagesByName(
  searchTerm: string,
  subdistrictLgd?: number
): Promise<IDemographics[]> {
  const query: any = {
    level: "village",
    townVillageWard: new RegExp(searchTerm, 'i')
  };
  
  if (subdistrictLgd) {
    query.subdistrictLgd = subdistrictLgd;
  }
  
  return await Demographics.find(query)
    .limit(20)
    .sort({ totalPopulation: -1 });
}

export default {
  getSubdistrictDemographics,
  getDistrictDemographics,
  getAllSubdistrictsDemographics,
  getVillageDemographics,
  getVillageDemographicsSummary,
  getTownDemographicsSummary,
  getSubdistrictVillageCount,
  searchVillagesByName,
};

