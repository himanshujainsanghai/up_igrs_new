/**
 * Village Boundary Generation Service
 * 
 * Generates Voronoi polygons (Thiessen polygons) from village points
 * Creates proper administrative-style boundaries
 * Uses Turf.js for accurate Voronoi tessellation
 */

import Village from "../models/Village";
import logger from "../config/logger";

// Note: Voronoi calculation is done on frontend using Turf.js
// This service provides village points for frontend to process

/**
 * Get villages with coordinates for boundary generation
 */
export const getVillagesForBoundaries = async (subdistrictLgd: number) => {
  try {
    const villages = await Village.find({
      subdistrictLgd,
      isGeocoded: true,
    }).select("villageName lgdCode latitude longitude subdistrictName districtName");

    if (villages.length < 3) {
      logger.warn(
        `Not enough villages (${villages.length}) in sub-district ${subdistrictLgd} to generate boundaries`
      );
      return [];
    }

    return villages.map(v => ({
      villageName: v.villageName,
      lgdCode: v.lgdCode,
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      subdistrictName: v.subdistrictName,
      districtName: v.districtName,
    }));
  } catch (error: any) {
    logger.error("Error getting villages for boundaries:", error.message);
    throw error;
  }
};

/**
 * Generate simple polygon boundaries for villages
 * Creates irregular polygons based on distance between villages
 */
export const generateVillageBoundaries = async (subdistrictLgd: number) => {
  try {
    const villages = await Village.find({
      subdistrictLgd,
      isGeocoded: true,
    });

    if (villages.length < 3) {
      logger.warn(
        `Not enough villages (${villages.length}) in sub-district ${subdistrictLgd}`
      );
      return null;
    }

    // Generate boundaries using variable radius based on nearest neighbor
    const features = await Promise.all(
      villages.map(async (village, idx) => {
        const lng = Number(village.longitude);
        const lat = Number(village.latitude);
        
        // Find distance to nearest village
        let minDistance = Infinity;
        for (let j = 0; j < villages.length; j++) {
          if (j === idx) continue;
          const otherLng = Number(villages[j].longitude);
          const otherLat = Number(villages[j].latitude);
          const distance = Math.sqrt(
            Math.pow(lng - otherLng, 2) + Math.pow(lat - otherLat, 2)
          );
          minDistance = Math.min(minDistance, distance);
        }

        // Use half the distance to nearest village as radius
        const radius = Math.min(minDistance / 2, 0.03); // Cap at ~3km
        
        // Create irregular polygon (8 sides with slight variations)
        const points = 8;
        const coordinates = [];
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          // Add slight random variation for more natural look
          const radiusVariation = radius * (0.8 + Math.random() * 0.4);
          const x = lng + radiusVariation * Math.cos(angle);
          const y = lat + radiusVariation * Math.sin(angle);
          coordinates.push([x, y]);
        }

        return {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [coordinates],
          },
          properties: {
            villageName: village.villageName,
            lgdCode: village.lgdCode,
            subdistrictName: village.subdistrictName,
            subdistrictLgd: village.subdistrictLgd,
            districtName: village.districtName,
            type: "village-boundary",
            isVillageBoundary: true,
          },
        };
      })
    );

    return {
      type: "FeatureCollection",
      features,
    };
  } catch (error: any) {
    logger.error("Error generating village boundaries:", error.message);
    throw error;
  }
};

/**
 * Generate village boundaries for all sub-districts in Badaun
 */
export const generateAllBadaunVillageBoundaries = async () => {
  try {
    const badaunSubDistricts = [780, 779, 782, 783, 781]; // Bilsi, Bisauli, Budaun, Dataganj, Sahaswan
    
    const allFeatures: any[] = [];

    for (const subdistrictLgd of badaunSubDistricts) {
      const boundaryData = await generateVillageBoundaries(subdistrictLgd);
      if (boundaryData && boundaryData.features) {
        allFeatures.push(...boundaryData.features);
      }
    }

    logger.info(`Generated boundaries for ${allFeatures.length} villages`);

    return {
      type: "FeatureCollection",
      features: allFeatures,
    };
  } catch (error: any) {
    logger.error("Error generating all village boundaries:", error.message);
    throw error;
  }
};

