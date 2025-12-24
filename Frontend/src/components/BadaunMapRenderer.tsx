/**
 * Badaun Map Renderer
 * Specialized map component centered on Badaun district
 * With proper zoom controls and bounds
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Map, { Source, Layer, MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

// Badaun district center coordinates (adjusted for sidebar on left)
const BADAUN_CENTER: [number, number] = [28.0, 79.15]; // [lat, lng] - shifted right to account for sidebar

// Badaun district bounds (wider to allow panning)
const BADAUN_BOUNDS: [number, number, number, number] = [
  78.3, // west longitude (more room to pan left)
  27.5, // south latitude (more room to pan down)
  79.8, // east longitude (more room to pan right)
  28.7, // north latitude (more room to pan up)
];

// Simple point-in-polygon using ray casting; works for Polygon/MultiPolygon
const isPointInPolygon = (point: [number, number], polygon: any): boolean => {
  const [x, y] = point;
  let inside = false;

  const checkRing = (ring: number[][]) => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
  };

  if (polygon.geometry.type === "Polygon") {
    if (polygon.geometry.coordinates[0]) {
      checkRing(polygon.geometry.coordinates[0]);
    }
  } else if (polygon.geometry.type === "MultiPolygon") {
    polygon.geometry.coordinates.forEach((poly: number[][][]) => {
      if (poly[0]) {
        checkRing(poly[0]);
      }
    });
  }

  return inside;
};

interface BadaunMapRendererProps {
  geoData: FeatureCollection;
  onFeatureClick?: (feature: any) => void;
  heatmapData?: FeatureCollection | null;
  showHeatmap?: boolean;
  heatmapColorScheme?: "complaints" | "population" | "custom";
  selectedSubdistrict?: string | null;
}

const BadaunMapRenderer: React.FC<BadaunMapRendererProps> = ({
  geoData,
  onFeatureClick,
  heatmapData,
  showHeatmap = false,
  heatmapColorScheme = "complaints",
  selectedSubdistrict = null,
}) => {
  const mapRef = useRef<MapRef>(null);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [hoveredSubdistrict, setHoveredSubdistrict] = useState<string | null>(
    null
  );

  // Adjust map bounds when subdistrict is selected
  useEffect(() => {
    if (!selectedSubdistrict || !mapRef.current) return;

    const polygonFeatures = geoData.features.filter(
      (f) =>
        (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") &&
        !f.properties?.isVillageBoundary &&
        !f.properties?.isHighlight
    );

    if (polygonFeatures.length === 0) return;

    const subdistrictFeature = polygonFeatures.find((feature: any) => {
      const subdistrictName =
        feature.properties?.sdtname || feature.properties?.name;
      return subdistrictName === selectedSubdistrict;
    });

    if (!subdistrictFeature) return;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const extractBounds = (coords: any) => {
      if (Array.isArray(coords)) {
        if (typeof coords[0] === "number" && coords.length >= 2) {
          const [lng, lat] = coords;
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        } else {
          coords.forEach((coord: any) => {
            extractBounds(coord);
          });
        }
      }
    };

    if (subdistrictFeature.geometry.type === "Polygon") {
      subdistrictFeature.geometry.coordinates.forEach((ring: any) => {
        extractBounds(ring);
      });
    } else if (subdistrictFeature.geometry.type === "MultiPolygon") {
      subdistrictFeature.geometry.coordinates.forEach((polygon: any) => {
        polygon.forEach((ring: any) => {
          extractBounds(ring);
        });
      });
    }

    if (
      minLng !== Infinity &&
      minLat !== Infinity &&
      maxLng !== -Infinity &&
      maxLat !== -Infinity
    ) {
      const padding = 0.1;
      const lngPadding = (maxLng - minLng) * padding;
      const latPadding = (maxLat - minLat) * padding;

      mapRef.current.fitBounds(
        [
          [minLng - lngPadding, minLat - latPadding],
          [maxLng + lngPadding, maxLat + latPadding],
        ],
        {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          duration: 1000,
        }
      );
    }
  }, [selectedSubdistrict, geoData]);

  const handleClick = (event: any) => {
    console.log("🖱️ Click event:", event);
    console.log("📍 Event point:", event.point);
    console.log("🎯 Event features:", event.features);
    if (selectedSubdistrict) {
      console.log("🗺️ Currently selected subdistrict:", selectedSubdistrict);
    }

    let features = event.features;

    // Fallback: when MapLibre does not return features (or errors), do a lightweight hit-test on our in-memory GeoJSON.
    if ((!features || features.length === 0) && geoData?.features?.length) {
      const { lngLat } = event;
      const point: [number, number] = [lngLat.lng, lngLat.lat];

      // 1) Try points within ~0.01 degrees (~1 km) for quick pick
      const nearbyPoint = geoData.features.find((f: any) => {
        if (f.geometry?.type !== "Point") return false;
        const [lng, lat] = f.geometry.coordinates || [];
        if (lng === undefined || lat === undefined) return false;
        return (
          Math.abs(lng - point[0]) <= 0.01 && Math.abs(lat - point[1]) <= 0.01
        );
      });

      // 2) If no point found, try polygons that contain the click
      const polygonHit = nearbyPoint
        ? null
        : geoData.features.find(
            (f: any) =>
              (f.geometry?.type === "Polygon" ||
                f.geometry?.type === "MultiPolygon") &&
              isPointInPolygon(point, f)
          );

      const hitFeature = nearbyPoint || polygonHit;
      if (hitFeature) {
        console.log("🧭 Local hit-test found feature:", hitFeature.properties);
        features = [hitFeature];
      } else {
        console.warn("❌ No features found at click point (local hit-test).");
      }
    }

    if (features && features.length > 0 && onFeatureClick) {
      // Prioritize point features (villages, towns, complaints) over polygon features (subdistricts)
      // This ensures clicking on a village/complaint opens its popup, not the subdistrict
      const pointFeature = features.find(
        (f: any) => f.geometry?.type === "Point"
      );

      if (pointFeature) {
        console.log(
          "✅ Found point feature (village/town/complaint):",
          pointFeature.properties?.name || pointFeature.properties?.poiType
        );
        onFeatureClick(pointFeature);
      } else {
        // If no point feature, check for sub-district
        const subdistrictFeature = features.find(
          (f: any) => f.properties?.sdtname && !f.properties?.isVillageBoundary
        );

        if (subdistrictFeature) {
          console.log(
            "✅ Found sub-district feature:",
            subdistrictFeature.properties?.sdtname
          );
          onFeatureClick(subdistrictFeature);
        } else {
          console.log("📌 Clicking on other feature:", features[0].properties);
          onFeatureClick(features[0]);
        }
      }
    } else {
      console.warn("❌ No features found at click point");
    }
  };

  const handleMouseMove = useCallback(
    (event: any) => {
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: ["features-fill"],
      });

      if (features && features.length > 0) {
        const feature = features[0];
        // Check if it's a subdistrict (has sdtname and not a village boundary)
        if (
          feature.properties?.sdtname &&
          !feature.properties?.isVillageBoundary
        ) {
          const subdistrictName =
            feature.properties.sdtname || feature.properties.name;
          if (hoveredSubdistrict !== subdistrictName) {
            setHoveredSubdistrict(subdistrictName);
            mapRef.current.getCanvas().style.cursor = "pointer";
          }
        } else {
          if (hoveredSubdistrict !== null) {
            setHoveredSubdistrict(null);
            mapRef.current.getCanvas().style.cursor = "";
          }
        }
      } else {
        if (hoveredSubdistrict !== null) {
          setHoveredSubdistrict(null);
          mapRef.current.getCanvas().style.cursor = "";
        }
      }
    },
    [hoveredSubdistrict]
  );

  // Separate polygons and points
  // Filter out village boundaries - only show sub-district polygons
  const polygonFeatures = geoData.features.filter(
    (f) =>
      (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") &&
      !f.properties?.isVillageBoundary
  );
  const pointFeatures = geoData.features.filter(
    (f) => f.geometry.type === "Point"
  );

  const polygonData =
    polygonFeatures.length > 0
      ? {
          type: "FeatureCollection" as const,
          features: polygonFeatures,
        }
      : null;

  const pointData =
    pointFeatures.length > 0
      ? {
          type: "FeatureCollection" as const,
          features: pointFeatures,
        }
      : null;

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: BADAUN_CENTER[1],
          latitude: BADAUN_CENTER[0],
          zoom: 7.3, // Lower zoom to show entire district with more margins
          padding: { top: 60, bottom: 60, left: 60, right: 60 }, // Larger margins from all sides
        }}
        maxBounds={BADAUN_BOUNDS}
        maxZoom={15}
        minZoom={5.5}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        interactiveLayerIds={[
          "features-fill",
          "features-outline",
          "poi-points",
          "complaint-markers",
          "heatmap-circles",
        ]}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        scrollZoom={true}
        boxZoom={true}
        dragRotate={false}
        dragPan={true}
        doubleClickZoom={true}
        keyboard={true}
        touchZoomRotate={true}
        cursor="default"
      >
        {/* Polygon layers */}
        {polygonData && (
          <Source id="map-features" type="geojson" data={polygonData}>
            {/* Fill layer */}
            <Layer
              id="features-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "case",
                  [
                    "==",
                    ["coalesce", ["get", "isVillageBoundary"], false],
                    true,
                  ],
                  "#E5E7EB", // Light gray for village boundaries
                  ["==", ["coalesce", ["get", "isHighlight"], false], true],
                  "#ff671f", // Orange for selected
                  [
                    "case",
                    [
                      "all",
                      ["has", "sdtname"],
                      ["!=", ["coalesce", ["get", "sdtname"], ""], ""],
                      [
                        "==",
                        ["coalesce", ["get", "sdtname"], ""],
                        hoveredSubdistrict || "",
                      ],
                    ],
                    "#F47216", // BJP Saffron color on hover
                    ["coalesce", ["get", "_color"], "#10B981"], // Heat map colors, default to green
                  ],
                ] as any,
                "fill-opacity": [
                  "case",
                  [
                    "==",
                    ["coalesce", ["get", "isVillageBoundary"], false],
                    true,
                  ],
                  0.3,
                  [
                    "case",
                    [
                      "all",
                      ["has", "sdtname"],
                      ["!=", ["coalesce", ["get", "sdtname"], ""], ""],
                      [
                        "==",
                        ["coalesce", ["get", "sdtname"], ""],
                        hoveredSubdistrict || "",
                      ],
                    ],
                    0.8, // Higher opacity on hover
                    0.6,
                  ],
                ] as any,
              }}
            />
            {/* Border layer */}
            <Layer
              id="features-outline"
              type="line"
              paint={{
                "line-color": [
                  "case",
                  [
                    "==",
                    ["coalesce", ["get", "isVillageBoundary"], false],
                    true,
                  ],
                  "#374151", // Dark gray for village borders
                  [
                    "case",
                    [
                      "all",
                      ["has", "sdtname"],
                      ["!=", ["coalesce", ["get", "sdtname"], ""], ""],
                      [
                        "==",
                        ["coalesce", ["get", "sdtname"], ""],
                        hoveredSubdistrict || "",
                      ],
                    ],
                    "#F47216", // BJP Saffron border on hover
                    "#FFFFFF", // White for sub-districts
                  ],
                ] as any,
                "line-width": [
                  "case",
                  [
                    "==",
                    ["coalesce", ["get", "isVillageBoundary"], false],
                    true,
                  ],
                  1.5, // Thicker for villages
                  2, // Sub-districts
                ] as any,
                "line-opacity": 0.8,
              }}
            />
            {/* Sub-district labels removed - now using point labels layer */}
          </Source>
        )}

        {/* Point layers */}
        {pointData && (
          <Source id="poi-features" type="geojson" data={pointData}>
            {/* Regular points (villages, towns, wards, HQ, etc) */}
            <Layer
              id="poi-points"
              type="circle"
              filter={["!=", ["coalesce", ["get", "isComplaint"], false], true]}
              paint={{
                "circle-radius": [
                  "case",
                  ["==", ["coalesce", ["get", "type"], ""], "town"],
                  8, // Towns larger
                  ["==", ["coalesce", ["get", "type"], ""], "ward"],
                  5, // Wards smaller
                  6, // Default (villages, HQ, etc)
                ] as any,
                "circle-color": [
                  "case",
                  ["==", ["coalesce", ["get", "type"], ""], "town"],
                  "#06B6D4", // Cyan for towns
                  ["==", ["coalesce", ["get", "type"], ""], "ward"],
                  "#EAB308", // Yellow for wards
                  [
                    "==",
                    ["coalesce", ["get", "poiType"], ""],
                    "Administrative HQ",
                  ],
                  "#EF4444", // Red for Admin HQ
                  ["==", ["coalesce", ["get", "poiType"], ""], "School"],
                  "#A855F7", // Purple for schools
                  ["==", ["coalesce", ["get", "poiType"], ""], "Hospital"],
                  "#A855F7", // Purple for hospitals
                  "#3B82F6", // Blue for villages and others
                ] as any,
                "circle-stroke-width": [
                  "case",
                  ["==", ["coalesce", ["get", "type"], ""], "town"],
                  2, // Towns have border
                  ["==", ["coalesce", ["get", "type"], ""], "ward"],
                  1.5, // Wards have border
                  2, // Default border
                ] as any,
                "circle-stroke-color": [
                  "case",
                  ["==", ["coalesce", ["get", "type"], ""], "town"],
                  "#0891B2", // Dark cyan border
                  ["==", ["coalesce", ["get", "type"], ""], "ward"],
                  "#CA8A04", // Dark yellow border
                  "#FFFFFF", // White border for others
                ] as any,
              }}
            />
            {/* Complaint markers */}
            <Layer
              id="complaint-markers"
              type="circle"
              filter={["==", ["coalesce", ["get", "isComplaint"], false], true]}
              paint={{
                "circle-radius": 12,
                "circle-color": "#FFFFFF", // White
                "circle-stroke-width": 3,
                "circle-stroke-color": "#000000", // Black border
                "circle-opacity": 1,
              }}
            />
            {/* Sub-district labels (one per sub-district, larger font) */}
            <Layer
              id="subdistrict-labels"
              type="symbol"
              filter={["==", ["get", "isSubDistrictLabel"], true]}
              layout={
                {
                  "text-field": [
                    "case",
                    ["has", "complaintCount"],
                    [
                      "concat",
                      [
                        "coalesce",
                        ["get", "sdtname"],
                        ["get", "name"],
                        "",
                      ] as any,
                      " (",
                      ["to-string", ["get", "complaintCount"]],
                      ")",
                    ],
                    [
                      "coalesce",
                      ["get", "sdtname"],
                      ["get", "name"],
                      "",
                    ] as any,
                  ] as any,
                  "text-size": 18,
                  "text-anchor": "center",
                  "text-allow-overlap": true,
                  "text-ignore-placement": false,
                } as any
              }
              paint={{
                "text-color": "#FFFFFF",
                "text-halo-color": "#000000",
                "text-halo-width": 3,
              }}
            />
            {/* Point labels (villages, towns, etc - not sub-districts) */}
            <Layer
              id="point-labels"
              type="symbol"
              filter={["!=", ["get", "isSubDistrictLabel"], true]}
              layout={
                {
                  "text-field": [
                    "coalesce",
                    ["get", "name"],
                    ["get", "villageName"],
                    ["get", "areaName"],
                    "",
                  ] as any,
                  "text-size": 10,
                  "text-anchor": "top",
                  "text-offset": [0, 1],
                  "text-optional": true,
                } as any
              }
              paint={{
                "text-color": "#000000",
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 1.5,
              }}
            />
          </Source>
        )}

        {/* TRUE DENSITY HEATMAP LAYER - MapLibre native heatmap */}
        {showHeatmap &&
          heatmapData &&
          heatmapData.features &&
          heatmapData.features.length > 0 && (
            <Source id="heatmap-source" type="geojson" data={heatmapData}>
              {/* Heatmap blur effect */}
              <Layer
                id="heatmap-layer"
                type="heatmap"
                maxzoom={12}
                paint={{
                  // Weight based on _value property
                  "heatmap-weight": [
                    "interpolate",
                    ["linear"],
                    ["coalesce", ["get", "_value"], 0],
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
                  // Intensity increases with zoom
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
                  // Color gradient based on scheme
                  "heatmap-color":
                    heatmapColorScheme === "population"
                      ? [
                          "interpolate",
                          ["linear"],
                          ["heatmap-density"],
                          0,
                          "rgba(255,255,255,0)",
                          0.2,
                          "#D1FAE5",
                          0.4,
                          "#6EE7B7",
                          0.6,
                          "#10B981",
                          0.8,
                          "#059669",
                          1,
                          "#047857",
                        ]
                      : ([
                          "interpolate",
                          ["linear"],
                          ["heatmap-density"],
                          0,
                          "rgba(255,255,255,0)",
                          0.2,
                          "#FEF3C7",
                          0.4,
                          "#FCD34D",
                          0.6,
                          "#ff671f",
                          0.8,
                          "#DC2626",
                          1,
                          "#991B1B",
                        ] as any),
                  // Radius of heatmap blur
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
                  // Fade out as you zoom in
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
                }}
              />

              {/* Individual circles at high zoom */}
              <Layer
                id="heatmap-circles"
                type="circle"
                minzoom={9}
                paint={{
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
                    ["coalesce", ["get", "_value"], 0],
                    0,
                    "#10B981",
                    5,
                    "#ff671f",
                    10,
                    "#F97316",
                    20,
                    "#DC2626",
                  ] as any,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#FFFFFF",
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
                }}
              />
            </Source>
          )}
      </Map>

      {/* Legend - Top Right */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden">
        <div
          className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
        >
          <h3 className="font-bold text-sm">Map Legend</h3>
          {isLegendExpanded ? (
            <ChevronUp size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </div>

        {isLegendExpanded && (
          <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="font-semibold mb-2">
              Sub-districts (by complaints)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-green-500 rounded"></div>
              <span>Zero</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-4 rounded"
                style={{ background: "#FCA5A5" }}
              ></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-4 rounded"
                style={{ background: "#F87171" }}
              ></div>
              <span>Medium-Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-red-500 rounded"></div>
              <span>Medium-High</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-4 rounded"
                style={{ background: "#991B1B" }}
              ></div>
              <span>High</span>
            </div>

            <div className="border-t pt-2 mt-3 font-semibold">Boundaries</div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-orange-300 border-2 border-orange-600 rounded"></div>
              <span className="text-sm">Sub-districts (6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gray-200 border border-gray-600 rounded"></div>
              <span className="text-sm">Villages (1,785)</span>
            </div>

            <div className="border-t pt-2 mt-3 font-semibold">Markers</div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white border-2 border-black"></div>
              <span className="font-medium">Complaints</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">Village Centers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-cyan-500 border border-cyan-700"></div>
              <span className="text-sm">Towns (23)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-700"></div>
              <span className="text-sm">Wards (354)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Admin HQ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span className="text-sm">Schools/Hospitals</span>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Controls - Bottom Right */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-0 bg-white rounded shadow-lg border border-gray-300">
        <button
          className="w-10 h-10 hover:bg-gray-100 border-b border-gray-300 flex items-center justify-center"
          onClick={() => {
            const map = mapRef.current;
            if (map) {
              map.zoomIn({ duration: 300 });
            }
          }}
          title="Zoom In"
        >
          <span className="text-2xl font-bold leading-none">+</span>
        </button>
        <button
          className="w-10 h-10 hover:bg-gray-100 flex items-center justify-center"
          onClick={() => {
            const map = mapRef.current;
            if (map) {
              map.zoomOut({ duration: 300 });
            }
          }}
          title="Zoom Out"
        >
          <span className="text-2xl font-bold leading-none">−</span>
        </button>
      </div>
    </div>
  );
};

export default BadaunMapRenderer;
