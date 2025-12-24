/**
 * Heatmap Utilities
 * 
 * Functions for transforming data into heatmap-compatible GeoJSON format
 * for use with MapLibre's native heatmap layer
 */

import type { FeatureCollection, Feature, Point } from "geojson";

/**
 * Priority weight mapping for complaints
 * Higher values = more intense on heatmap
 */
export const getPriorityWeight = (priority: string): number => {
  const weights: Record<string, number> = {
    urgent: 25,
    high: 15,
    medium: 10,
    low: 5,
  };
  return weights[priority?.toLowerCase()] || 5;
};

/**
 * Status weight mapping for complaints
 * Can be used for heatmaps showing urgency by status
 */
export const getStatusWeight = (status: string): number => {
  const weights: Record<string, number> = {
    pending: 20,
    in_progress: 15,
    resolved: 5,
    rejected: 3,
  };
  return weights[status?.toLowerCase()] || 10;
};

/**
 * Category weight mapping for complaints
 * Different categories may have different urgency levels
 */
export const getCategoryWeight = (category: string): number => {
  const weights: Record<string, number> = {
    roads: 15,
    water: 20,
    electricity: 18,
    health: 25,
    education: 12,
    documents: 8,
    sanitation: 16,
    other: 10,
  };
  return weights[category?.toLowerCase()] || 10;
};

/**
 * Transform complaint data into heatmap-compatible GeoJSON
 * 
 * @param complaints - Array of complaint objects with lat/lng
 * @param weightBy - Property to weight by: 'priority' | 'status' | 'category' | 'count'
 * @returns GeoJSON FeatureCollection of Point features
 */
export const createComplaintHeatmapData = (
  complaints: any[],
  weightBy: "priority" | "status" | "category" | "count" = "priority"
): FeatureCollection => {
  // Filter complaints that have coordinates
  const validComplaints = complaints.filter(
    (c) => c.latitude && c.longitude && 
           typeof c.latitude === 'number' && 
           typeof c.longitude === 'number' &&
           !isNaN(c.latitude) && 
           !isNaN(c.longitude)
  );

  const features: Feature<Point>[] = validComplaints.map((complaint) => {
    let weight = 10; // Default weight

    // Calculate weight based on specified property
    switch (weightBy) {
      case "priority":
        weight = getPriorityWeight(complaint.priority);
        break;
      case "status":
        weight = getStatusWeight(complaint.status);
        break;
      case "category":
        weight = getCategoryWeight(complaint.category);
        break;
      case "count":
        weight = 1; // Each complaint counts equally
        break;
    }

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [complaint.longitude, complaint.latitude],
      },
      properties: {
        _value: weight,
        priority: complaint.priority || "medium",
        category: complaint.category || "other",
        status: complaint.status || "pending",
        villageCode: complaint.villageCode || "",
        villageName: complaint.villageName || complaint.village_name || "",
        title: complaint.title || "",
        description: complaint.description || "",
        complaintId: complaint._id || complaint.id || "",
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * Transform village/town population data into heatmap GeoJSON
 * 
 * @param locations - Array of villages/towns with population and coordinates
 * @param populationType - Which population to use: 'total' | 'urban' | 'rural'
 * @returns GeoJSON FeatureCollection of Point features
 */
export const createPopulationHeatmapData = (
  locations: any[],
  populationType: "total" | "urban" | "rural" = "total"
): FeatureCollection => {
  // Filter locations with valid coordinates
  const validLocations = locations.filter(
    (loc) => loc.latitude && loc.longitude &&
             typeof loc.latitude === 'number' && 
             typeof loc.longitude === 'number' &&
             !isNaN(loc.latitude) && 
             !isNaN(loc.longitude)
  );

  const features: Feature<Point>[] = validLocations.map((location) => {
    let population = 0;

    // Get population based on type
    switch (populationType) {
      case "total":
        population = location.totalPopulation || location.population || 0;
        break;
      case "urban":
        population = location.urbanPopulation || 0;
        break;
      case "rural":
        population = location.ruralPopulation || 0;
        break;
    }

    // Normalize population to weight (0-50 scale)
    // Assuming max population of 100,000 for a village/town
    const weight = Math.min(50, Math.max(1, (population / 2000)));

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
      properties: {
        _value: weight,
        name: location.areaName || location.villageName || location.name || "",
        population: population,
        totalPopulation: location.totalPopulation || 0,
        urbanPopulation: location.urbanPopulation || 0,
        ruralPopulation: location.ruralPopulation || 0,
        subdistrict: location.subdistrict || "",
        lgdCode: location.lgdCode || location.villageCode || "",
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * Transform officer/asset locations into heatmap GeoJSON
 * 
 * @param assets - Array of assets with coordinates
 * @param weightProperty - Property to use for weighting (e.g., 'capacity', 'count')
 * @returns GeoJSON FeatureCollection of Point features
 */
export const createAssetHeatmapData = (
  assets: any[],
  weightProperty?: string
): FeatureCollection => {
  const validAssets = assets.filter(
    (asset) => asset.latitude && asset.longitude &&
               typeof asset.latitude === 'number' && 
               typeof asset.longitude === 'number' &&
               !isNaN(asset.latitude) && 
               !isNaN(asset.longitude)
  );

  const features: Feature<Point>[] = validAssets.map((asset) => {
    // Calculate weight
    let weight = 10; // Default
    if (weightProperty && asset[weightProperty]) {
      weight = Number(asset[weightProperty]) || 10;
    }

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [asset.longitude, asset.latitude],
      },
      properties: {
        _value: weight,
        name: asset.name || asset.Asset_Name || "",
        type: asset.type || asset.Type || "",
        category: asset.category || "",
        ...asset,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * Combine multiple heatmap datasets into one
 * Useful for overlaying different data sources
 * 
 * @param datasets - Array of GeoJSON FeatureCollections
 * @returns Combined GeoJSON FeatureCollection
 */
export const combineHeatmapData = (
  datasets: FeatureCollection[]
): FeatureCollection => {
  const allFeatures: Feature<Point>[] = [];

  datasets.forEach((dataset) => {
    if (dataset && dataset.features) {
      allFeatures.push(...(dataset.features as Feature<Point>[]));
    }
  });

  return {
    type: "FeatureCollection",
    features: allFeatures,
  };
};

/**
 * Filter heatmap data by various criteria
 * 
 * @param data - GeoJSON FeatureCollection
 * @param filters - Filter criteria
 * @returns Filtered GeoJSON FeatureCollection
 */
export const filterHeatmapData = (
  data: FeatureCollection,
  filters: {
    minValue?: number;
    maxValue?: number;
    priority?: string;
    status?: string;
    category?: string;
    subdistrict?: string;
  }
): FeatureCollection => {
  let filteredFeatures = [...data.features];

  // Filter by value range
  if (filters.minValue !== undefined) {
    filteredFeatures = filteredFeatures.filter(
      (f) => (f.properties?._value || 0) >= filters.minValue!
    );
  }
  if (filters.maxValue !== undefined) {
    filteredFeatures = filteredFeatures.filter(
      (f) => (f.properties?._value || 0) <= filters.maxValue!
    );
  }

  // Filter by priority
  if (filters.priority) {
    filteredFeatures = filteredFeatures.filter(
      (f) => f.properties?.priority === filters.priority
    );
  }

  // Filter by status
  if (filters.status) {
    filteredFeatures = filteredFeatures.filter(
      (f) => f.properties?.status === filters.status
    );
  }

  // Filter by category
  if (filters.category) {
    filteredFeatures = filteredFeatures.filter(
      (f) => f.properties?.category === filters.category
    );
  }

  // Filter by subdistrict
  if (filters.subdistrict) {
    filteredFeatures = filteredFeatures.filter(
      (f) => f.properties?.subdistrict === filters.subdistrict
    );
  }

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
};

/**
 * Get statistics from heatmap data
 * 
 * @param data - GeoJSON FeatureCollection
 * @returns Statistics object
 */
export const getHeatmapStats = (data: FeatureCollection) => {
  const values = data.features
    .map((f) => f.properties?._value || 0)
    .filter((v) => v > 0);

  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      total: 0,
    };
  }

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    total: values.reduce((a, b) => a + b, 0),
  };
};



