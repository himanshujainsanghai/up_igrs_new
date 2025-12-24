/**
 * Map Render Heat Map Component
 *
 * Pure rendering component - NO API calls or data fetching
 *
 * Responsibilities:
 * - Render GeoJSON data as a heat map using MapLibre GL
 * - Handle map interactions (click, hover, zoom, etc.)
 * - Calculate color scales based on data values
 * - Support multiple data levels: Districts, Subdistricts, Points of Interest
 * - Dynamically detect and render appropriate labels based on data structure
 * - Pass feature selection events to parent via callbacks
 *
 * Architecture:
 * - Receives all data as props (geoData)
 * - Never makes API calls - all data comes from parent
 * - Automatically detects data type (district/subdistrict/POI) from properties
 * - When feature is clicked, extracts identifier and calls onDistrictClick callback
 * - Parent component (ComplaintsHeatMapPage) handles all API calls
 *
 * Data Type Detection:
 * - Districts: properties.Name or properties.DISTRICT
 * - Subdistricts: properties.sdtname
 * - POIs: properties.name or properties.NAME (future)
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Map, { Source, Layer, Popup, MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection, Feature } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

// Uttar Pradesh center coordinates
const UP_CENTER: [number, number] = [26.8, 80.0];

// Uttar Pradesh bounds for restricting map view (west, south, east, north)
// Slightly more inclusive to keep full state visible while allowing pan
const UP_MAX_BOUNDS: [number, number, number, number] = [
  76.5, // west longitude
  23.5, // south latitude
  85.5, // east longitude
  31.0, // north latitude
];

// Data type enum for feature classification
enum FeatureDataType {
  DISTRICT = "district",
  SUBDISTRICT = "subdistrict",
  POINT_OF_INTEREST = "poi",
  UNKNOWN = "unknown",
}

interface MapRenderHeatMapProps {
  geoData: FeatureCollection;
  /**
   * Optional property name in feature.properties to use for color intensity
   * If not provided, all districts will have the same base color
   */
  valueProperty?: string;
  /**
   * Optional callback when a district is clicked/hovered (receives the feature)
   */
  onFeatureClick?: (feature: Feature) => void;
  /**
   * Callback when a district is clicked - receives district code for parent to handle API calls
   * Parent component should handle fetching district data via API
   */
  onDistrictClick?: (districtCode: string) => void;
  /**
   * Optional className for the container
   */
  className?: string;
  /**
   * Optional GeoJSON data for true density heatmap (should be Point features)
   * Used for MapLibre's native heatmap layer with smooth gradients
   */
  heatmapData?: FeatureCollection;
  /**
   * Toggle to show/hide the true heatmap layer
   */
  showHeatmap?: boolean;
  /**
   * Heatmap color scheme: 'complaints' | 'population' | 'custom'
   */
  heatmapColorScheme?: "complaints" | "population" | "custom";
}

interface PopupInfo {
  feature: Feature;
  longitude: number;
  latitude: number;
}

/**
 * Detect the data type of a feature based on its properties
 * Used to determine appropriate label property and rendering behavior
 */
const detectFeatureDataType = (feature: Feature): FeatureDataType => {
  const props = feature.properties || {};

  // Check for subdistrict (has sdtname property)
  if (props.sdtname) {
    return FeatureDataType.SUBDISTRICT;
  }

  // Check for district (has Name or DISTRICT property)
  if (props.Name || props.DISTRICT) {
    return FeatureDataType.DISTRICT;
  }

  // Check for POI (has name or NAME property, typically points)
  if (props.name || props.NAME) {
    return FeatureDataType.POINT_OF_INTEREST;
  }

  return FeatureDataType.UNKNOWN;
};

/**
 * Get the appropriate label property name for a feature based on its data type
 * Returns the property key that should be used for displaying labels
 */
const getLabelPropertyName = (feature: Feature): string | null => {
  const props = feature.properties || {};
  const dataType = detectFeatureDataType(feature);

  switch (dataType) {
    case FeatureDataType.SUBDISTRICT:
      return props.sdtname ? "sdtname" : null;
    case FeatureDataType.DISTRICT:
      return props.Name ? "Name" : props.DISTRICT ? "DISTRICT" : null;
    case FeatureDataType.POINT_OF_INTEREST:
      return props.name ? "name" : props.NAME ? "NAME" : null;
    default:
      return null;
  }
};

/**
 * Extract feature identifier for callbacks and state management
 * Handles different data types and property structures
 */
const extractFeatureIdentifier = (feature: Feature): string | null => {
  const props = feature.properties || {};
  const dataType = detectFeatureDataType(feature);

  switch (dataType) {
    case FeatureDataType.SUBDISTRICT:
      return (
        props.sdtname ||
        props.subdt_lgd?.toString() ||
        feature.id?.toString() ||
        null
      );
    case FeatureDataType.DISTRICT:
      return (
        props.districtCode ||
        props.Name ||
        props.DISTRICT ||
        feature.id?.toString() ||
        null
      );
    case FeatureDataType.POINT_OF_INTEREST:
      return props.id || props.name || feature.id?.toString() || null;
    default:
      return feature.id?.toString() || null;
  }
};

/**
 * Get display name for popup and tooltips
 * Returns a human-readable name based on feature data type
 */
const getFeatureDisplayName = (feature: Feature): string => {
  const props = feature.properties || {};
  const labelProp = getLabelPropertyName(feature);

  if (labelProp && props[labelProp]) {
    return String(props[labelProp]);
  }

  // Fallback to common property names
  return (
    props.Name ||
    props.DISTRICT ||
    props.sdtname ||
    props.name ||
    props.NAME ||
    "Location"
  );
};

const MapRenderHeatMap: React.FC<MapRenderHeatMapProps> = ({
  geoData,
  valueProperty,
  onFeatureClick,
  onDistrictClick,
  className = "",
  heatmapData,
  showHeatmap = false,
  heatmapColorScheme = "complaints",
}) => {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<
    string | number | null
  >(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [hasInitialFit, setHasInitialFit] = useState(false);

  // Auto-zoom to fit all features when geoData changes (only once)
  useEffect(() => {
    if (!mapRef.current || !geoData?.features?.length || hasInitialFit) return;

    // Calculate bounds from all features
    const bounds = {
      minLng: Infinity,
      maxLng: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity,
    };

    geoData.features.forEach((feature) => {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates[0].forEach((coord: number[]) => {
          bounds.minLng = Math.min(bounds.minLng, coord[0]);
          bounds.maxLng = Math.max(bounds.maxLng, coord[0]);
          bounds.minLat = Math.min(bounds.minLat, coord[1]);
          bounds.maxLat = Math.max(bounds.maxLat, coord[1]);
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon[0].forEach((coord: number[]) => {
            bounds.minLng = Math.min(bounds.minLng, coord[0]);
            bounds.maxLng = Math.max(bounds.maxLng, coord[0]);
            bounds.minLat = Math.min(bounds.minLat, coord[1]);
            bounds.maxLat = Math.max(bounds.maxLat, coord[1]);
          });
        });
      } else if (feature.geometry.type === "Point") {
        const [lng, lat] = feature.geometry.coordinates;
        bounds.minLng = Math.min(bounds.minLng, lng);
        bounds.maxLng = Math.max(bounds.maxLng, lng);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      }
    });

    // Fit map to calculated bounds with a small buffer to avoid tight zoom
    if (isFinite(bounds.minLng)) {
      const buffer = 0.25; // degree buffer to keep view comfortably zoomed out
      mapRef.current.fitBounds(
        [
          [bounds.minLng - buffer, bounds.minLat - buffer],
          [bounds.maxLng + buffer, bounds.maxLat + buffer],
        ],
        {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          duration: 800, // Smooth transition
          maxZoom: 6.0, // Prevent over-zooming after fit
        }
      );
      setHasInitialFit(true);
    }
  }, [geoData, hasInitialFit]);

  // Calculate min/max values for color interpolation
  const { minValue, maxValue } = useMemo(() => {
    if (!valueProperty || !geoData?.features) {
      return { minValue: 0, maxValue: 1 };
    }

    const values = geoData.features
      .map((feature) => {
        const value = feature.properties?.[valueProperty];
        return typeof value === "number" ? value : 0;
      })
      .filter((v) => v >= 0);

    if (values.length === 0) {
      return { minValue: 0, maxValue: 1 };
    }

    const positive = values.filter((v) => v > 0);
    const minPositive = positive.length > 0 ? Math.min(...positive) : 0;
    const maxPositive =
      positive.length > 0 ? Math.max(...positive) : Math.max(...values);

    // minValue is at least the smallest positive so small-but-nonzero districts still show color
    return {
      minValue: minPositive || 0,
      maxValue: maxPositive || 1,
    };
  }, [geoData, valueProperty]);

  // Get color based on value (heat map color scale)
  const getColor = useCallback(
    (value: number): string => {
      if (!valueProperty || maxValue === minValue) {
        return "#DC2626"; // Default red color
      }

      // Normalize using log scale to give small-but-nonzero values visible contrast
      const safeValue = Math.max(0, value);
      const logMax = Math.log1p(maxValue);
      const normalized =
        logMax > 0
          ? Math.log1p(safeValue) / logMax
          : (safeValue - minValue) / (maxValue - minValue);

      // Heat map color scale: Light Red -> Red -> Dark Red
      if (normalized < 0.2) {
        return "#FCA5A5"; // Light red
      } else if (normalized < 0.4) {
        return "#F87171"; // Red
      } else if (normalized < 0.6) {
        return "#EF4444"; // Medium red
      } else if (normalized < 0.8) {
        return "#DC2626"; // Dark red
      } else {
        return "#991B1B"; // Very dark red
      }
    },
    [minValue, maxValue, valueProperty]
  );

  // Process GeoJSON to add color properties and separate Points from Polygons
  const { polygonData, pointData } = useMemo(() => {
    if (!geoData?.features) {
      return { polygonData: geoData, pointData: null };
    }

    const polygons: Feature[] = [];
    const points: Feature[] = [];

    geoData.features.forEach((feature) => {
      // Get value from valueProperty (usually "heatValue")
      let value = valueProperty ? feature.properties?.[valueProperty] || 0 : 0;

      // Fallback: If heatValue is missing but totalComplaints exists, use that
      if (value === 0 && feature.properties?.totalComplaints) {
        value = feature.properties.totalComplaints;
      }

      const color = getColor(typeof value === "number" ? value : 0);

      const processedFeature = {
        ...feature,
        properties: {
          ...feature.properties,
          _color: color,
          _value: value,
        },
      };

      // Separate Point geometries from Polygon/LineString geometries
      if (feature.geometry.type === "Point") {
        points.push(processedFeature);
      } else {
        polygons.push(processedFeature);
      }
    });

    return {
      polygonData:
        polygons.length > 0
          ? ({
              type: "FeatureCollection",
              features: polygons,
            } as FeatureCollection)
          : null,
      pointData:
        points.length > 0
          ? ({
              type: "FeatureCollection",
              features: points,
            } as FeatureCollection)
          : null,
    };
  }, [geoData, valueProperty, getColor]);

  // Fill layer style for polygons (works for districts, subdistricts, villages, and POI areas)
  const fillLayerStyle = useMemo(
    () =>
      ({
        id: "features-fill",
        type: "fill" as const,
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "isVillageBoundary"], true],
            "#E5E7EB", // Light gray for village boundaries (distinct borders)
            ["==", ["get", "isHighlight"], true],
            "#ff671f", // Orange for selected village
            [
              "case",
              // Check if this district is being hovered
              [
                "all",
                ["has", "Name"],
                ["!=", ["get", "Name"], null],
                ["==", ["get", "Name"], hoveredDistrict || ""],
              ],
              "#F47216", // BJP Saffron color on hover
              [
                "all",
                ["has", "DISTRICT"],
                ["!=", ["get", "DISTRICT"], null],
                ["==", ["get", "DISTRICT"], hoveredDistrict || ""],
              ],
              "#F47216", // BJP Saffron color on hover
              ["get", "_color"], // Use color from properties (heat map)
            ],
          ] as any,
          "fill-opacity": [
            "case",
            ["==", ["get", "isVillageBoundary"], true],
            0.3, // Slightly visible for village boundaries
            ["==", ["get", "isHighlight"], true],
            0.5, // Semi-transparent for selected village
            [
              "case",
              // Higher opacity on hover
              [
                "all",
                ["has", "Name"],
                ["!=", ["get", "Name"], null],
                ["==", ["get", "Name"], hoveredDistrict || ""],
              ],
              0.8,
              [
                "all",
                ["has", "DISTRICT"],
                ["!=", ["get", "DISTRICT"], null],
                ["==", ["get", "DISTRICT"], hoveredDistrict || ""],
              ],
              0.8,
              0.6,
            ],
          ] as any,
        },
      } as any),
    [hoveredDistrict]
  );

  // Outline layer style (works for all polygon features)
  const lineLayerStyle = useMemo(
    () =>
      ({
        id: "features-outline",
        type: "line" as const,
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "isVillageBoundary"], true],
            "#374151", // Dark gray/black for village boundaries (distinct borders)
            ["==", ["get", "isHighlight"], true],
            "#ff671f", // Orange for selected village boundary
            [
              "case",
              // BJP Saffron border on hover
              [
                "all",
                ["has", "Name"],
                ["!=", ["get", "Name"], null],
                ["==", ["get", "Name"], hoveredDistrict || ""],
              ],
              "#F47216", // BJP Saffron
              [
                "all",
                ["has", "DISTRICT"],
                ["!=", ["get", "DISTRICT"], null],
                ["==", ["get", "DISTRICT"], hoveredDistrict || ""],
              ],
              "#F47216", // BJP Saffron
              "#ffffff",
            ],
          ] as any,
          "line-width": [
            "case",
            ["==", ["get", "isVillageBoundary"], true],
            1.5, // Thicker lines for clear village boundaries
            ["==", ["get", "isHighlight"], true],
            3, // Thick line for selected village
            [
              "case",
              // Thicker border on hover
              [
                "all",
                ["has", "Name"],
                ["!=", ["get", "Name"], null],
                ["==", ["get", "Name"], hoveredDistrict || ""],
              ],
              3,
              [
                "all",
                ["has", "DISTRICT"],
                ["!=", ["get", "DISTRICT"], null],
                ["==", ["get", "DISTRICT"], hoveredDistrict || ""],
              ],
              3,
              1,
            ],
          ] as any,
          "line-opacity": [
            "case",
            ["==", ["get", "isVillageBoundary"], true],
            0.8, // More visible village boundaries
            ["==", ["get", "isHighlight"], true],
            1, // Full opacity for selected
            0.8,
          ] as any,
        },
      } as any),
    [hoveredDistrict]
  );

  // Detect label property from first feature to determine data type
  const detectedLabelProperty = useMemo(() => {
    if (!geoData?.features || geoData.features.length === 0) {
      return "Name"; // Default fallback
    }

    const firstFeature = geoData.features[0];
    const labelProp = getLabelPropertyName(firstFeature);
    return labelProp || "Name"; // Fallback to "Name" if not detected
  }, [geoData]);

  // Label layer style for polygons - dynamically uses detected label property
  // Supports: districts (Name), subdistricts (sdtname)
  // Now includes complaint numbers in labels
  const polygonLabelLayerStyle = useMemo(
    () =>
      ({
        id: "polygon-labels",
        type: "symbol" as const,
        layout: {
          // Concatenate name with complaint count
          // Format: "District Name\n(Complaints: X)" or just "Name" if no count available
          "text-field": [
            "concat",
            [
              "coalesce",
              ["get", detectedLabelProperty],
              ["get", "Name"],
              ["get", "sdtname"],
              ["get", "DISTRICT"],
              "",
            ],
            [
              "case",
              // Check if complaintCount exists (for subdistricts) - show even if 0
              ["has", "complaintCount"],
              [
                "concat",
                "\n(",
                ["to-string", ["get", "complaintCount"]],
                " complaints)",
              ],
              // Check if totalComplaints exists (for districts) - show even if 0
              ["has", "totalComplaints"],
              [
                "concat",
                "\n(",
                ["to-string", ["get", "totalComplaints"]],
                " complaints)",
              ],
              // Check if heatValue exists and is > 0 (for districts without totalComplaints)
              ["all", ["has", "heatValue"], [">", ["get", "heatValue"], 0]],
              ["concat", "\n(Heat: ", ["to-string", ["get", "heatValue"]], ")"],
              // No complaint data available
              "",
            ],
          ] as any,
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            10, // At zoom 5, text size 10
            6.5,
            12, // At zoom 6.5 (initial), text size 12
            8,
            14, // At zoom 8, text size 14
            10,
            16, // At zoom 10, text size 16
          ] as any,
          "text-anchor": "center" as const,
          "text-allow-overlap": false as const, // Prevent overlapping labels
          "text-ignore-placement": false as const,
          "symbol-placement": "point" as const, // Place labels at polygon centroids
          "text-optional": true as const, // Allow labels to be hidden if they don't fit
        },
        paint: {
          "text-color": "#000000", // Black text for visibility
          "text-halo-color": "#FFFFFF", // White halo for contrast
          "text-halo-width": 2.5, // Halo width for better visibility against colored backgrounds
          "text-halo-blur": 1,
          "text-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1, // Full opacity on hover
            0.95, // High opacity normally for good visibility
          ] as any,
        },
      } as any),
    [detectedLabelProperty]
  );

  // Circle layer style for POI points
  const pointCircleLayerStyle = useMemo(
    () =>
      ({
        id: "poi-points",
        type: "circle" as const,
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "isComplaint"], true],
            [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,
              8, // Complaints are larger
              8,
              12,
              10,
              14,
            ],
            ["interpolate", ["linear"], ["zoom"], 5, 5, 6.5, 7, 8, 9, 10, 11],
          ] as any,
          "circle-color": [
            "case",
            ["==", ["get", "isComplaint"], true],
            [
              "match",
              ["get", "priority"],
              "urgent",
              "#DC2626", // Red for urgent
              "high",
              "#ff671f", // Orange for high
              "medium",
              "#ff671f", // Orange for medium
              "low",
              "#10B981", // Green for low
              "#EF4444", // Default red for complaints
            ],
            ["boolean", ["feature-state", "hover"], false],
            "#ff671f", // Orange on hover
            "#3B82F6", // Blue for POI points
          ] as any,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3,
            2,
          ] as any,
          "circle-stroke-color": "#FFFFFF",
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            0.9,
          ] as any,
        },
      } as any),
    []
  );

  // Label layer style for POI points (includes villages with complaint counts)
  const pointLabelLayerStyle = useMemo(
    () =>
      ({
        id: "poi-labels",
        type: "symbol" as const,
        layout: {
          // Use name property for POI labels, with complaint count for villages
          "text-field": [
            "concat",
            [
              "coalesce",
              ["get", "name"],
              ["get", "villageName"],
              ["get", "village_name"],
              ["get", "VillageName"],
              ["get", "Asset_Name"],
              ["get", "NAME"],
              "",
            ],
            // Add complaint count for villages, towns, and wards if available
            [
              "case",
              // Check if it has complaintCount property (villages, towns, wards)
              ["has", "complaintCount"],
              [
                "concat",
                "\n(",
                ["to-string", ["get", "complaintCount"]],
                " complaints)",
              ],
              "",
            ],
          ] as any,
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            10, // At zoom 5, text size 10
            6.5,
            12, // At zoom 6.5 (initial), text size 12
            8,
            14, // At zoom 8, text size 14
            10,
            16, // At zoom 10, text size 16
          ] as any,
          "text-anchor": "top" as const,
          "text-offset": [0, 1.5] as any, // Position label above the point
          "text-allow-overlap": false as const,
          "text-ignore-placement": false as const,
          "text-optional": true as const,
        },
        paint: {
          "text-color": "#1F2937", // Dark gray text
          "text-halo-color": "#FFFFFF", // White halo for contrast
          "text-halo-width": 2, // Halo width
          "text-halo-blur": 1,
          "text-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1, // Full opacity on hover
            0.95, // High opacity normally
          ] as any,
        },
      } as any),
    []
  );

  // TRUE HEATMAP LAYER - Density visualization with smooth gradients
  // Shows concentration of points (complaints, incidents, etc.)
  const heatmapLayerStyle = useMemo(() => {
    // Define color schemes
    const colorSchemes = {
      complaints: {
        colors: [
          "rgba(255,255,255,0)", // Transparent
          "#FEF3C7", // Very light yellow
          "#FCD34D", // Yellow
          "#F97316", // Orange
          "#DC2626", // Red
          "#991B1B", // Dark red
        ],
        stops: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
      population: {
        colors: [
          "rgba(255,255,255,0)", // Transparent
          "#D1FAE5", // Light green
          "#6EE7B7", // Green
          "#10B981", // Emerald
          "#059669", // Dark green
          "#047857", // Very dark green
        ],
        stops: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
      custom: {
        colors: [
          "rgba(33,102,172,0)", // Transparent blue
          "rgb(103,169,207)", // Light blue
          "rgb(209,229,240)", // Pale blue
          "rgb(253,219,199)", // Pale orange
          "rgb(239,138,98)", // Orange
          "rgb(178,24,43)", // Dark red
        ],
        stops: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    };

    const scheme = colorSchemes[heatmapColorScheme] || colorSchemes.complaints;
    const colorExpression: any[] = [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
    ];

    scheme.stops.forEach((stop, index) => {
      colorExpression.push(stop, scheme.colors[index]);
    });

    return {
      id: "complaints-heatmap",
      type: "heatmap" as const,
      maxzoom: 12, // Hide heatmap at high zoom levels
      paint: {
        // Weight heatmap based on value property (complaint count, priority, etc.)
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "_value"],
          0,
          0,
          5,
          0.3,
          10,
          0.6,
          20,
          0.8,
          50,
          1,
        ] as any,
        // Intensity increases with zoom to maintain visibility
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          1,
          6,
          1.5,
          12,
          3,
        ] as any,
        // Dynamic color gradient based on scheme
        "heatmap-color": colorExpression as any,
        // Radius of heatmap blur effect
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          2,
          5,
          10,
          8,
          20,
          12,
          30,
        ] as any,
        // Fade out heatmap as you zoom in (individual points become visible)
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.9,
          8,
          0.7,
          10,
          0.4,
          12,
          0,
        ] as any,
      },
    } as any;
  }, [heatmapColorScheme]);

  // Circle layer to show individual points when heatmap fades out
  const heatmapCircleLayerStyle = useMemo(
    () =>
      ({
        id: "heatmap-circles",
        type: "circle" as const,
        minzoom: 9, // Show circles as heatmap fades
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            3,
            10,
            5,
            12,
            8,
            14,
            12,
          ] as any,
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "_value"],
            0,
            "#10B981", // Green for low
            5,
            "#ff671f", // Orange for medium
            10,
            "#ff671f", // Orange for high
            20,
            "#DC2626", // Red for very high
          ] as any,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
          // Fade in circles as heatmap fades out
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            0,
            10,
            0.3,
            11,
            0.7,
            12,
            1,
          ] as any,
          "circle-stroke-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            0,
            10,
            0.5,
            12,
            1,
          ] as any,
        },
      } as any),
    []
  );

  // Handle feature click - works for districts, subdistricts, and POIs
  const handleClick = useCallback(
    (e: any) => {
      const feature = e.features?.[0];
      if (feature) {
        const [longitude, latitude] = e.lngLat.toArray();
        setPopupInfo({
          feature,
          longitude,
          latitude,
        });

        // Extract feature identifier using helper function
        const featureIdentifier = extractFeatureIdentifier(feature);

        // Pass feature identifier to parent component for API calls
        if (featureIdentifier && onDistrictClick) {
          onDistrictClick(String(featureIdentifier));
        }

        // Optional callback for feature click
        if (onFeatureClick) {
          onFeatureClick(feature);
        }
      }
    },
    [onFeatureClick, onDistrictClick]
  );

  // Handle mouse move for hover effects on districts
  const handleMouseMove = useCallback(
    (event: any) => {
      if (!mapRef.current) return;

      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: ["features-fill"],
      });

      if (features && features.length > 0) {
        const feature = features[0];
        // Check if it's a district (has Name or DISTRICT property and not a village boundary)
        const districtName =
          feature.properties?.Name ||
          feature.properties?.DISTRICT ||
          feature.properties?.districtName;

        if (districtName && !feature.properties?.isVillageBoundary) {
          if (hoveredDistrict !== districtName) {
            setHoveredDistrict(districtName);
            mapRef.current.getCanvas().style.cursor = "pointer";
          }
        } else {
          if (hoveredDistrict !== null) {
            setHoveredDistrict(null);
            mapRef.current.getCanvas().style.cursor = "";
          }
        }
      } else {
        if (hoveredDistrict !== null) {
          setHoveredDistrict(null);
          mapRef.current.getCanvas().style.cursor = "";
        }
      }
    },
    [hoveredDistrict]
  );

  const handleMouseLeave = useCallback(
    (e: any) => {
      const map = e.target;
      map.getCanvas().style.cursor = "";
      if (hoveredFeatureId !== null) {
        // Try to reset on both sources
        try {
          map.setFeatureState(
            { source: "map-features", id: hoveredFeatureId },
            { hover: false }
          );
        } catch (e) {
          // Source might not exist, ignore
        }
        try {
          map.setFeatureState(
            { source: "poi-features", id: hoveredFeatureId },
            { hover: false }
          );
        } catch (e) {
          // Source might not exist, ignore
        }
        setHoveredFeatureId(null);
      }
    },
    [hoveredFeatureId]
  );

  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width: "100%", height: "100%" }}
      >
        <p className="text-muted-foreground">No map data available</p>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: UP_CENTER[1],
          latitude: UP_CENTER[0],
          zoom: 5.0, // Start more zoomed out to show full state
        }}
        maxBounds={UP_MAX_BOUNDS}
        maxZoom={15}
        minZoom={4.3} // Allow zooming out further to see full state
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        interactiveLayerIds={[
          "features-fill",
          "poi-points",
          "complaint-markers",
          "heatmap-circles",
        ]}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        scrollZoom={true}
        boxZoom={true}
        dragRotate={false}
        doubleClickZoom={true}
        keyboard={true}
      >
        {/* Polygon layers (districts, subdistricts) */}
        {polygonData && (
          <Source id="map-features" type="geojson" data={polygonData}>
            <Layer {...fillLayerStyle} />
            <Layer {...lineLayerStyle} />
            <Layer {...polygonLabelLayerStyle} />
          </Source>
        )}

        {/* TRUE DENSITY HEATMAP LAYER - MapLibre native heatmap with smooth gradients */}
        {showHeatmap &&
          heatmapData &&
          heatmapData.features &&
          heatmapData.features.length > 0 && (
            <Source id="heatmap-source" type="geojson" data={heatmapData}>
              {/* Heatmap blur effect - visible at low to medium zoom */}
              <Layer {...heatmapLayerStyle} />
              {/* Individual circles - fade in at high zoom as heatmap fades out */}
              <Layer {...heatmapCircleLayerStyle} />
            </Source>
          )}

        {/* Point layers (POIs and Complaints) */}
        {pointData && (
          <Source id="poi-features" type="geojson" data={pointData}>
            <Layer {...pointCircleLayerStyle} />
            <Layer {...pointLabelLayerStyle} />
          </Source>
        )}

        {/* Complaint markers layer (on top of everything) */}
        {pointData && (
          <Source id="complaint-markers-source" type="geojson" data={pointData}>
            <Layer
              id="complaint-markers"
              type="circle"
              filter={["==", ["get", "isComplaint"], true]}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  5,
                  10, // Larger at low zoom
                  8,
                  14,
                  10,
                  18,
                ] as any,
                "circle-color": "#FFFFFF", // White background
                "circle-stroke-width": 3,
                "circle-stroke-color": "#000000", // Black border
                "circle-opacity": 1,
              }}
            />
            <Layer
              id="complaint-labels"
              type="symbol"
              filter={["==", ["get", "isComplaint"], true]}
              layout={
                {
                  "text-field": ["get", "village_name"],
                  "text-size": 11,
                  "text-anchor": "top",
                  "text-offset": [0, 1.5],
                  "text-optional": true,
                } as any
              }
              paint={{
                "text-color": "#000000",
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 2,
              }}
            />
          </Source>
        )}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div style={{ minWidth: "150px", padding: "4px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {getFeatureDisplayName(popupInfo.feature)}
              </div>

              {/* Show POI type if it's a Point of Interest */}
              {popupInfo.feature.geometry.type === "Point" && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#999",
                    marginBottom: "4px",
                  }}
                >
                  {popupInfo.feature.properties?.poiType ||
                    popupInfo.feature.properties?.Type ||
                    "Point of Interest"}
                </div>
              )}

              {/* Show data type if available (for subdistricts) */}
              {popupInfo.feature.properties?.sdtname && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#999",
                    marginBottom: "4px",
                  }}
                >
                  Subdistrict
                </div>
              )}

              {/* Show Asset Name for POIs if different from name */}
              {popupInfo.feature.properties?.Asset_Name &&
                popupInfo.feature.properties?.Asset_Name !==
                  popupInfo.feature.properties?.name && (
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>
                    Asset: {popupInfo.feature.properties.Asset_Name}
                  </div>
                )}

              {valueProperty &&
                popupInfo.feature.properties?.[valueProperty] !== undefined && (
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>
                    Heat Value:{" "}
                    {typeof popupInfo.feature.properties[valueProperty] ===
                    "number"
                      ? popupInfo.feature.properties[
                          valueProperty
                        ].toLocaleString()
                      : popupInfo.feature.properties[valueProperty]}
                  </div>
                )}
              {popupInfo.feature.properties?.totalComplaints !== undefined && (
                <div style={{ fontSize: "0.875rem", color: "#666" }}>
                  Total Complaints:{" "}
                  {popupInfo.feature.properties.totalComplaints}
                </div>
              )}
              {/* Show coordinates for POI points */}
              {popupInfo.feature.geometry.type === "Point" &&
                popupInfo.feature.geometry.coordinates && (
                  <div style={{ fontSize: "0.75rem", color: "#999" }}>
                    Coordinates:{" "}
                    {popupInfo.feature.geometry.coordinates[1].toFixed(6)},{" "}
                    {popupInfo.feature.geometry.coordinates[0].toFixed(6)}
                  </div>
                )}
              {/* Show subdistrict LGD code if available */}
              {popupInfo.feature.properties?.subdt_lgd && (
                <div style={{ fontSize: "0.75rem", color: "#999" }}>
                  LGD Code: {popupInfo.feature.properties.subdt_lgd}
                </div>
              )}
              {/* Show district ID if available */}
              {popupInfo.feature.properties?.d_id_11 && (
                <div style={{ fontSize: "0.75rem", color: "#999" }}>
                  ID: {popupInfo.feature.properties.d_id_11}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapRenderHeatMap;
