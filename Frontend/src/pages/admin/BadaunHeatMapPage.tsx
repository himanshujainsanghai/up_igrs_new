/**
 * Badaun District Heat Map Page
 *
 * Dedicated module for visualizing Badaun district with:
 * - Sub-district boundaries
 * - Village locations with coordinates
 * - Administrative headquarters
 * - India assets (schools, hospitals)
 * - Interactive heat map based on complaint data
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { FeatureCollection } from "geojson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  Users,
  Building2,
  AlertCircle,
  Flame,
  Droplets,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Home,
  FileText,
} from "lucide-react";
import MapRenderHeatMap from "@/components/MapRenderHeatMap";
import BadaunMapRenderer from "@/components/BadaunMapRenderer";
import VillageDataPanel from "@/components/VillageDataPanel";
import BadaunDistrictPanel from "@/components/BadaunDistrictPanel";
import { geoService } from "@/services/geo.service";
import { villageService, type VillageStats } from "@/services/village.service";
import {
  districtService,
  type DistrictData,
} from "@/services/district.service";
import {
  createComplaintHeatmapData,
  createPopulationHeatmapData,
  getHeatmapStats,
} from "@/utils/heatmapUtils";
import AdminLayout from "@/components/AdminLayout";
import { useBadaunDistrict } from "@/contexts/BadaunDistrictContext";
import DynamicEntityPanel, {
  EntityData,
} from "@/components/DynamicEntityPanel";
import ComplaintDetailPanel from "@/components/ComplaintDetailPanel";

const BadaunHeatMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubdistrict = searchParams.get("subdistrict");

  // GeoJSON data states
  const [badaunGeoData, setBadaunGeoData] = useState<FeatureCollection | null>(
    null
  );
  const [villagesGeoData, setVillagesGeoData] =
    useState<FeatureCollection | null>(null);
  const [villageBoundariesData, setVillageBoundariesData] =
    useState<FeatureCollection | null>(null);
  const [townsGeoData, setTownsGeoData] = useState<FeatureCollection | null>(
    null
  );
  const [wardsGeoData, setWardsGeoData] = useState<FeatureCollection | null>(
    null
  );
  const [adhqGeoData, setAdhqGeoData] = useState<FeatureCollection | null>(
    null
  );
  const [indiaAssetsGeoData, setIndiaAssetsGeoData] =
    useState<FeatureCollection | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [geocodingType, setGeocodingType] = useState<
    "villages" | "towns" | "wards" | "all"
  >("villages");

  // Statistics
  const [villageStats, setVillageStats] = useState<VillageStats | null>(null);
  const [totalComplaints, setTotalComplaints] = useState<number>(0);
  const [complaintsByStatus, setComplaintsByStatus] = useState<
    Record<string, number>
  >({});

  // Toggle states for layers
  const [showVillages, setShowVillages] = useState(false);
  const [showTowns, setShowTowns] = useState(false);
  const [showWards, setShowWards] = useState(false);
  const [showAdhq, setShowAdhq] = useState(false);
  const [showIndiaAssets, setShowIndiaAssets] = useState(false);

  // Heatmap states
  const [showComplaintHeatmap, setShowComplaintHeatmap] = useState(false);
  const [showPopulationHeatmap, setShowPopulationHeatmap] = useState(false);
  const [heatmapWeightBy, setHeatmapWeightBy] = useState<
    "priority" | "status" | "category" | "count"
  >("priority");
  const [heatmapColorScheme, setHeatmapColorScheme] = useState<
    "complaints" | "population" | "custom"
  >("complaints");

  // Filter states - initialize subdistrict from URL if present
  const [filters, setFilters] = useState({
    village: "",
    subdistrict: urlSubdistrict || "",
    level: "", // Village/Town/Ward filter
    town: "", // Specific town filter
    residence: "", // Urban/Rural filter
    category: "",
    status: "",
    priority: "",
  });

  // Update filters when URL subdistrict changes
  useEffect(() => {
    if (urlSubdistrict) {
      setFilters((prev) => ({
        ...prev,
        subdistrict: urlSubdistrict,
      }));
      // Auto-enable all layers when subdistrict is selected
      setShowVillages(true);
      setShowTowns(true);
      setShowWards(true);
    } else if (urlSubdistrict === null && filters.subdistrict) {
      // Clear subdistrict filter when URL param is removed
      setFilters((prev) => ({
        ...prev,
        subdistrict: "",
      }));
    }
  }, [urlSubdistrict]);
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);

  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [mapDimensions, setMapDimensions] = useState({
    width: "100%",
    height: "100%",
  });

  // Card collapse states (all collapsed by default)
  const [cardCollapsed, setCardCollapsed] = useState({
    filters: true,
    mapLayers: true,
    heatmap: true,
  });

  const toggleCard = (cardKey: keyof typeof cardCollapsed) => {
    setCardCollapsed((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  // Upload states
  const [uploading, setUploading] = useState(false);

  // Update map dimensions when sidebar is toggled
  useEffect(() => {
    const updateMapDimensions = () => {
      const width = isSidebarCollapsed ? "100%" : "calc(100% - 18rem)";
      setMapDimensions({ width, height: "100%" });
    };

    updateMapDimensions();
    window.addEventListener("resize", updateMapDimensions);
    return () => window.removeEventListener("resize", updateMapDimensions);
  }, [isSidebarCollapsed]);
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    summary: {
      total: number;
      created: number;
      existing: number;
      failed: number;
      errors: string[];
    };
  } | null>(null);

  // Selected village state
  const [selectedVillage, setSelectedVillage] = useState<{
    name: string;
    lgdCode: string;
    subdistrictName: string;
    latitude?: number;
    longitude?: number;
    population?: number;
    area?: number;
    sarpanch?: string;
  } | null>(null);
  const [villageComplaints, setVillageComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isComplaintPanelOpen, setIsComplaintPanelOpen] = useState(false);
  const [loadingComplaintDetails, setLoadingComplaintDetails] = useState(false);

  // Use Badaun District Context for global state management
  const {
    districtData,
    loading: loadingDistrictData,
    error: districtDataError,
    fetchDistrictData,
    isPanelOpen: isDistrictPanelOpen,
    setIsPanelOpen: setIsDistrictPanelOpen,
    selectedEntity,
    setSelectedEntity,
    isEntityPanelOpen,
    setIsEntityPanelOpen,
  } = useBadaunDistrict();

  // Helper function to map sub-district names to LGD codes
  const getSubdistrictLgd = (name: string): number | undefined => {
    const mapping: Record<string, number> = {
      Bilsi: 780,
      Bisauli: 779,
      Budaun: 782,
      Dataganj: 783,
      Gunnaur: 778,
      Sahaswan: 781,
    };

    // Case-insensitive lookup
    const normalizedName = name.trim();
    for (const [key, value] of Object.entries(mapping)) {
      if (key.toLowerCase() === normalizedName.toLowerCase()) {
        return value;
      }
    }

    return undefined;
  };

  // Towns list for filter dropdown
  const [townsList, setTownsList] = useState<
    Array<{ areaName: string; totalPopulation: number; subdistrict: string }>
  >([]);

  /**
   * Load towns list for filter dropdown
   */
  useEffect(() => {
    const fetchTowns = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/v1/demographics/towns"
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTownsList(data.data.towns || []);
          }
        }
      } catch (err) {
        console.warn("Could not load towns list:", err);
      }
    };
    fetchTowns();
  }, []);

  /**
   * Load Badaun district boundaries and initial data
   */
  useEffect(() => {
    const fetchBadaunData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Badaun GeoJSON (sub-districts)
        const badaunData = await geoService.getBadaunGeoJson();
        setBadaunGeoData(badaunData);

        // Fetch village statistics
        const stats = await villageService.getBadaunVillageStats();
        setVillageStats(stats);

        // Fetch total complaints for Badaun
        try {
          // Use test endpoint which doesn't require auth
          const response = await fetch(
            "http://localhost:5000/api/v1/test/complaints"
          );

          if (response.ok) {
            const data = await response.json();
            console.log("Complaints API response:", data);

            if (data.success && data.data) {
              const allComplaints = data.data.complaints || [];

              // Filter for Badaun district
              const badaunComplaints = allComplaints.filter(
                (c: any) =>
                  c.district_name === "Budaun" || c.district_name === "Badaun"
              );

              console.log(
                `Found ${badaunComplaints.length} complaints for Badaun out of ${allComplaints.length} total`
              );
              setAllComplaints(badaunComplaints);
              setFilteredComplaints(badaunComplaints);
              setTotalComplaints(badaunComplaints.length);

              // Count by status
              const byStatus = badaunComplaints.reduce(
                (acc: Record<string, number>, c: any) => {
                  acc[c.status] = (acc[c.status] || 0) + 1;
                  return acc;
                },
                {}
              );
              setComplaintsByStatus(byStatus);
            }
          }
        } catch (err) {
          console.error("Error loading complaints count:", err);
        }

        // Load ADHQ data from backend API
        try {
          const adhqData = await geoService.getDistrictPOI("badaun", "adhq");
          setAdhqGeoData(adhqData);
        } catch (err) {
          console.warn("Could not load ADHQ data:", err);
        }

        // Load India Assets data from backend API
        try {
          const assetsData = await geoService.getDistrictPOI(
            "badaun",
            "india-assets"
          );
          setIndiaAssetsGeoData(assetsData);
        } catch (err) {
          console.warn("Could not load India Assets data:", err);
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load Badaun map data");
        console.error("Error fetching Badaun data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBadaunData();
  }, []);

  /**
   * Load villages and boundaries when showVillages is toggled
   */
  useEffect(() => {
    if (showVillages && !villagesGeoData) {
      const fetchVillages = async () => {
        try {
          setLoadingVillages(true);

          // Fetch village points
          const villageData = await villageService.getBadaunVillagesGeoJSON();
          setVillagesGeoData(villageData);

          // Fetch village boundaries (polygons)
          try {
            const boundariesData =
              await villageService.getBadaunVillageBoundaries();
            setVillageBoundariesData(boundariesData);
          } catch (err) {
            console.warn("Could not load village boundaries:", err);
          }
        } catch (err: any) {
          console.error("Failed to fetch villages:", err);
          setError("Failed to load village data");
        } finally {
          setLoadingVillages(false);
        }
      };
      fetchVillages();
    }
  }, [showVillages, villagesGeoData]);

  /**
   * Load towns when showTowns is toggled
   */
  useEffect(() => {
    if (showTowns && !townsGeoData) {
      const fetchTowns = async () => {
        try {
          console.log("🏘️ Fetching towns from API...");
          // Fetch towns from demographics API
          const response = await fetch(
            "http://localhost:5000/api/v1/demographics/towns"
          );
          console.log("Towns API response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("Towns API data:", data);

            // Handle response structure: { success: true, data: { count, towns: [...] } }
            const towns = data.data?.towns || data.towns || [];
            console.log(`Found ${towns.length} towns in API response`);

            // Filter for valid coordinates within Budaun ACTUAL bounds (from GeoJSON)
            const BUDAUN_BOUNDS = {
              north: 28.52,
              south: 27.61,
              east: 79.56,
              west: 78.52,
            };
            const townsWithCoords = towns.filter(
              (t: any) =>
                t.latitude &&
                t.longitude &&
                t.latitude >= BUDAUN_BOUNDS.south &&
                t.latitude <= BUDAUN_BOUNDS.north &&
                t.longitude >= BUDAUN_BOUNDS.west &&
                t.longitude <= BUDAUN_BOUNDS.east
            );
            console.log(
              `Towns with valid coordinates (within bounds): ${townsWithCoords.length}`
            );

            if (townsWithCoords.length > 0) {
              // Convert to GeoJSON
              const geoJSON: FeatureCollection = {
                type: "FeatureCollection",
                features: townsWithCoords.map((town: any) => ({
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [
                      Number(town.longitude),
                      Number(town.latitude),
                    ],
                  },
                  properties: {
                    name: town.areaName,
                    subdistrict: town.subdistrict,
                    population: town.totalPopulation,
                    households: town.totalHouseholds,
                    type: "town",
                    poiType: "Town",
                  },
                })),
              };
              console.log(
                "✅ Created towns GeoJSON with",
                geoJSON.features.length,
                "features"
              );
              setTownsGeoData(geoJSON);
            } else {
              console.warn("⚠️ No towns have coordinates yet!");
            }
          } else {
            console.error(
              "Towns API failed:",
              response.status,
              response.statusText
            );
          }
        } catch (err) {
          console.error("Failed to fetch towns:", err);
        }
      };
      fetchTowns();
    }
  }, [showTowns, townsGeoData]);

  /**
   * Load wards when showWards is toggled
   */
  useEffect(() => {
    if (showWards && !wardsGeoData) {
      const fetchWards = async () => {
        try {
          console.log("🏛️ Fetching wards from API...");
          // Fetch wards from demographics API
          const response = await fetch(
            "http://localhost:5000/api/v1/demographics/wards"
          );
          console.log("Wards API response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("Wards API data:", data);

            // Handle response structure
            const wards = data.data?.wards || data.wards || [];
            console.log(`Found ${wards.length} wards in API response`);

            // Filter for valid coordinates within Budaun ACTUAL bounds (from GeoJSON)
            const BUDAUN_BOUNDS = {
              north: 28.52,
              south: 27.61,
              east: 79.56,
              west: 78.52,
            };
            const wardsWithCoords = wards.filter(
              (w: any) =>
                w.latitude &&
                w.longitude &&
                w.latitude >= BUDAUN_BOUNDS.south &&
                w.latitude <= BUDAUN_BOUNDS.north &&
                w.longitude >= BUDAUN_BOUNDS.west &&
                w.longitude <= BUDAUN_BOUNDS.east
            );
            console.log(
              `Wards with valid coordinates (within bounds): ${wardsWithCoords.length}`
            );

            if (wardsWithCoords.length > 0) {
              // Convert to GeoJSON
              const geoJSON: FeatureCollection = {
                type: "FeatureCollection",
                features: wardsWithCoords.map((ward: any) => ({
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [
                      Number(ward.longitude),
                      Number(ward.latitude),
                    ],
                  },
                  properties: {
                    name: ward.areaName,
                    subdistrict: ward.subdistrict,
                    population: ward.totalPopulation,
                    type: "ward",
                    poiType: "Ward",
                  },
                })),
              };
              console.log(
                "✅ Created wards GeoJSON with",
                geoJSON.features.length,
                "features"
              );
              setWardsGeoData(geoJSON);
            } else {
              console.warn("⚠️ No wards have coordinates yet!");
            }
          } else {
            console.error(
              "Wards API failed:",
              response.status,
              response.statusText
            );
          }
        } catch (err) {
          console.error("Failed to fetch wards:", err);
        }
      };
      fetchWards();
    }
  }, [showWards, wardsGeoData]);

  /**
   * Trigger geocoding for villages, towns, wards, or all
   */
  const handleGeocode = async (
    type: "villages" | "towns" | "wards" | "all",
    batchSize: number = 10
  ) => {
    try {
      setLoadingVillages(true);
      let successTotal = 0;
      let failedTotal = 0;

      // Geocode villages
      if (type === "villages" || type === "all") {
        const villageResult = await villageService.triggerGeocoding(batchSize);
        successTotal += villageResult.success;
        failedTotal += villageResult.failed;
      }

      // Geocode towns (using Google Maps API)
      if (type === "towns" || type === "all") {
        try {
          console.log("🏘️ Geocoding towns with Google Maps...");
          const response = await fetch(
            "http://localhost:5000/api/v1/demographics/geocode-towns",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ batchSize: type === "towns" ? 23 : 23 }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log("Towns geocoding result:", data);
            if (data.success && data.data) {
              successTotal += data.data.success || 0;
              failedTotal += data.data.failed || 0;
            }
          }
        } catch (err) {
          console.error("Town geocoding error:", err);
        }
      }

      // Geocode wards (using Google Maps API)
      if (type === "wards" || type === "all") {
        try {
          console.log("🏛️ Geocoding wards with Google Maps...");
          const response = await fetch(
            "http://localhost:5000/api/v1/demographics/geocode-wards",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                batchSize: type === "wards" ? batchSize : 50,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log("Wards geocoding result:", data);
            if (data.success && data.data) {
              successTotal += data.data.success || 0;
              failedTotal += data.data.failed || 0;
            }
          }
        } catch (err) {
          console.error("Ward geocoding error:", err);
        }
      }

      // Refresh stats
      const stats = await villageService.getBadaunVillageStats();
      setVillageStats(stats);

      // Clear data to force reload
      setVillagesGeoData(null);
      setTownsGeoData(null);
      setWardsGeoData(null);

      const typeLabel = {
        villages: "Villages",
        towns: "Towns",
        wards: "Wards",
        all: "All (Villages + Towns + Wards)",
      }[type];

      alert(
        `${typeLabel} Geocoding completed:\n✅ Success: ${successTotal}\n❌ Failed: ${failedTotal}\n\n(Using Google Maps API)`
      );
    } catch (err: any) {
      console.error("Geocoding error:", err);
      alert("Failed to trigger geocoding");
    } finally {
      setLoadingVillages(false);
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadResult(null);

      const fileText = await file.text();
      let villageData: any[] = [];

      // Try to parse as JSON
      if (file.name.endsWith(".json")) {
        const jsonData = JSON.parse(fileText);
        villageData = Array.isArray(jsonData) ? jsonData : [jsonData];
      }
      // Try to parse as CSV
      else if (file.name.endsWith(".csv")) {
        const lines = fileText.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(",");
          const row: any = {};

          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || "";
          });

          villageData.push(row);
        }
      } else {
        throw new Error(
          "Unsupported file format. Please upload JSON or CSV file."
        );
      }

      // Upload to backend
      const result = await villageService.uploadVillageData(
        villageData,
        "Budaun",
        134
      );
      setUploadResult(result);

      // Refresh stats
      const stats = await villageService.getBadaunVillageStats();
      setVillageStats(stats);

      // Clear village data to force reload
      setVillagesGeoData(null);

      alert(
        `Upload completed!\n` +
          `Total: ${result.summary.total}\n` +
          `Created: ${result.summary.created}\n` +
          `Already Existing: ${result.summary.existing}\n` +
          `Failed: ${result.summary.failed}`
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  /**
   * Point-in-polygon check using ray casting algorithm
   */
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
      // Check outer ring (first array)
      if (polygon.geometry.coordinates[0]) {
        checkRing(polygon.geometry.coordinates[0]);
      }
    } else if (polygon.geometry.type === "MultiPolygon") {
      // Check each polygon in MultiPolygon
      polygon.geometry.coordinates.forEach((poly: number[][][]) => {
        if (poly[0]) {
          checkRing(poly[0]);
        }
      });
    }

    return inside;
  };

  /**
   * Combine all GeoJSON layers based on toggle states
   */
  const combinedGeoData = useMemo(() => {
    const features = [];

    // Get selected subdistrict polygon for point filtering
    const selectedSubdistrictPolygon =
      filters.subdistrict && badaunGeoData?.features
        ? badaunGeoData.features.find((feature: any) => {
            const subdistrictName =
              feature.properties?.sdtname || feature.properties?.name;
            return subdistrictName === filters.subdistrict;
          })
        : null;

    // Helper to check if a point feature is within selected subdistrict
    const isPointInSelectedSubdistrict = (pointFeature: any): boolean => {
      if (!selectedSubdistrictPolygon) return true;
      if (pointFeature.geometry.type !== "Point") return true;
      const [lng, lat] = pointFeature.geometry.coordinates;
      return isPointInPolygon([lng, lat], selectedSubdistrictPolygon);
    };

    // Calculate complaint count per sub-district for heat map coloring
    const complaintCountBySubDistrict: Record<string, number> = {};
    // Calculate complaint count per village for village labels
    const complaintCountByVillage: Record<string, number> = {};
    // Calculate complaint count per town for town labels
    const complaintCountByTown: Record<string, number> = {};
    // Calculate complaint count per ward for ward labels
    const complaintCountByWard: Record<string, number> = {};

    filteredComplaints.forEach((c) => {
      const subDistrict = c.subdistrict_name;
      if (subDistrict) {
        complaintCountBySubDistrict[subDistrict] =
          (complaintCountBySubDistrict[subDistrict] || 0) + 1;
      }
      // Count by village name and LGD code
      const villageName = c.village_name || c.villageName;
      const villageLgd = c.village_lgd || c.villageCode;
      if (villageName) {
        const key = villageName.toLowerCase().trim();
        complaintCountByVillage[key] = (complaintCountByVillage[key] || 0) + 1;
      }
      if (villageLgd) {
        const key = `lgd_${villageLgd}`;
        complaintCountByVillage[key] = (complaintCountByVillage[key] || 0) + 1;
      }
      // Count by town name
      const townName = c.town_name || c.townName;
      if (townName) {
        const key = townName.toLowerCase().trim();
        complaintCountByTown[key] = (complaintCountByTown[key] || 0) + 1;
      }
      // Count by ward name/code
      const wardName = c.ward_name || c.wardName;
      const wardCode = c.ward_code || c.wardCode;
      if (wardName) {
        const key = wardName.toLowerCase().trim();
        complaintCountByWard[key] = (complaintCountByWard[key] || 0) + 1;
      }
      if (wardCode) {
        const key = `ward_${wardCode}`;
        complaintCountByWard[key] = (complaintCountByWard[key] || 0) + 1;
      }
    });

    // Find max complaint count for normalization
    const maxComplaints = Math.max(
      ...Object.values(complaintCountBySubDistrict),
      1
    );

    // Helper function to calculate polygon centroid
    const calculateCentroid = (coordinates: any): [number, number] | null => {
      if (!coordinates || !Array.isArray(coordinates)) return null;

      // Handle Polygon coordinates: [[[lng, lat], ...]]
      let coords: number[][] = [];
      if (Array.isArray(coordinates[0])) {
        if (Array.isArray(coordinates[0][0])) {
          // Polygon: take first ring (outer boundary)
          coords = coordinates[0];
        } else {
          // Already flat array
          coords = coordinates;
        }
      }

      if (coords.length === 0) return null;

      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (const coord of coords) {
        if (Array.isArray(coord) && coord.length >= 2) {
          sumX += coord[0]; // longitude
          sumY += coord[1]; // latitude
          count++;
        }
      }

      if (count === 0) return null;
      return [sumX / count, sumY / count];
    };

    // Create a map to store unique sub-districts (to avoid duplicates)
    const subDistrictMap = new Map<
      string,
      {
        name: string;
        complaintCount: number;
        centroid: [number, number];
        heatColor: string;
      }
    >();

    // Add Badaun sub-districts with heat map colors based on complaint count
    if (badaunGeoData?.features) {
      const subdistrictsToShow = filters.subdistrict
        ? badaunGeoData.features.filter((feature: any) => {
            const subdistrictName =
              feature.properties?.sdtname || feature.properties?.name;
            return subdistrictName === filters.subdistrict;
          })
        : badaunGeoData.features;

      subdistrictsToShow.forEach((feature: any) => {
        const subdistrictName =
          feature.properties?.sdtname || feature.properties?.name;

        // Skip if we already have this sub-district
        if (!subdistrictName || subDistrictMap.has(subdistrictName)) {
          return;
        }

        const complaintCount =
          complaintCountBySubDistrict[subdistrictName] || 0;

        // Calculate heat color: Green (0) → Light Red → Medium Red → Dark Red (many)
        let heatColor;
        if (complaintCount === 0) {
          heatColor = "#10B981"; // Green - no complaints
        } else {
          // Calculate percentage of max
          const percentage = (complaintCount / maxComplaints) * 100;

          if (percentage <= 25) {
            heatColor = "#FCA5A5"; // Light red/pink - very few
          } else if (percentage <= 50) {
            heatColor = "#F87171"; // Medium light red - some
          } else if (percentage <= 75) {
            heatColor = "#EF4444"; // Medium red - moderate
          } else {
            heatColor = "#991B1B"; // Dark red - many
          }
        }

        // Calculate centroid for label placement
        let centroid: [number, number] | null = null;
        if (
          feature.geometry?.type === "Polygon" &&
          feature.geometry.coordinates
        ) {
          centroid = calculateCentroid(feature.geometry.coordinates);
        } else if (
          feature.geometry?.type === "MultiPolygon" &&
          feature.geometry.coordinates
        ) {
          // For MultiPolygon, use the first polygon's centroid
          centroid = calculateCentroid(feature.geometry.coordinates[0]);
        }

        if (centroid) {
          subDistrictMap.set(subdistrictName, {
            name: subdistrictName,
            complaintCount,
            centroid,
            heatColor,
          });
        }

        // Still add the polygon feature for rendering
        features.push({
          ...feature,
          properties: {
            ...feature.properties,
            _color: heatColor,
            complaintCount,
          },
        });
      });
    }

    // Create label points from unique sub-districts
    const labelPoints: any[] = [];
    subDistrictMap.forEach((data) => {
      labelPoints.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: data.centroid,
        },
        properties: {
          sdtname: data.name,
          complaintCount: data.complaintCount,
          isSubDistrictLabel: true,
        },
      });
    });

    // First, determine which villages are visible (for boundary filtering)
    let visibleVillageIdentifiers: Set<string> = new Set();
    if (showVillages && villagesGeoData?.features) {
      const filteredVillages = selectedSubdistrictPolygon
        ? villagesGeoData.features.filter(isPointInSelectedSubdistrict)
        : villagesGeoData.features;

      // Collect identifiers from visible village points for boundary filtering
      filteredVillages.forEach((village: any) => {
        const name =
          village.properties?.name ||
          village.properties?.villageName ||
          village.properties?.village_name ||
          village.properties?.VillageName ||
          "";
        const lgdCode =
          village.properties?.lgdCode ||
          village.properties?.lgd_code ||
          village.properties?.villageCode ||
          "";
        if (name) visibleVillageIdentifiers.add(name.toLowerCase().trim());
        if (lgdCode) visibleVillageIdentifiers.add(lgdCode.toString());
      });
    }

    // Add village boundaries FIRST (so they render under points)
    // Only show boundaries for visible village points
    if (showVillages && villageBoundariesData?.features) {
      const filteredBoundaries = selectedSubdistrictPolygon
        ? villageBoundariesData.features.filter((boundary: any) => {
            // First try to match by name/lgdCode
            if (visibleVillageIdentifiers.size > 0) {
              const boundaryName =
                boundary.properties?.name ||
                boundary.properties?.villageName ||
                boundary.properties?.village_name ||
                boundary.properties?.VillageName ||
                "";
              const boundaryLgdCode =
                boundary.properties?.lgdCode ||
                boundary.properties?.lgd_code ||
                boundary.properties?.villageCode ||
                "";
              if (
                visibleVillageIdentifiers.has(
                  boundaryName.toLowerCase().trim()
                ) ||
                visibleVillageIdentifiers.has(boundaryLgdCode.toString())
              ) {
                return true;
              }
            }
            // Fallback: check if boundary center point is within selected subdistrict
            if (
              boundary.geometry.type === "Polygon" &&
              boundary.geometry.coordinates[0]
            ) {
              const coords = boundary.geometry.coordinates[0];
              let centerLng = 0;
              let centerLat = 0;
              let count = 0;
              coords.forEach((coord: number[]) => {
                if (Array.isArray(coord) && coord.length >= 2) {
                  centerLng += coord[0];
                  centerLat += coord[1];
                  count++;
                }
              });
              if (count > 0) {
                centerLng /= count;
                centerLat /= count;
                const centerPoint: [number, number] = [centerLng, centerLat];
                return isPointInPolygon(
                  centerPoint,
                  selectedSubdistrictPolygon
                );
              }
            } else if (boundary.geometry.type === "MultiPolygon") {
              // For MultiPolygon, check first polygon's center
              const firstPolygon = boundary.geometry.coordinates[0];
              if (firstPolygon && firstPolygon[0]) {
                const coords = firstPolygon[0];
                let centerLng = 0;
                let centerLat = 0;
                let count = 0;
                coords.forEach((coord: number[]) => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    centerLng += coord[0];
                    centerLat += coord[1];
                    count++;
                  }
                });
                if (count > 0) {
                  centerLng /= count;
                  centerLat /= count;
                  const centerPoint: [number, number] = [centerLng, centerLat];
                  return isPointInPolygon(
                    centerPoint,
                    selectedSubdistrictPolygon
                  );
                }
              }
            }
            return false;
          })
        : villageBoundariesData.features;
      features.push(...filteredBoundaries);
    }

    // Add village points ON TOP of boundaries
    if (showVillages && villagesGeoData?.features) {
      const filteredVillages = selectedSubdistrictPolygon
        ? villagesGeoData.features.filter(isPointInSelectedSubdistrict)
        : villagesGeoData.features;

      // Add complaint counts to village features for labels
      const villagesWithComplaints = filteredVillages.map((village: any) => {
        const villageName =
          village.properties?.name ||
          village.properties?.villageName ||
          village.properties?.village_name ||
          village.properties?.VillageName ||
          "";
        const villageLgd =
          village.properties?.lgdCode ||
          village.properties?.lgd_code ||
          village.properties?.villageCode ||
          "";

        // Find complaint count by name or LGD code
        let complaintCount = 0;
        if (villageName) {
          complaintCount =
            complaintCountByVillage[villageName.toLowerCase().trim()] || 0;
        }
        if (complaintCount === 0 && villageLgd) {
          complaintCount = complaintCountByVillage[`lgd_${villageLgd}`] || 0;
        }

        return {
          ...village,
          properties: {
            ...village.properties,
            complaintCount, // Add complaint count for map labels
            poiType: "Village", // Ensure poiType is set for click detection
            Type: "Village", // Alternative property name
          },
        };
      });

      features.push(...villagesWithComplaints);
    }

    // Add towns if enabled
    if (showTowns && townsGeoData?.features) {
      const filteredTowns = selectedSubdistrictPolygon
        ? townsGeoData.features.filter(isPointInSelectedSubdistrict)
        : townsGeoData.features;

      // Add complaint counts to town features for labels
      const townsWithComplaints = filteredTowns.map((town: any) => {
        const townName =
          town.properties?.name ||
          town.properties?.townName ||
          town.properties?.areaName ||
          "";

        // Find complaint count by town name
        let complaintCount = 0;
        if (townName) {
          complaintCount =
            complaintCountByTown[townName.toLowerCase().trim()] || 0;
        }

        return {
          ...town,
          properties: {
            ...town.properties,
            complaintCount, // Add complaint count for map labels
            poiType: "Town", // Ensure poiType is set for click detection
            Type: "Town", // Alternative property name
          },
        };
      });

      features.push(...townsWithComplaints);
    }

    // Add wards if enabled
    if (showWards && wardsGeoData?.features) {
      const filteredWards = selectedSubdistrictPolygon
        ? wardsGeoData.features.filter(isPointInSelectedSubdistrict)
        : wardsGeoData.features;

      // Add complaint counts to ward features for labels
      const wardsWithComplaints = filteredWards.map((ward: any) => {
        const wardName =
          ward.properties?.name || ward.properties?.wardName || "";
        const wardCode =
          ward.properties?.wardCode || ward.properties?.ward_code || "";

        // Find complaint count by ward name or code
        let complaintCount = 0;
        if (wardName) {
          complaintCount =
            complaintCountByWard[wardName.toLowerCase().trim()] || 0;
        }
        if (complaintCount === 0 && wardCode) {
          complaintCount = complaintCountByWard[`ward_${wardCode}`] || 0;
        }

        return {
          ...ward,
          properties: {
            ...ward.properties,
            complaintCount, // Add complaint count for map labels
            poiType: "Ward", // Ensure poiType is set for click detection
            Type: "Ward", // Alternative property name
          },
        };
      });

      features.push(...wardsWithComplaints);
    }

    // Add complaint markers (filtered complaints on map)
    if (filteredComplaints.length > 0) {
      const complaintFeatures = filteredComplaints
        .filter((c) => c.latitude && c.longitude)
        .map((complaint) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [complaint.longitude, complaint.latitude],
          },
          properties: {
            type: "complaint",
            isComplaint: true,
            name: complaint.title,
            complaint_id: complaint.complaint_id,
            category: complaint.category,
            status: complaint.status,
            priority: complaint.priority,
            village_name: complaint.village_name,
            poiType: "Complaint",
          },
        }))
        .filter(isPointInSelectedSubdistrict);
      features.push(...complaintFeatures);
    }

    // Add ADHQ if enabled
    if (showAdhq && adhqGeoData) {
      let adhqFeatures: any[] = [];
      // Handle nested array structure from ESRI JSON
      if (Array.isArray(adhqGeoData)) {
        adhqGeoData.forEach((item: any) => {
          if (Array.isArray(item)) {
            item.forEach((subItem: any) => {
              if (subItem?.features) {
                adhqFeatures.push(...subItem.features);
              }
            });
          }
        });
      } else if (adhqGeoData.features) {
        adhqFeatures = adhqGeoData.features;
      }
      // Filter by subdistrict boundary if selected
      if (selectedSubdistrictPolygon) {
        adhqFeatures = adhqFeatures.filter(isPointInSelectedSubdistrict);
      }
      features.push(...adhqFeatures);
    }

    // Add India Assets if enabled
    if (showIndiaAssets && indiaAssetsGeoData) {
      let assetFeatures: any[] = [];
      // Handle nested array structure from ESRI JSON
      if (Array.isArray(indiaAssetsGeoData)) {
        indiaAssetsGeoData.forEach((item: any) => {
          if (Array.isArray(item)) {
            item.forEach((subItem: any) => {
              if (subItem?.features) {
                assetFeatures.push(...subItem.features);
              }
            });
          }
        });
      } else if (indiaAssetsGeoData.features) {
        assetFeatures = indiaAssetsGeoData.features;
      }
      // Filter by subdistrict boundary if selected
      if (selectedSubdistrictPolygon) {
        assetFeatures = assetFeatures.filter(isPointInSelectedSubdistrict);
      }
      features.push(...assetFeatures);
    }

    // Add highlighted boundary for selected village (larger, more visible)
    if (
      selectedVillage &&
      selectedVillage.latitude &&
      selectedVillage.longitude
    ) {
      const radius = 0.02; // Larger for selected village
      const centerLng = selectedVillage.longitude;
      const centerLat = selectedVillage.latitude;
      const points = 32;

      const circleCoordinates = [];
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const lng = centerLng + radius * Math.cos(angle);
        const lat = centerLat + radius * Math.sin(angle);
        circleCoordinates.push([lng, lat]);
      }

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [circleCoordinates],
        },
        properties: {
          type: "village-boundary-selected",
          name: selectedVillage.name,
          isHighlight: true,
        },
      });
    }

    // Add sub-district label points (one per sub-district to avoid duplicates)
    if (labelPoints.length > 0) {
      features.push(...labelPoints);
    }

    const result = {
      type: "FeatureCollection" as const,
      features,
    };

    // Debug logging
    console.log("🗺️ Combined GeoData features:", {
      total: features.length,
      byType: {
        subdistricts: features.filter((f) => f.geometry?.type === "Polygon")
          .length,
        villages: features.filter((f) => f.properties?.type === "village")
          .length,
        towns: features.filter((f) => f.properties?.type === "town").length,
        wards: features.filter((f) => f.properties?.type === "ward").length,
        complaints: features.filter((f) => f.properties?.isComplaint).length,
        admin: features.filter(
          (f) => f.properties?.poiType === "Administrative HQ"
        ).length,
        schools: features.filter((f) => f.properties?.poiType === "School")
          .length,
      },
    });

    return result;
  }, [
    badaunGeoData,
    villagesGeoData,
    villageBoundariesData,
    townsGeoData,
    wardsGeoData,
    adhqGeoData,
    indiaAssetsGeoData,
    showVillages,
    showTowns,
    showWards,
    showAdhq,
    showIndiaAssets,
    selectedVillage,
    filteredComplaints,
    filters.subdistrict,
  ]);

  /**
   * Create heatmap data from filtered complaints
   * TRUE density heatmap using MapLibre's native heatmap layer
   */
  const complaintHeatmapData = useMemo(() => {
    if (!showComplaintHeatmap || filteredComplaints.length === 0) {
      return null;
    }
    return createComplaintHeatmapData(filteredComplaints, heatmapWeightBy);
  }, [showComplaintHeatmap, filteredComplaints, heatmapWeightBy]);

  /**
   * Create population density heatmap data
   * Combines villages, towns, and wards for population visualization
   */
  const populationHeatmapData = useMemo(() => {
    if (!showPopulationHeatmap) {
      return null;
    }

    const allLocations: any[] = [];

    // Add villages if available
    if (villagesGeoData?.features) {
      villagesGeoData.features.forEach((feature: any) => {
        if (feature.geometry?.coordinates && feature.properties) {
          allLocations.push({
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            totalPopulation: feature.properties.population || 0,
            urbanPopulation: feature.properties.urbanPopulation || 0,
            ruralPopulation: feature.properties.ruralPopulation || 0,
            areaName: feature.properties.name || "",
            subdistrict: feature.properties.subdistrictName || "",
            lgdCode: feature.properties.lgdCode || "",
          });
        }
      });
    }

    // Add towns if available
    if (townsGeoData?.features) {
      townsGeoData.features.forEach((feature: any) => {
        if (feature.geometry?.coordinates && feature.properties) {
          allLocations.push({
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            totalPopulation: feature.properties.population || 0,
            urbanPopulation: feature.properties.population || 0, // Towns are urban
            ruralPopulation: 0,
            areaName: feature.properties.name || "",
            subdistrict: feature.properties.subdistrict || "",
            lgdCode: feature.properties.townCode || "",
          });
        }
      });
    }

    // Add wards if available
    if (wardsGeoData?.features) {
      wardsGeoData.features.forEach((feature: any) => {
        if (feature.geometry?.coordinates && feature.properties) {
          allLocations.push({
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            totalPopulation: feature.properties.population || 0,
            urbanPopulation: feature.properties.population || 0, // Wards are urban
            ruralPopulation: 0,
            areaName: feature.properties.name || "",
            subdistrict: feature.properties.subdistrict || "",
            lgdCode: feature.properties.wardCode || "",
          });
        }
      });
    }

    return createPopulationHeatmapData(allLocations, "total");
  }, [showPopulationHeatmap, villagesGeoData, townsGeoData, wardsGeoData]);

  /**
   * Handle feature click on the map
   */
  // Apply filters to complaints
  const applyFilters = useCallback(() => {
    let filtered = [...allComplaints];

    if (filters.village) {
      filtered = filtered.filter((c) =>
        c.village_name?.toLowerCase().includes(filters.village.toLowerCase())
      );
    }

    if (filters.subdistrict) {
      filtered = filtered.filter(
        (c) => c.subdistrict_name === filters.subdistrict
      );
    }

    if (filters.category) {
      filtered = filtered.filter((c) => c.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter((c) => c.priority === filters.priority);
    }

    setFilteredComplaints(filtered);
    setTotalComplaints(filtered.length);

    // Update complaint count by status for header
    const byStatus = filtered.reduce((acc: Record<string, number>, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    setComplaintsByStatus(byStatus);
  }, [filters, allComplaints]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, applyFilters]);

  const handleFeatureClick = useCallback(
    async (feature: any) => {
      console.log("🎯 Feature clicked:", feature);

      // Check if it's a sub-district (Badaun district level)
      if (
        feature.properties?.sdtname &&
        !feature.properties?.isVillageBoundary
      ) {
        const subdistrictName = feature.properties.sdtname;
        const subdistrictLgd =
          feature.properties.subdistrictLgd ||
          getSubdistrictLgd(subdistrictName);

        console.log("📍 Sub-district clicked:", subdistrictName);
        if (filters.subdistrict === subdistrictName) {
          console.log(
            "✅ Re-clicked currently selected subdistrict:",
            subdistrictName
          );
        }

        // Create entity data FIRST
        const entity: EntityData = {
          type: "subdistrict",
          name: subdistrictName,
          subdistrictLgd: subdistrictLgd,
          subdistrictName: subdistrictName,
          districtName: "Budaun",
          districtLgd: 134,
        };

        // Open panel IMMEDIATELY before any other state updates
        console.log("🚪 Opening DynamicEntityPanel for:", subdistrictName);
        setSelectedEntity(entity);
        setIsEntityPanelOpen(true);

        // THEN update URL and filters (which trigger zoom)
        setSearchParams({ subdistrict: subdistrictName });

        // Set sub-district in filters to highlight it on the map
        setFilters((prev) => ({
          ...prev,
          subdistrict: subdistrictName,
        }));

        // Ensure district data is loaded in context (for demographics and complaints)
        if (!districtData) {
          try {
            await fetchDistrictData();
          } catch (err) {
            console.warn("Could not fetch district data for context:", err);
          }
        }

        return;
      }

      // Check if it's a complaint marker
      if (
        feature.properties?.isComplaint ||
        feature.properties?.poiType === "Complaint"
      ) {
        console.log("🔔 Complaint clicked:", feature.properties);

        // Find the complaint from filtered complaints
        const complaint = filteredComplaints.find(
          (c) => c.complaint_id === feature.properties.complaint_id
        );

        if (complaint) {
          console.log("✅ Found complaint:", complaint);
          // Open complaint detail panel directly
          setSelectedComplaint(complaint);
          setIsComplaintPanelOpen(true);
        } else {
          console.warn("⚠️ Complaint not found in filtered complaints");
          // Try to use feature properties as complaint data
          setSelectedComplaint({
            complaint_id: feature.properties.complaint_id,
            title: feature.properties.title || "Complaint",
            description: feature.properties.description || "",
            category: feature.properties.category,
            sub_category: feature.properties.sub_category,
            status: feature.properties.status || "pending",
            priority: feature.properties.priority || "medium",
            village_name: feature.properties.village_name,
            subdistrict_name: feature.properties.subdistrict_name,
            district_name: feature.properties.district_name,
            location: feature.properties.location,
            latitude: feature.properties.latitude,
            longitude: feature.properties.longitude,
            contact_name: feature.properties.contact_name,
            contact_phone: feature.properties.contact_phone,
            contact_email: feature.properties.contact_email,
            created_at: feature.properties.created_at,
            updated_at: feature.properties.updated_at,
          });
          setIsComplaintPanelOpen(true);
        }
        return;
      }

      // Check if it's a town
      if (
        feature.properties?.type === "town" ||
        feature.properties?.poiType === "Town"
      ) {
        const townData = {
          name: feature.properties.name,
          lgdCode: feature.properties.townCode || "TOWN",
          subdistrictName: feature.properties.subdistrict,
          latitude: feature.geometry?.coordinates?.[1],
          longitude: feature.geometry?.coordinates?.[0],
          population: feature.properties.population,
          area: feature.properties.households,
        };

        setSelectedVillage(townData);
        setIsPanelOpen(true);
        setVillageComplaints([]); // Towns don't have complaints yet
        return;
      }

      // Check if it's a ward
      if (
        feature.properties?.type === "ward" ||
        feature.properties?.poiType === "Ward"
      ) {
        const wardData = {
          name: feature.properties.name,
          lgdCode: feature.properties.wardCode || "WARD",
          subdistrictName: feature.properties.subdistrict,
          latitude: feature.geometry?.coordinates?.[1],
          longitude: feature.geometry?.coordinates?.[0],
          population: feature.properties.population,
          area: undefined,
        };

        setSelectedVillage(wardData);
        setIsPanelOpen(true);
        setVillageComplaints([]); // Wards don't have complaints yet
        return;
      }

      // Check if it's a village
      if (
        feature.properties?.poiType === "Village" ||
        feature.properties?.Type === "Village"
      ) {
        const villageData = {
          name: feature.properties.name,
          lgdCode: feature.properties.lgdCode,
          subdistrictName: feature.properties.subdistrictName,
          latitude: feature.geometry?.coordinates?.[1],
          longitude: feature.geometry?.coordinates?.[0],
          population: feature.properties.population,
          area: feature.properties.area,
          sarpanch: feature.properties.sarpanch,
        };

        setSelectedVillage(villageData);
        setIsPanelOpen(true);

        // Fetch complaints for this village
        try {
          setLoadingComplaints(true);
          const result = await villageService.getVillageComplaints(
            feature.properties.lgdCode
          );
          setVillageComplaints(result.complaints);
        } catch (err) {
          console.error("Failed to fetch village complaints:", err);
          setVillageComplaints([]);
        } finally {
          setLoadingComplaints(false);
        }
      } else {
        // For other features (Admin HQ, Schools, etc), just log
        console.log(
          "Clicked on:",
          feature.properties?.poiType || feature.properties?.Type
        );
        // Don't open panel for these
      }
    },
    [filteredComplaints]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading Badaun Heat Map...</span>
      </div>
    );
  }

  if (error && !badaunGeoData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Custom Scrollbar Styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #f1f5f9;
        }
      `}</style>
      <div className="h-screen flex flex-col bg-gradient-to-br from-orange-50 to-white overflow-hidden">
        {/* Header with back button */}
        <header className="bg-white border-b border-orange-200 shadow-sm h-16 flex items-center px-4 shrink-0">
          <div className="flex items-center gap-4 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (urlSubdistrict) {
                  // If viewing subdistrict, go back to full Badaun view
                  setSearchParams({});
                  setFilters((prev) => ({ ...prev, subdistrict: "" }));
                } else {
                  // If viewing full Badaun, go back to UP map
                  navigate("/admin/dashboard");
                }
              }}
              className="hover:bg-orange-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {urlSubdistrict
                  ? `${urlSubdistrict} Subdistrict Map`
                  : "Badaun District Heat Map"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {urlSubdistrict
                  ? `Viewing ${urlSubdistrict} subdistrict with villages and facilities`
                  : "Interactive map showing sub-districts, villages, and facilities"}
              </p>
            </div>
            {urlSubdistrict && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchParams({});
                  setFilters((prev) => ({ ...prev, subdistrict: "" }));
                }}
                className="hover:bg-orange-50 border-orange-300 mr-2"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Badaun
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/dashboard")}
              className="hover:bg-orange-50"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to UP Map
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex relative">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-full bg-white border border-gray-300  shadow-md hover:bg-gray-50 transition-all duration-200 flex items-center justify-center ${
              isSidebarCollapsed ? "ml-0" : "ml-72"
            }`}
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Sidebar Controls */}
          <div
            className={`bg-white border-r overflow-y-auto transition-all duration-300 custom-scrollbar ${
              isSidebarCollapsed ? "w-0 opacity-0" : "w-72 opacity-100"
            }`}
            style={{
              minWidth: isSidebarCollapsed ? "0" : "18rem",
              maxWidth: isSidebarCollapsed ? "0" : "18rem",
              maxHeight: "calc(100vh - 4rem)",
            }}
          >
            <div className="w-72 p-3 space-y-3">
              {/* District Panel Button */}
              <Card className="mb-3">
                <CardContent className="p-3">
                  <Button
                    onClick={async () => {
                      try {
                        await fetchDistrictData();
                        setIsDistrictPanelOpen(true);
                      } catch (err) {
                        console.error("Failed to fetch district data:", err);
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    View District Panel
                  </Button>
                </CardContent>
              </Card>

              {/* Statistics Cards - KPI Tabs */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Total Complaints */}
                <Card className="border-gray-300">
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-xs text-gray-600 font-medium">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalComplaints}
                    </p>
                  </CardContent>
                </Card>

                {/* Pending */}
                <Card className="border-orange-300 bg-orange-50">
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-xs text-orange-700 font-medium">
                      Pending
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {complaintsByStatus.pending || 0}
                    </p>
                  </CardContent>
                </Card>

                {/* In Progress */}
                <Card className="border-blue-300 bg-blue-50">
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-xs text-blue-700 font-medium">
                      In Progress
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {complaintsByStatus.in_progress || 0}
                    </p>
                  </CardContent>
                </Card>

                {/* Resolved */}
                <Card className="border-green-300 bg-green-50">
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-xs text-green-700 font-medium">
                      Resolved
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {complaintsByStatus.resolved || 0}
                    </p>
                  </CardContent>
                </Card>

                {/* Rejected */}
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-xs text-red-700 font-medium">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">
                      {complaintsByStatus.rejected || 0}
                    </p>
                  </CardContent>
                </Card>

                {/* Villages Card */}
                {villageStats && (
                  <Card className="border-blue-300 ">
                    <CardContent className="pt-3 pb-3 px-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-gray-600 font-medium">
                            Villages
                          </p>
                          <p className="text-xl font-bold">
                            {villageStats.geocoded}/{villageStats.total}
                          </p>
                          <p className="text-xs text-gray-500">
                            {villageStats.percentageComplete.toFixed(1)}%
                            geocoded
                          </p>
                        </div>
                        <MapPin className="w-6 h-6 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sub-district Complaint Counts */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Complaints by Sub-District
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    // Calculate complaint counts per sub-district
                    const subDistrictCounts: Record<string, number> = {};
                    filteredComplaints.forEach((complaint: any) => {
                      const subDistrict = complaint.subdistrict_name;
                      if (subDistrict) {
                        subDistrictCounts[subDistrict] =
                          (subDistrictCounts[subDistrict] || 0) + 1;
                      }
                    });

                    const subDistricts = [
                      "Bilsi",
                      "Bisauli",
                      "Budaun",
                      "Dataganj",
                      "Gunnaur",
                      "Sahaswan",
                    ];

                    return subDistricts.map((subDistrict) => {
                      const count = subDistrictCounts[subDistrict] || 0;
                      return (
                        <div
                          key={subDistrict}
                          className="flex items-center justify-between p-2 rounded border hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setFilters({
                              ...filters,
                              subdistrict: subDistrict,
                            });
                            setSearchParams({ subdistrict: subDistrict });
                          }}
                        >
                          <span className="text-xs font-medium text-gray-700">
                            {subDistrict}
                          </span>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {count}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </CardContent>
              </Card>

              {/* Complaint Filters */}
              <Card>
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleCard("filters")}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold">
                      Complaint Filters
                    </CardTitle>
                    {cardCollapsed.filters ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CardHeader>
                {!cardCollapsed.filters && (
                  <CardContent className="space-y-2 pt-2">
                    {/* Village Filter */}
                    <input
                      type="text"
                      placeholder="Search village..."
                      value={filters.village}
                      onChange={(e) =>
                        setFilters({ ...filters, village: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs border rounded"
                    />

                    {/* Filters in compact row */}
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={filters.subdistrict}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            subdistrict: e.target.value,
                          })
                        }
                        className="w-full px-1 py-1 text-xs border rounded"
                      >
                        <option value="">All Sub-districts</option>
                        <option value="Bilsi">Bilsi</option>
                        <option value="Bisauli">Bisauli</option>
                        <option value="Budaun">Budaun</option>
                        <option value="Dataganj">Dataganj</option>
                        <option value="Gunnaur">Gunnaur</option>
                        <option value="Sahaswan">Sahaswan</option>
                      </select>

                      <select
                        value={filters.category}
                        onChange={(e) =>
                          setFilters({ ...filters, category: e.target.value })
                        }
                        className="w-full px-1 py-1 text-xs border rounded"
                      >
                        <option value="">All Categories</option>
                        <option value="roads">Roads</option>
                        <option value="water">Water</option>
                        <option value="electricity">Electricity</option>
                        <option value="documents">Documents</option>
                        <option value="health">Health</option>
                        <option value="education">Education</option>
                      </select>

                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters({ ...filters, status: e.target.value })
                        }
                        className="w-full px-1 py-1 text-xs border rounded"
                      >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>

                      <select
                        value={filters.priority}
                        onChange={(e) =>
                          setFilters({ ...filters, priority: e.target.value })
                        }
                        className="w-full px-1 py-1 text-xs border rounded"
                      >
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>

                      {/* Level Filter (NEW) */}
                      <select
                        value={filters.level}
                        onChange={(e) =>
                          setFilters({ ...filters, level: e.target.value })
                        }
                        className="w-full px-1 py-1 text-xs border rounded bg-blue-50"
                      >
                        <option value="">All Levels</option>
                        <option value="village">Villages (1,785)</option>
                        <option value="town">Towns (23)</option>
                        <option value="ward">Wards (354)</option>
                      </select>

                      {/* Urban/Rural Filter (NEW) */}
                      <select
                        value={filters.residence}
                        onChange={(e) =>
                          setFilters({ ...filters, residence: e.target.value })
                        }
                        className="w-full px-1 py-1 text-xs border rounded bg-green-50"
                      >
                        <option value="">All Areas</option>
                        <option value="urban">Urban (Towns/Wards)</option>
                        <option value="rural">Rural (Villages)</option>
                      </select>

                      {/* Town Filter (NEW - shown when level="town" or residence="urban") */}
                      {(filters.level === "town" ||
                        filters.residence === "urban") &&
                        townsList.length > 0 && (
                          <select
                            value={filters.town}
                            onChange={(e) =>
                              setFilters({ ...filters, town: e.target.value })
                            }
                            className="w-full px-1 py-1 text-xs border rounded bg-purple-50"
                          >
                            <option value="">
                              All Towns ({townsList.length})
                            </option>
                            {townsList.map((town, index) => (
                              <option key={index} value={town.areaName}>
                                {town.areaName} -{" "}
                                {(town.totalPopulation / 1000).toFixed(0)}k (
                                {town.subdistrict})
                              </option>
                            ))}
                          </select>
                        )}
                    </div>

                    {/* Clear Filters Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={() =>
                        setFilters({
                          village: "",
                          subdistrict: "",
                          level: "",
                          town: "",
                          residence: "",
                          category: "",
                          status: "",
                          priority: "",
                        })
                      }
                    >
                      Clear Filters
                    </Button>

                    {/* Filtered Results Count */}
                    <div className="text-xs text-center text-gray-600 pt-1">
                      {filteredComplaints.length} of {allComplaints.length}
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleCard("mapLayers")}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold">
                      Map Layers
                    </CardTitle>
                    {cardCollapsed.mapLayers ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CardHeader>
                {!cardCollapsed.mapLayers && (
                  <CardContent className="space-y-1.5 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={showVillages}
                        onChange={(e) => setShowVillages(e.target.checked)}
                        className="rounded w-3 h-3"
                      />
                      <Users className="w-3 h-3" />
                      <span>Villages (1,785)</span>
                      {loadingVillages && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={showTowns}
                        onChange={(e) => setShowTowns(e.target.checked)}
                        className="rounded w-3 h-3"
                      />
                      <Building2 className="w-3 h-3 text-cyan-600" />
                      <span>Towns (23)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={showWards}
                        onChange={(e) => setShowWards(e.target.checked)}
                        className="rounded w-3 h-3"
                      />
                      <MapPin className="w-3 h-3 text-yellow-600" />
                      <span>Wards (354)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={showAdhq}
                        onChange={(e) => setShowAdhq(e.target.checked)}
                        className="rounded w-3 h-3"
                      />
                      <Building2 className="w-3 h-3 text-red-600" />
                      <span>Admin HQ</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={showIndiaAssets}
                        onChange={(e) => setShowIndiaAssets(e.target.checked)}
                        className="rounded w-3 h-3"
                      />
                      <Building2 className="w-3 h-3 text-purple-600" />
                      <span>Schools/Hospitals</span>
                    </label>
                  </CardContent>
                )}
              </Card>

              {/* Heatmap Controls */}
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-orange-100/50 transition-colors"
                  onClick={() => toggleCard("heatmap")}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-600" />
                      Density Heatmaps
                    </CardTitle>
                    {cardCollapsed.heatmap ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </CardHeader>
                {!cardCollapsed.heatmap && (
                  <CardContent className="space-y-3 pt-2">
                    {/* Complaint Heatmap Toggle */}
                    <div className="space-y-1.5">
                      <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={showComplaintHeatmap}
                          onChange={(e) => {
                            setShowComplaintHeatmap(e.target.checked);
                            if (e.target.checked) {
                              setHeatmapColorScheme("complaints");
                            }
                          }}
                          className="rounded w-3.5 h-3.5"
                        />
                        <Flame className="w-3 h-3 text-red-600" />
                        <span>Complaint Density</span>
                      </label>

                      {/* Weight By Options - Only shown when complaint heatmap is active */}
                      {showComplaintHeatmap && (
                        <div className="ml-6 space-y-1">
                          <p className="text-xs text-gray-600 mb-1">
                            Weight by:
                          </p>
                          {["priority", "status", "category", "count"].map(
                            (option) => (
                              <label
                                key={option}
                                className="flex items-center space-x-1.5 cursor-pointer text-xs"
                              >
                                <input
                                  type="radio"
                                  name="heatmapWeight"
                                  value={option}
                                  checked={heatmapWeightBy === option}
                                  onChange={(e) =>
                                    setHeatmapWeightBy(e.target.value as any)
                                  }
                                  className="w-3 h-3"
                                />
                                <span className="capitalize">{option}</span>
                              </label>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Population Heatmap Toggle */}
                    <div className="space-y-1.5">
                      <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={showPopulationHeatmap}
                          onChange={(e) => {
                            setShowPopulationHeatmap(e.target.checked);
                            if (e.target.checked) {
                              setHeatmapColorScheme("population");
                              setShowComplaintHeatmap(false); // Only one heatmap at a time
                            }
                          }}
                          className="rounded w-3.5 h-3.5"
                        />
                        <Droplets className="w-3 h-3 text-emerald-600" />
                        <span>Population Density</span>
                      </label>

                      {showPopulationHeatmap && (
                        <p className="ml-6 text-xs text-gray-500 italic">
                          Shows population concentration across villages, towns,
                          and wards
                        </p>
                      )}
                    </div>

                    {/* Heatmap Stats - Show when any heatmap is active */}
                    {showComplaintHeatmap && complaintHeatmapData && (
                      <div className="pt-2 border-t border-orange-200">
                        <p className="text-xs text-gray-600 mb-1">
                          Heatmap Points:
                        </p>
                        <p className="text-sm font-bold text-orange-700">
                          {complaintHeatmapData.features.length} locations
                        </p>
                      </div>
                    )}

                    {showPopulationHeatmap && populationHeatmapData && (
                      <div className="pt-2 border-t border-orange-200">
                        <p className="text-xs text-gray-600 mb-1">
                          Heatmap Points:
                        </p>
                        <p className="text-sm font-bold text-emerald-700">
                          {populationHeatmapData.features.length} locations
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Village Management */}
              {villageStats && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold">
                      Village Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    <div className="text-xs grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="font-bold text-sm">
                          {villageStats.total}
                        </p>
                        <p className="text-gray-600">Total</p>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-green-600">
                          {villageStats.geocoded}
                        </p>
                        <p className="text-gray-600">Done</p>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-orange-600">
                          {villageStats.pending}
                        </p>
                        <p className="text-gray-600">Pending</p>
                      </div>
                    </div>

                    <input
                      id="village-upload"
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      disabled={uploading}
                      variant="outline"
                      onClick={() =>
                        document.getElementById("village-upload")?.click()
                      }
                    >
                      {uploading ? "Uploading..." : "📤 Upload"}
                    </Button>

                    {villageStats.pending > 0 && (
                      <div className="space-y-2">
                        {/* Geocode Type Selector */}
                        <select
                          value={geocodingType}
                          onChange={(e) =>
                            setGeocodingType(
                              e.target.value as
                                | "villages"
                                | "towns"
                                | "wards"
                                | "all"
                            )
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-blue-50"
                          disabled={loadingVillages}
                        >
                          <option value="villages">Villages Only</option>
                          <option value="towns">Towns Only (23)</option>
                          <option value="wards">Wards Only (50/354)</option>
                          <option value="all">
                            All (Villages + Towns + Wards)
                          </option>
                        </select>

                        {/* Geocode Button with Google Maps indicator */}
                        <Button
                          onClick={() => {
                            // Use different batch sizes based on type
                            const batchSize =
                              geocodingType === "wards"
                                ? 50
                                : geocodingType === "towns"
                                ? 23
                                : geocodingType === "all"
                                ? 50
                                : 10;
                            handleGeocode(geocodingType, batchSize);
                          }}
                          disabled={loadingVillages}
                          size="sm"
                          className="w-full h-7 text-xs bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
                        >
                          {loadingVillages
                            ? "Geocoding..."
                            : geocodingType === "towns"
                            ? "🗺️ Geocode 23 Towns (Google)"
                            : geocodingType === "wards"
                            ? "🗺️ Geocode 50 Wards (Google)"
                            : geocodingType === "all"
                            ? "🗺️ Geocode All (Google)"
                            : "🗺️ Geocode 10 Villages"}
                        </Button>

                        {/* Google Maps API Notice */}
                        {(geocodingType === "towns" ||
                          geocodingType === "wards" ||
                          geocodingType === "all") && (
                          <p className="text-xs text-green-600 text-center">
                            Using Google Maps API (FREE in quota)
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Map */}
          <div
            className="relative overflow-y-auto overflow-x-auto transition-all duration-300 custom-scrollbar"
            style={{
              minHeight: "600px",
              maxHeight: "calc(100vh - 4rem)",
              width: isSidebarCollapsed ? "100%" : "calc(100% - 18rem)",
              marginLeft: isSidebarCollapsed ? "0" : "auto",
            }}
          >
            {combinedGeoData.features.length > 0 ? (
              <div
                className="w-full h-full bg-white rounded-lg shadow-inner"
                style={{ minHeight: "calc(100vh - 200px)" }}
              >
                <BadaunMapRenderer
                  geoData={combinedGeoData}
                  onFeatureClick={handleFeatureClick}
                  heatmapData={
                    showComplaintHeatmap
                      ? complaintHeatmapData
                      : showPopulationHeatmap
                      ? populationHeatmapData
                      : null
                  }
                  showHeatmap={showComplaintHeatmap || showPopulationHeatmap}
                  heatmapColorScheme={heatmapColorScheme}
                  selectedSubdistrict={filters.subdistrict || null}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No data to display</p>
              </div>
            )}

            {/* Village Data Panel (Modal - like district panel) */}
            <VillageDataPanel
              villageName={selectedVillage?.name || ""}
              lgdCode={selectedVillage?.lgdCode || ""}
              subdistrictName={selectedVillage?.subdistrictName || ""}
              latitude={selectedVillage?.latitude}
              longitude={selectedVillage?.longitude}
              population={selectedVillage?.population}
              area={selectedVillage?.area}
              sarpanch={selectedVillage?.sarpanch}
              complaints={villageComplaints}
              isOpen={isPanelOpen}
              onClose={() => {
                setIsPanelOpen(false);
                setSelectedVillage(null);
                setVillageComplaints([]);
              }}
              loading={loadingComplaints}
            />

            {/* Badaun District Panel (Modal - district at a glance) */}
            {/* Panel can use context directly, but we pass props for explicit control */}
            <BadaunDistrictPanel
              data={districtData}
              isOpen={isDistrictPanelOpen}
              onClose={() => {
                setIsDistrictPanelOpen(false);
              }}
            />

            {/* Dynamic Entity Panel (for sub-districts, villages, towns) */}
            <DynamicEntityPanel
              entity={selectedEntity}
              isOpen={isEntityPanelOpen}
              onClose={() => {
                setIsEntityPanelOpen(false);
                setSelectedEntity(null);
              }}
            />

            {/* Complaint Detail Panel */}
            <ComplaintDetailPanel
              complaint={selectedComplaint}
              isOpen={isComplaintPanelOpen}
              onClose={() => {
                setIsComplaintPanelOpen(false);
                setSelectedComplaint(null);
              }}
              loading={loadingComplaintDetails}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default BadaunHeatMapPage;
