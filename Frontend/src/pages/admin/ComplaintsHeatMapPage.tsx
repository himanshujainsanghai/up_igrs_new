/**
 * Complaints Heat Map Page
 *
 * Architecture:
 * - This page component handles ALL API calls and data fetching
 * - MapRenderHeatMap component is a pure rendering component (no API calls)
 * - When a district is clicked on the map, onDistrictClick callback is triggered
 * - This page then fetches the district's detailed data via geoService
 * - DistrictDataPanel component displays the fetched data in charts
 *
 * Data Flow:
 * 1. Page fetches GeoJSON and district heat map summaries on mount
 * 2. User clicks district on map -> MapRenderHeatMap calls onDistrictClick(districtCode)
 * 3. Page's handleDistrictClick fetches detailed district data via API
 * 4. Page passes data to DistrictDataPanel for chart rendering
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { FeatureCollection, Feature } from "geojson";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Home } from "lucide-react";
import MapRenderHeatMap from "@/components/MapRenderHeatMap";
import DistrictDataPanel from "@/components/DistrictDataPanel";
import {
  geoService,
  DistrictSummary,
  DistrictHeatMapData,
  SubdistrictDemographics,
} from "@/services/geo.service";

interface ComplaintsHeatMapPageProps {
  /** When true, page is rendered inside AdminLayout (e.g. dashboard); keeps navbar/sidebar visible. */
  embedded?: boolean;
}

const ComplaintsHeatMapPage: React.FC<ComplaintsHeatMapPageProps> = ({
  embedded = false,
}) => {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

  // Prevent body scrolling when map page is mounted (only in standalone full-screen mode)
  useEffect(() => {
    if (embedded) return;

    // Store original values
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyMargin = document.body.style.margin;
    const originalBodyPadding = document.body.style.padding;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlMargin = document.documentElement.style.margin;
    const originalHtmlPadding = document.documentElement.style.padding;
    const originalRootStyle =
      document.getElementById("root")?.style.cssText || "";

    // Disable scrolling and remove margins/padding
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";

    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.style.margin = "0";
      rootElement.style.padding = "0";
      rootElement.style.height = "100vh";
      rootElement.style.width = "100%";
      rootElement.style.maxWidth = "100vw";
      rootElement.style.overflow = "hidden";
      rootElement.style.position = "relative";
    }

    // Cleanup: restore original values on unmount
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.margin = originalBodyMargin;
      document.body.style.padding = originalBodyPadding;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.margin = originalHtmlMargin;
      document.documentElement.style.padding = originalHtmlPadding;
      if (rootElement) {
        rootElement.style.cssText = originalRootStyle;
      }
    };
  }, [embedded]);
  const [badaunGeoData, setBadaunGeoData] = useState<FeatureCollection | null>(
    null,
  );
  const [loadingBadaunGeoJson, setLoadingBadaunGeoJson] = useState(false);
  const [heatMapData, setHeatMapData] = useState<DistrictSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedDistrictData, setSelectedDistrictData] =
    useState<DistrictHeatMapData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loadingDistrictData, setLoadingDistrictData] = useState(false);
  const [districtDataError, setDistrictDataError] = useState<string | null>(
    null,
  );
  // Table of Contents checkbox states
  const [showIndiaAssets, setShowIndiaAssets] = useState(false);
  const [showAdhq, setShowAdhq] = useState(false);
  // POI data states
  const [indiaAssetsData, setIndiaAssetsData] =
    useState<FeatureCollection | null>(null);
  const [adhqData, setAdhqData] = useState<FeatureCollection | null>(null);
  const [loadingIndiaAssets, setLoadingIndiaAssets] = useState(false);
  const [loadingAdhq, setLoadingAdhq] = useState(false);
  // Demographics data state
  const [subdistrictDemographics, setSubdistrictDemographics] =
    useState<SubdistrictDemographics | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both GeoJSON and heat map data in parallel using geoService
        const [geoJsonData, heatMapResponse] = await Promise.all([
          geoService.getUttarPradeshGeoJson(),
          geoService.getAllDistrictsHeatMap().catch((err) => {
            console.warn(
              `Failed to fetch heat map data: ${err.message}, continuing without heat values`,
            );
            return null;
          }),
        ]);

        // Set GeoJSON data
        setGeoData(geoJsonData);

        // Set heat map data if available
        if (heatMapResponse && heatMapResponse.districts) {
          setHeatMapData(heatMapResponse.districts);
          // Debug: Log Badaun/Budaun entries
          const badaunEntries = heatMapResponse.districts.filter(
            (d: DistrictSummary) =>
              d.districtCode.toLowerCase() === "badaun" ||
              d.districtCode.toLowerCase() === "budaun",
          );
          if (badaunEntries.length > 0) {
            console.log(
              "✅ Found Badaun/Budaun in heat map data:",
              badaunEntries,
            );
          } else {
            console.warn("⚠️ Badaun/Budaun not found in heat map data");
            console.log(
              "Available districts:",
              heatMapResponse.districts.map(
                (d: DistrictSummary) => d.districtCode,
              ),
            );
          }
        }
      } catch (err: any) {
        setError(err?.message || "Unable to load map data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch India Assets POI data when checkbox is checked
  useEffect(() => {
    if (!showIndiaAssets || !selectedDistrict) {
      setIndiaAssetsData(null);
      return;
    }

    const fetchIndiaAssets = async () => {
      try {
        setLoadingIndiaAssets(true);
        // Normalize district name to lowercase for API call
        const districtLower = selectedDistrict.toLowerCase();
        const data = await geoService.getDistrictPOI(
          districtLower,
          "india-assets",
        );
        setIndiaAssetsData(data);
        console.log("India Assets POI Data:", data);
      } catch (err: any) {
        console.error("Failed to fetch India Assets POI data:", err);
        setIndiaAssetsData(null);
      } finally {
        setLoadingIndiaAssets(false);
      }
    };

    fetchIndiaAssets();
  }, [showIndiaAssets, selectedDistrict]);

  // Fetch Administrative Headquarters POI data when checkbox is checked
  useEffect(() => {
    if (!showAdhq || !selectedDistrict) {
      setAdhqData(null);
      return;
    }

    const fetchAdhq = async () => {
      try {
        setLoadingAdhq(true);
        // Normalize district name to lowercase for API call
        const districtLower = selectedDistrict.toLowerCase();
        const data = await geoService.getDistrictPOI(districtLower, "adhq");
        setAdhqData(data);
        console.log("Administrative Headquarters POI Data:", data);
      } catch (err: any) {
        console.error("Failed to fetch ADHQ POI data:", err);
        setAdhqData(null);
      } finally {
        setLoadingAdhq(false);
      }
    };

    fetchAdhq();
  }, [showAdhq, selectedDistrict]);

  // District list - Only Badaun for now
  const districtList = useMemo(() => {
    return [
      {
        name: "Badaun",
        code: "Badaun",
      },
    ];
  }, []);

  // Merge heat map values into GeoJSON features
  const enrichedGeoData = useMemo(() => {
    if (!geoData || !heatMapData || heatMapData.length === 0) {
      return geoData;
    }

    // Create a map of districtCode (case-insensitive) -> heatValue for quick lookup
    const heatMapLookup = new Map<string, DistrictSummary>();
    heatMapData.forEach((district) => {
      // Store both original and lowercase versions for flexible matching
      const normalizedCode = district.districtCode.toLowerCase().trim();
      heatMapLookup.set(normalizedCode, district);
      heatMapLookup.set(district.districtCode, district); // Also store original for exact match

      // Handle Badaun/Budaun spelling variations
      if (normalizedCode === "badaun" || normalizedCode === "budaun") {
        heatMapLookup.set("badaun", district);
        heatMapLookup.set("budaun", district);
        heatMapLookup.set("Badaun", district);
        heatMapLookup.set("Budaun", district);
      }
    });

    // Merge heat map values into GeoJSON features
    return {
      ...geoData,
      features: geoData.features.map((feature: Feature) => {
        // Match by feature.id (district code) or by properties.Name or properties.DISTRICT
        const districtCode =
          feature.id ||
          feature.properties?.Name ||
          feature.properties?.DISTRICT ||
          feature.properties?.DISTRICT_CODE;

        if (!districtCode) {
          return feature;
        }

        // Try exact match first, then case-insensitive match
        const districtCodeStr = String(districtCode);
        const normalizedCode = districtCodeStr.toLowerCase().trim();

        // Handle Badaun/Budaun spelling variations
        let searchCode = normalizedCode;
        if (normalizedCode === "badaun" || normalizedCode === "budaun") {
          // Try both spellings
          searchCode = "badaun";
        }

        let heatMapValue =
          heatMapLookup.get(districtCodeStr) ||
          heatMapLookup.get(normalizedCode) ||
          heatMapLookup.get(searchCode);

        // Debug logging for Badaun/Budaun
        if (normalizedCode === "badaun" || normalizedCode === "budaun") {
          console.log("🔍 Matching Badaun/Budaun:", {
            districtCodeStr,
            normalizedCode,
            searchCode,
            found: !!heatMapValue,
            heatMapValue: heatMapValue
              ? {
                  districtCode: heatMapValue.districtCode,
                  districtName: heatMapValue.districtName,
                  totalComplaints: heatMapValue.totalComplaints,
                }
              : null,
          });
        }

        // Merge heat map data into feature properties
        let finalHeatValue = heatMapValue?.heatValue;
        let finalTotalComplaints = heatMapValue?.totalComplaints ?? 0;

        // Use totalComplaints as heatValue if heatValue is missing, 0, or undefined
        if (heatMapValue) {
          if (
            finalHeatValue === undefined ||
            finalHeatValue === null ||
            finalHeatValue === 0
          ) {
            if (finalTotalComplaints > 0) {
              finalHeatValue = finalTotalComplaints;
            }
          }
        }

        return {
          ...feature,
          properties: {
            ...feature.properties,
            ...(heatMapValue && {
              heatValue: finalHeatValue ?? finalTotalComplaints,
              districtCode: heatMapValue.districtCode,
              districtName: heatMapValue.districtName,
              // Always include totalComplaints (even if 0) so labels show complaint numbers
              totalComplaints: finalTotalComplaints,
            }),
            // If no heat map data but we have a district code, still set default values
            ...(!heatMapValue &&
              districtCode && {
                heatValue: 0,
                totalComplaints: 0,
              }),
          },
        };
      }),
    } as FeatureCollection;
  }, [geoData, heatMapData]);

  // Combine all GeoJSON data: main data + POI data (India Assets + ADHQ)
  const combinedGeoData = useMemo(() => {
    const mainData = badaunGeoData || enrichedGeoData;
    if (!mainData) return null;

    // Collect all features from main data
    const allFeatures: Feature[] = [...mainData.features];

    // Add India Assets POI features if checkbox is checked and data is available
    if (showIndiaAssets && indiaAssetsData?.features) {
      allFeatures.push(...indiaAssetsData.features);
    }

    // Add ADHQ POI features if checkbox is checked and data is available
    if (showAdhq && adhqData?.features) {
      allFeatures.push(...adhqData.features);
    }

    return {
      type: "FeatureCollection" as const,
      features: allFeatures,
    } as FeatureCollection;
  }, [
    badaunGeoData,
    enrichedGeoData,
    indiaAssetsData,
    adhqData,
    showIndiaAssets,
    showAdhq,
  ]);

  /**
   * Map district/subdistrict codes to LGD codes for demographics lookup
   */
  const getSubdistrictLgd = useCallback(
    (districtCode: string): number | null => {
      const mapping: { [key: string]: number } = {
        Bilsi: 780,
        Bisauli: 779,
        Budaun: 782,
        Badaun: 782, // Alternate spelling
        Dataganj: 783,
        Sahaswan: 781,
        Gunnaur: 778,
      };
      return mapping[districtCode] || null;
    },
    [],
  );

  /**
   * Handle district click from map component
   * This is called when user clicks a district on the map
   * All API calls are made here in the page component
   */
  const handleDistrictClick = useCallback(
    async (districtCode: string) => {
      try {
        setLoadingDistrictData(true);
        setDistrictDataError(null);

        // Update selected district in sidebar
        setSelectedDistrict(districtCode);

        // If Badaun is clicked, navigate to full BadaunHeatMapPage
        if (districtCode === "Badaun" || districtCode === "Budaun") {
          // Navigate to Badaun heat map page with all details
          navigate("/admin/badaun/heatmap");
          return; // Exit early, navigation will handle the rest
        }

        // For other districts, fetch detailed district data via API
        // This is the ONLY place where district detail API is called
        const districtData =
          await geoService.getDistrictHeatMapByCode(districtCode);

        // ALSO fetch demographics for the subdistrict
        const subdistrictLgd = getSubdistrictLgd(districtCode);
        if (subdistrictLgd) {
          try {
            const demographics =
              await geoService.getSubdistrictDemographics(subdistrictLgd);
            setSubdistrictDemographics(demographics);
            console.log("Demographics loaded for", districtCode, demographics);
          } catch (err: any) {
            console.warn(
              `Failed to fetch demographics for ${districtCode}:`,
              err.message,
            );
            setSubdistrictDemographics(null);
          }
        } else {
          setSubdistrictDemographics(null);
        }

        // Validate data before setting it
        if (
          districtData &&
          districtData.districtCode &&
          districtData.districtName
        ) {
          setIsPanelOpen(true);

          setSelectedDistrictData(districtData);
          setDistrictDataError(null);
        } else {
          // Empty or invalid data
          console.warn(
            `Invalid or empty district data received for ${districtCode}`,
          );
          setSelectedDistrictData(null);
          setDistrictDataError("empty");
        }
      } catch (err: any) {
        console.error(
          `Failed to fetch district data for ${districtCode}:`,
          err?.message || err,
        );
        setSelectedDistrictData(null);
        setDistrictDataError("error");
      } finally {
        setLoadingDistrictData(false);
      }
    },
    [getSubdistrictLgd, navigate],
  );

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedDistrictData(null);
    setDistrictDataError(null);
  }, []);

  // Handle district selection from sidebar
  const handleDistrictSelect = useCallback(
    async (districtCode: string) => {
      setSelectedDistrict(districtCode);

      // If Badaun is selected, navigate to BadaunHeatMapPage
      if (districtCode === "Badaun" || districtCode === "Budaun") {
        navigate("/admin/badaun/heatmap");
        return;
      }

      // For other districts, fetch district heat map data
      if (districtCode) {
        await handleDistrictClick(districtCode);
      }
    },
    [handleDistrictClick, navigate],
  );

  return (
    <div
      className="flex flex-col bg-gradient-to-br from-orange-50 to-white overflow-hidden"
      style={
        embedded
          ? { minHeight: "100%", flex: 1, margin: 0, padding: 0 }
          : {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: "100vh",
              width: "100%",
              margin: 0,
              padding: 0,
            }
      }
    >
      {/* Main Content - Full Screen Map (No Header when standalone) */}
      <main
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{
          margin: 0,
          padding: 0,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          overflowY: "hidden",
        }}
      >
        {loading && (
          <div className="h-full w-full flex items-center justify-center m-0 p-0">
            <Card className="w-full max-w-md">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading map data...</p>
              </CardContent>
            </Card>
          </div>
        )}

        {error && !loading && (
          <div className="h-full w-full flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="p-12 text-center">
                <p className="text-destructive mb-2">Failed to load map</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && !error && enrichedGeoData && (
          <div
            className="relative flex-1 min-h-0 overflow-hidden"
            style={{
              margin: 0,
              padding: 0,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              overflowX: "hidden",
              overflowY: "hidden",
            }}
          >
            {/* Map Component - Full Screen */}
            {combinedGeoData && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  margin: 0,
                  padding: 0,
                  overflowX: "hidden",
                  overflowY: "hidden",
                }}
              >
                <MapRenderHeatMap
                  geoData={combinedGeoData}
                  valueProperty="heatValue"
                  onDistrictClick={handleDistrictClick}
                  className="absolute inset-0 overflow-hidden"
                />
              </div>
              // <MapRenderHeatMap
              //   geoData={combinedGeoData}
              //   valueProperty="heatValue"
              //   onDistrictClick={handleDistrictClick}
              //   className="absolute inset-0 h-full w-full overflow-hidden  no-scrollbar"
              // />
            )}

            {/* Loader Overlay - Only over map area */}
            {loadingBadaunGeoJson && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Loading Badaun district data...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* District Data Panel - Popup Dialog above the map */}
      <DistrictDataPanel
        data={selectedDistrictData}
        demographics={subdistrictDemographics}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        loading={loadingDistrictData}
        hasError={districtDataError !== null}
        isEmpty={districtDataError === "empty"}
      />
    </div>
  );
};

export default ComplaintsHeatMapPage;
