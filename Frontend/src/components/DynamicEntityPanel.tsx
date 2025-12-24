/**
 * Dynamic Entity Panel Component
 *
 * A flexible panel that displays data for:
 * - Sub-districts (Tehsils)
 * - Villages
 * - Towns
 *
 * Dynamically fetches and displays:
 * - Demographics (Census 2011)
 * - Complaint statistics
 * - Administrative information
 * - Geographic data
 *
 * Shows "Not Available" for missing data sections
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Users,
  Building2,
  FileText,
  BarChart3,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  geoService,
  type SubdistrictDemographics,
} from "@/services/geo.service";
import { villageService } from "@/services/village.service";
import { PieChart } from "./BadaunDistrictPanel";
import { useBadaunDistrict } from "@/contexts/BadaunDistrictContext";

// Horizontal Stacked Bar Chart Component
interface HorizontalStackedBarProps {
  male: number;
  female: number;
  height?: number;
}

export const HorizontalStackedBar: React.FC<HorizontalStackedBarProps> = ({
  male,
  female,
  height = 20,
}) => {
  const total = male + female;
  if (total === 0) return null;

  const malePercentage = (male / total) * 100;
  const femalePercentage = (female / total) * 100;

  return (
    <div className="w-full">
      <div
        className="flex rounded-md overflow-hidden border border-gray-200"
        style={{ height: `${height}px` }}
      >
        <div
          className="bg-blue-500 flex items-center justify-center transition-all"
          style={{ width: `${malePercentage}%` }}
          title={`Male: ${male.toLocaleString()} (${malePercentage.toFixed(
            1
          )}%)`}
        >
          {malePercentage > 10 && (
            <span className="text-xs font-bold text-white">
              {malePercentage.toFixed(0)}%
            </span>
          )}
        </div>
        <div
          className="bg-pink-500 flex items-center justify-center transition-all"
          style={{ width: `${femalePercentage}%` }}
          title={`Female: ${female.toLocaleString()} (${femalePercentage.toFixed(
            1
          )}%)`}
        >
          {femalePercentage > 10 && (
            <span className="text-xs font-bold text-white">
              {femalePercentage.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-600">
        <span>M: {male.toLocaleString()}</span>
        <span>F: {female.toLocaleString()}</span>
      </div>
    </div>
  );
};

// Small Donut Chart Component (for town cards)
interface SmallDonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  size?: number;
}

const SmallDonutChart: React.FC<SmallDonutChartProps> = ({
  data,
  size = 120,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const center = size / 2;
  const outerRadius = size * 0.35;
  const innerRadius = size * 0.2;

  let currentAngle = -90; // Start from top

  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + innerRadius * Math.cos(startAngleRad);
    const y1 = center + innerRadius * Math.sin(startAngleRad);
    const x2 = center + outerRadius * Math.cos(startAngleRad);
    const y2 = center + outerRadius * Math.sin(startAngleRad);
    const x3 = center + outerRadius * Math.cos(endAngleRad);
    const y3 = center + outerRadius * Math.sin(endAngleRad);
    const x4 = center + innerRadius * Math.cos(endAngleRad);
    const y4 = center + innerRadius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
      "Z",
    ].join(" ");

    return {
      path: pathData,
      color: item.color,
      name: item.name,
      value: item.value,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="1.5"
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs font-bold text-gray-700">
            {total.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="w-full space-y-1">
        {slices.map((slice, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="font-medium capitalize text-gray-700">
                {slice.name}
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-gray-800">
                {slice.value.toLocaleString()}
              </span>
              <span className="text-gray-500 ml-1">({slice.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Donut Chart Component
interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel?: string;
  centerSubLabel?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  centerLabel,
  centerSubLabel,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 250;
  const center = size / 2;
  const outerRadius = 90;
  const innerRadius = 60;

  let currentAngle = -90; // Start from top

  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + innerRadius * Math.cos(startAngleRad);
    const y1 = center + innerRadius * Math.sin(startAngleRad);
    const x2 = center + outerRadius * Math.cos(startAngleRad);
    const y2 = center + outerRadius * Math.sin(startAngleRad);
    const x3 = center + outerRadius * Math.cos(endAngleRad);
    const y3 = center + outerRadius * Math.sin(endAngleRad);
    const x4 = center + innerRadius * Math.cos(endAngleRad);
    const y4 = center + innerRadius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
      "Z",
    ].join(" ");

    return {
      path: pathData,
      color: item.color,
      name: item.name,
      value: item.value,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </svg>
        {(centerLabel || centerSubLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerLabel && (
              <p className="text-lg font-bold text-gray-800">{centerLabel}</p>
            )}
            {centerSubLabel && (
              <p className="text-xs text-gray-600">{centerSubLabel}</p>
            )}
          </div>
        )}
      </div>
      <div className="w-full space-y-2">
        {slices.map((slice, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm font-medium capitalize">
                {slice.name}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                {slice.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">{slice.percentage}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pie Chart with Column Layout (for Caste Demographics)
interface PieChartColumnProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
}

const PieChartColumn: React.FC<PieChartColumnProps> = ({ data, colors }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 200;
  const center = size / 2;
  const radius = 80;

  let currentAngle = -90; // Start from top

  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return {
      path: pathData,
      color: colors[index % colors.length],
      name: item.name,
      value: item.value,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Pie Chart */}
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </svg>
      </div>

      {/* Data List - Column Format (Downwards) - Sorted by value descending */}
      <div className="w-full space-y-2 max-h-[400px] overflow-y-auto">
        {[...slices]
          .sort((a, b) => b.value - a.value)
          .map((slice, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded w-full"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{slice.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold">
                  {slice.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">({slice.percentage}%)</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export type EntityType = "subdistrict" | "village" | "town" | "tehsil";

export interface EntityData {
  // Basic identification
  type: EntityType;
  name: string;
  lgdCode?: string | number;
  subdistrictName?: string;
  subdistrictLgd?: number;
  districtName?: string;
  districtLgd?: number;

  // Geographic
  latitude?: number;
  longitude?: number;
  area?: number;

  // Demographics (will be fetched)
  demographics?: SubdistrictDemographics | null;

  // Complaints (will be fetched)
  complaints?: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    list: any[];
  } | null;

  // Additional metadata
  population?: number;
  totalVillages?: number;
  [key: string]: any;
}

interface DynamicEntityPanelProps {
  entity: EntityData | null;
  isOpen: boolean;
  onClose: () => void;
}

const DynamicEntityPanel: React.FC<DynamicEntityPanelProps> = ({
  entity,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [religionView, setReligionView] = useState<"Total" | "Rural" | "Urban">(
    "Total"
  );
  const [demographics, setDemographics] =
    useState<SubdistrictDemographics | null>(null);
  const [villageCount, setVillageCount] = useState<number | null>(null);
  const [complaints, setComplaints] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    list: any[];
  } | null>(null);

  // Store raw sub-district data from context for religion and caste
  const [subDistrictReligionData, setSubDistrictReligionData] =
    useState<any>(null);
  const [subDistrictCasteData, setSubDistrictCasteData] = useState<any>(null);

  // Get district data from context
  const { districtData, fetchDistrictData } = useBadaunDistrict();

  /**
   * Convert demographicReligion sub-district data to SubdistrictDemographics format
   * Note: DemographicReligion only has population (persons, males, females)
   * For households, children, sc, st - we'll need to fetch from API or set to 0
   */
  const convertSubdistrictDemographics = (
    subDistData: any,
    subdistrictName: string,
    subdistrictLgd?: number,
    districtLgd?: number
  ): SubdistrictDemographics | null => {
    if (!subDistData || !subDistData.stats) return null;

    const totalStats = subDistData.stats.Total;
    const ruralStats = subDistData.stats.Rural;
    const urbanStats = subDistData.stats.Urban;

    if (!totalStats || !totalStats.population) return null;

    // DemographicReligion has: population.persons, population.males, population.females
    const totalPop = totalStats.population.persons || 0;
    const totalMale = totalStats.population.males || 0;
    const totalFemale = totalStats.population.females || 0;

    // These fields are not in DemographicReligion - will be 0 or fetched from API
    const totalHouseholds = 0; // Not available in DemographicReligion
    const totalChildren = 0; // Not available in DemographicReligion
    const totalSC = 0; // Not available in DemographicReligion
    const totalST = 0; // Not available in DemographicReligion

    const urbanPop = urbanStats?.population?.persons || 0;
    const urbanMale = urbanStats?.population?.males || 0;
    const urbanFemale = urbanStats?.population?.females || 0;
    const urbanHouseholds = 0; // Not available in DemographicReligion

    const ruralPop = ruralStats?.population?.persons || 0;
    const ruralMale = ruralStats?.population?.males || 0;
    const ruralFemale = ruralStats?.population?.females || 0;
    const ruralHouseholds = 0; // Not available in DemographicReligion

    // Calculate metrics (only for available data)
    const sexRatio =
      totalMale > 0 ? Math.round((totalFemale / totalMale) * 1000) : 0;
    const childRatio = 0; // Not available in DemographicReligion
    const scPercentage = 0; // Not available in DemographicReligion
    const stPercentage = 0; // Not available in DemographicReligion
    const urbanPercentage = totalPop > 0 ? (urbanPop / totalPop) * 100 : 0;
    const ruralPercentage = totalPop > 0 ? (ruralPop / totalPop) * 100 : 0;

    return {
      areaName: subdistrictName,
      level: "subdistrict",
      subdistrictLgd: subdistrictLgd,
      districtLgd: districtLgd,
      total: {
        population: totalPop,
        male: totalMale,
        female: totalFemale,
        households: totalHouseholds,
        children: totalChildren,
        sc: totalSC,
        st: totalST,
      },
      urban: {
        population: urbanPop,
        male: urbanMale,
        female: urbanFemale,
        households: urbanHouseholds,
      },
      rural: {
        population: ruralPop,
        male: ruralMale,
        female: ruralFemale,
        households: ruralHouseholds,
      },
      metrics: {
        sexRatio,
        childRatio,
        scPercentage,
        stPercentage,
        urbanPercentage,
        ruralPercentage,
      },
    };
  };

  // Fetch data when entity changes
  useEffect(() => {
    if (!isOpen || !entity) {
      setDemographics(null);
      setVillageCount(null);
      setComplaints(null);
      setSubDistrictReligionData(null);
      setSubDistrictCasteData(null);
      setError(null);
      return;
    }

    const fetchEntityData = async () => {
      setLoading(true);
      setError(null);

      try {
        // For sub-districts: Use context data first, fall back to API
        if (entity.type === "subdistrict" || entity.type === "tehsil") {
          // If context is empty, fetch district data first
          if (!districtData) {
            console.log("📥 Context is empty, fetching district data...");
            try {
              await fetchDistrictData();
              // After fetching, the component will re-render with districtData
              // This useEffect will run again with the new data
              setLoading(false);
              return;
            } catch (err: any) {
              console.warn("Could not fetch district data for context:", err);
              // Continue with API fallback even if context fetch fails
            }
          }

          // Try to get demographics from context first
          if (districtData?.demographicReligion?.sub_districts) {
            const subDistName = entity.name || entity.subdistrictName;
            const subDistData =
              districtData.demographicReligion.sub_districts.find((sd: any) => {
                const sdName = sd.name?.toLowerCase().trim();
                const entityName = subDistName?.toLowerCase().trim();
                return sdName === entityName;
              });

            if (subDistData) {
              // Store raw religion data for visualization
              setSubDistrictReligionData(subDistData);
              const convertedDemo = convertSubdistrictDemographics(
                subDistData,
                subDistName || "",
                entity.subdistrictLgd,
                entity.districtLgd
              );
              if (convertedDemo) {
                // Use context data, but enhance with API data for missing fields (households, children, sc, st)
                if (entity.subdistrictLgd) {
                  try {
                    const apiDemo = await geoService.getSubdistrictDemographics(
                      entity.subdistrictLgd
                    );
                    // Merge: Use context data for population, API data for missing fields
                    setDemographics({
                      ...convertedDemo,
                      total: {
                        ...convertedDemo.total,
                        households: apiDemo.total.households || 0,
                        children: apiDemo.total.children || 0,
                        sc: apiDemo.total.sc || 0,
                        st: apiDemo.total.st || 0,
                      },
                      urban: {
                        ...convertedDemo.urban,
                        households: apiDemo.urban.households || 0,
                      },
                      rural: {
                        ...convertedDemo.rural,
                        households: apiDemo.rural.households || 0,
                      },
                      metrics: {
                        ...convertedDemo.metrics,
                        childRatio: apiDemo.metrics.childRatio || 0,
                        scPercentage: apiDemo.metrics.scPercentage || 0,
                        stPercentage: apiDemo.metrics.stPercentage || 0,
                      },
                    });
                  } catch (err: any) {
                    // If API fails, use context data as-is (with 0s for missing fields)
                    console.warn(
                      "Could not enhance with API demographics:",
                      err
                    );
                    setDemographics(convertedDemo);
                  }
                } else {
                  setDemographics(convertedDemo);
                }
              } else {
                // Fall back to API if conversion fails
                if (entity.subdistrictLgd) {
                  try {
                    const demo = await geoService.getSubdistrictDemographics(
                      entity.subdistrictLgd
                    );
                    setDemographics(demo);
                  } catch (err: any) {
                    console.warn(
                      "Could not fetch subdistrict demographics:",
                      err
                    );
                    setDemographics(null);
                  }
                }
              }
            } else {
              // Not found in context, try API
              if (entity.subdistrictLgd) {
                try {
                  const demo = await geoService.getSubdistrictDemographics(
                    entity.subdistrictLgd
                  );
                  setDemographics(demo);
                } catch (err: any) {
                  console.warn(
                    "Could not fetch subdistrict demographics:",
                    err
                  );
                  setDemographics(null);
                }
              }
            }
          } else {
            // No context data, use API
            if (entity.subdistrictLgd) {
              try {
                const demo = await geoService.getSubdistrictDemographics(
                  entity.subdistrictLgd
                );
                setDemographics(demo);
              } catch (err: any) {
                console.warn("Could not fetch subdistrict demographics:", err);
                setDemographics(null);
              }
            }
          }

          // Fetch village count for subdistrict
          if (entity.subdistrictLgd) {
            try {
              const count = await geoService.getSubdistrictVillageCount(
                entity.subdistrictLgd
              );
              setVillageCount(count);
            } catch (err: any) {
              console.warn("Could not fetch village count:", err);
              setVillageCount(0);
            }
          }

          // Get complaints from context
          if (
            districtData?.complaintsList &&
            districtData.complaintsList.length > 0
          ) {
            const subDistName = entity.name || entity.subdistrictName;
            const normalizedEntityName = subDistName?.toLowerCase().trim();

            const subDistComplaints = districtData.complaintsList.filter(
              (c: any) => {
                if (!c.subdistrict_name) return false;
                const complaintSubDist = c.subdistrict_name
                  .toLowerCase()
                  .trim();
                return complaintSubDist === normalizedEntityName;
              }
            );

            if (subDistComplaints.length > 0) {
              const complaintStats = {
                total: subDistComplaints.length,
                byStatus: subDistComplaints.reduce(
                  (acc: Record<string, number>, c: any) => {
                    const status = c.status || "unknown";
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                  },
                  {}
                ),
                byCategory: subDistComplaints.reduce(
                  (acc: Record<string, number>, c: any) => {
                    const category = c.category || "unknown";
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                  },
                  {}
                ),
                byPriority: subDistComplaints.reduce(
                  (acc: Record<string, number>, c: any) => {
                    const priority = c.priority || "unknown";
                    acc[priority] = (acc[priority] || 0) + 1;
                    return acc;
                  },
                  {}
                ),
                list: subDistComplaints,
              };
              setComplaints(complaintStats);
            } else {
              setComplaints(null);
            }
          } else {
            setComplaints(null);
          }

          // Extract caste data for this sub-district from context
          // Note: Caste data is at district level, we'll show district-level caste data
          if (districtData?.demographicCaste) {
            setSubDistrictCasteData(districtData.demographicCaste);
          }
        } else if (entity.type === "village" && entity.lgdCode) {
          // For villages: Get parent sub-district demographics from context
          if (
            districtData?.demographicReligion?.sub_districts &&
            entity.subdistrictName
          ) {
            const subDistData =
              districtData.demographicReligion.sub_districts.find((sd: any) => {
                const sdName = sd.name?.toLowerCase().trim();
                const entitySubDist = entity.subdistrictName
                  ?.toLowerCase()
                  .trim();
                return sdName === entitySubDist;
              });

            if (subDistData) {
              const convertedDemo = convertSubdistrictDemographics(
                subDistData,
                entity.subdistrictName || "",
                entity.subdistrictLgd,
                entity.districtLgd
              );
              if (convertedDemo) {
                setDemographics(convertedDemo);
              } else if (entity.subdistrictLgd) {
                // Fall back to API
                try {
                  const demo = await geoService.getSubdistrictDemographics(
                    entity.subdistrictLgd
                  );
                  setDemographics(demo);
                } catch (err: any) {
                  console.warn("Could not fetch demographics:", err);
                  setDemographics(null);
                }
              }
            } else if (entity.subdistrictLgd) {
              // Not found in context, try API
              try {
                const demo = await geoService.getSubdistrictDemographics(
                  entity.subdistrictLgd
                );
                setDemographics(demo);
              } catch (err: any) {
                console.warn("Could not fetch demographics:", err);
                setDemographics(null);
              }
            }
          } else if (entity.subdistrictLgd) {
            // No context data, use API
            try {
              const demo = await geoService.getSubdistrictDemographics(
                entity.subdistrictLgd
              );
              setDemographics(demo);
            } catch (err: any) {
              console.warn("Could not fetch demographics:", err);
              setDemographics(null);
            }
          }

          // For villages, get complaints from API (village-specific)
          try {
            const villageComplaints = await villageService.getVillageComplaints(
              String(entity.lgdCode)
            );

            const complaintStats = {
              total: villageComplaints.count,
              byStatus: villageComplaints.complaints.reduce(
                (acc: Record<string, number>, c: any) => {
                  acc[c.status] = (acc[c.status] || 0) + 1;
                  return acc;
                },
                {}
              ),
              byCategory: villageComplaints.complaints.reduce(
                (acc: Record<string, number>, c: any) => {
                  acc[c.category] = (acc[c.category] || 0) + 1;
                  return acc;
                },
                {}
              ),
              byPriority: villageComplaints.complaints.reduce(
                (acc: Record<string, number>, c: any) => {
                  acc[c.priority] = (acc[c.priority] || 0) + 1;
                  return acc;
                },
                {}
              ),
              list: villageComplaints.complaints,
            };

            setComplaints(complaintStats);
          } catch (err: any) {
            console.warn("Could not fetch village complaints:", err);
            setComplaints(null);
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to fetch entity data");
        console.error("Error fetching entity data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntityData();
  }, [isOpen, entity, districtData, fetchDistrictData]);

  if (!isOpen || !entity) return null;

  const formatNumber = (num: number | undefined) => {
    if (!num) return "Not Available";
    if (num >= 100000) return (num / 100000).toFixed(2) + " Lakh";
    if (num >= 1000) return (num / 1000).toFixed(2) + " K";
    return num.toLocaleString();
  };

  const getEntityTypeLabel = () => {
    switch (entity.type) {
      case "subdistrict":
      case "tehsil":
        return "Sub-District (Tehsil)";
      case "village":
        return "Village";
      case "town":
        return "Town";
      default:
        return "Entity";
    }
  };

  const getEntityIcon = () => {
    switch (entity.type) {
      case "subdistrict":
      case "tehsil":
        return <Building2 className="h-6 w-6 text-orange-600" />;
      case "village":
        return <MapPin className="h-6 w-6 text-green-600" />;
      case "town":
        return <Building2 className="h-6 w-6 text-blue-600" />;
      default:
        return <MapPin className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            {getEntityIcon()}
            {entity.name} - {getEntityTypeLabel()}
          </DialogTitle>
          <p className="text-sm ml-8 text-muted-foreground">
            {entity.subdistrictName && (
              <>Sub-District: {entity.subdistrictName}</>
            )}
            {entity.districtName && <> • District: {entity.districtName}</>}
            {complaints && <> • Total Complaints: {complaints.total}</>}
          </p>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Loading data...</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {!loading && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="demographics"
                className="data-[state=active]:bg-[#0c245a] data-[state=active]:text-white"
              >
                Demographics
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {entity.area !== undefined && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 font-medium">
                          Area
                        </p>
                        <p className="text-xl font-bold">
                          {entity.area
                            ? `${entity.area.toLocaleString()} Sq. Km.`
                            : "Not Available"}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {entity.population !== undefined && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 font-medium">
                          Population
                        </p>
                        <p className="text-xl font-bold">
                          {formatNumber(entity.population)}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* {demographics?.total && (
                    <>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 font-medium">
                            Total Population
                          </p>
                          <p className="text-xl font-bold">
                            {formatNumber(demographics.total.population)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 font-medium">
                            Male
                          </p>
                          <p className="text-xl font-bold">
                            {formatNumber(demographics.total.male)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 font-medium">
                            Female
                          </p>
                          <p className="text-xl font-bold">
                            {formatNumber(demographics.total.female)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 font-medium">
                            Households
                          </p>
                          <p className="text-xl font-bold">
                            {formatNumber(demographics.total.households)}
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )} */}

                  {(entity.totalVillages !== undefined ||
                    villageCount !== null) && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 font-medium">
                          Villages
                        </p>
                        <p className="text-xl font-bold">
                          {(villageCount !== null
                            ? villageCount
                            : entity.totalVillages
                          )?.toLocaleString() || "0"}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {entity.latitude && entity.longitude && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 font-medium">
                          Coordinates
                        </p>
                        <p className="text-xs font-mono">
                          {entity.latitude.toFixed(4)},{" "}
                          {entity.longitude.toFixed(4)}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {entity.lgdCode && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 font-medium">
                          LGD Code
                        </p>
                        <p className="text-xl font-bold">{entity.lgdCode}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Complaint Statistics */}
                {complaints && complaints.total > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Complaint Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="border-yellow-300 bg-yellow-50">
                          <CardContent className="p-3">
                            <p className="text-xs text-yellow-700 font-medium">
                              Pending
                            </p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {complaints.byStatus.pending || 0}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-green-300 bg-green-50">
                          <CardContent className="p-3">
                            <p className="text-xs text-green-700 font-medium">
                              In Progress
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {complaints.byStatus.in_progress || 0}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-gray-200 bg-white">
                          <CardContent className="p-3">
                            <p className="text-xs text-gray-700 font-medium">
                              Resolved
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                              {complaints.byStatus.resolved || 0}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-red-700 bg-red-100">
                          <CardContent className="p-3">
                            <p className="text-xs text-red-900 font-medium">
                              Rejected
                            </p>
                            <p className="text-2xl font-bold text-red-800">
                              {complaints.byStatus.rejected || 0}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Complaints List */}
                {complaints &&
                  complaints.list &&
                  complaints.list.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          All Complaints ({complaints.list.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                          {complaints.list.map((complaint: any) => (
                            <Card
                              key={complaint.id || complaint.complaint_id}
                              className="hover:bg-gray-50 transition-colors border-l-4 border-l-blue-500"
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="font-semibold text-sm text-gray-900">
                                        {complaint.title ||
                                          "Untitled Complaint"}
                                      </h4>
                                      <p className="text-xs text-gray-500 font-mono flex-shrink-0">
                                        {complaint.complaint_id}
                                      </p>
                                    </div>

                                    {/* Location Information */}
                                    {complaint.village_name && (
                                      <p className="text-xs mt-2 mb-2">
                                        <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md inline-block">
                                          {complaint.village_name}
                                        </span>
                                        {complaint.subdistrict_name && (
                                          <span className="text-gray-600 ml-2">
                                            , {complaint.subdistrict_name}
                                          </span>
                                        )}
                                      </p>
                                    )}

                                    {/* Badges */}
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                      <Badge
                                        className={`text-xs font-medium ${
                                          complaint.status === "pending"
                                            ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                            : complaint.status === "in_progress"
                                            ? "bg-green-100 text-green-800 border-green-300"
                                            : complaint.status === "resolved"
                                            ? "bg-white text-gray-800 border-gray-300"
                                            : "bg-red-900 text-white border-red-900"
                                        }`}
                                      >
                                        {complaint.status?.replace("_", " ") ||
                                          "unknown"}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className="text-xs capitalize"
                                      >
                                        {complaint.category || "uncategorized"}
                                      </Badge>
                                      {complaint.sub_category && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs capitalize"
                                        >
                                          {complaint.sub_category.replace(
                                            "_",
                                            " "
                                          )}
                                        </Badge>
                                      )}
                                      {complaint.priority && (
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-medium capitalize ${
                                            complaint.priority === "urgent"
                                              ? "border-red-500 text-red-700 bg-red-50"
                                              : complaint.priority === "high"
                                              ? "border-orange-500 text-orange-700 bg-orange-50"
                                              : complaint.priority === "medium"
                                              ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                                              : "border-gray-400 text-gray-600"
                                          }`}
                                        >
                                          {complaint.priority}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Date Information */}
                                    {complaint.created_at && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        Created:{" "}
                                        {new Date(
                                          complaint.created_at
                                        ).toLocaleDateString("en-IN", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    )}

                                    {/* View and Manage Button */}
                                    {(complaint.id || complaint._id) && (
                                      <div className="mt-3">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => {
                                            const complaintId =
                                              complaint.id || complaint._id;
                                            navigate(
                                              `/admin/complaints/${complaintId}`
                                            );
                                            onClose(); // Close the panel when navigating
                                          }}
                                        >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          View and Manage
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* No Complaints Message */}
                {complaints && complaints.total === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No complaints found for this entity.</p>
                    </CardContent>
                  </Card>
                )}

                {!demographics && !complaints && (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No additional data available for this entity.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Demographics Tab */}
              <TabsContent value="demographics" className="mt-4 space-y-4">
                {demographics ? (
                  <>
                    {/* Village Count - Only for subdistricts */}
                    {(entity.type === "subdistrict" ||
                      entity.type === "tehsil") &&
                      villageCount !== null && (
                        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-600 mb-1 font-medium">
                                  Total Villages
                                </p>
                                <p className="text-2xl font-bold text-violet-700">
                                  {villageCount.toLocaleString()}
                                </p>
                              </div>
                              <Users className="h-8 w-8 text-violet-400" />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    {/* KPI Cards - Full Width */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            Total Population
                          </p>
                          <p className="text-xl font-bold text-blue-700">
                            {formatNumber(demographics.total.population)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            Male
                          </p>
                          <p className="text-xl font-bold text-indigo-700">
                            {formatNumber(demographics.total.male)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            Female
                          </p>
                          <p className="text-xl font-bold text-pink-700">
                            {formatNumber(demographics.total.female)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            Households
                          </p>
                          <p className="text-xl font-bold text-purple-700">
                            {demographics.total.households > 0
                              ? formatNumber(demographics.total.households)
                              : "N/A"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            Sex Ratio
                          </p>
                          <p className="text-xl font-bold text-green-700">
                            {demographics.metrics.sexRatio || "N/A"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            Child Ratio
                          </p>
                          <p className="text-xl font-bold text-amber-700">
                            {demographics.metrics.childRatio
                              ? `${demographics.metrics.childRatio.toFixed(2)}%`
                              : "N/A"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            SC %
                          </p>
                          <p className="text-xl font-bold text-cyan-700">
                            {demographics.metrics.scPercentage
                              ? `${demographics.metrics.scPercentage.toFixed(
                                  2
                                )}%`
                              : "N/A"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            ST %
                          </p>
                          <p className="text-xl font-bold text-teal-700">
                            {demographics.metrics.stPercentage
                              ? `${demographics.metrics.stPercentage.toFixed(
                                  2
                                )}%`
                              : "N/A"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Donut Charts - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Male vs Female Donut Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Male vs Female
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DonutChart
                            data={[
                              {
                                name: "Male",
                                value: demographics.total.male,
                                color: "#3B82F6",
                              },
                              {
                                name: "Female",
                                value: demographics.total.female,
                                color: "#EC4899",
                              },
                            ]}
                            centerLabel={`${formatNumber(
                              demographics.total.population
                            )}`}
                            centerSubLabel="Total Population"
                          />
                        </CardContent>
                      </Card>

                      {/* Urban vs Rural Donut Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Urban vs Rural
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DonutChart
                            data={[
                              {
                                name: "Urban",
                                value: demographics.urban.population,
                                color: "#3B82F6",
                              },
                              {
                                name: "Rural",
                                value: demographics.rural.population,
                                color: "#10B981",
                              },
                            ]}
                            centerLabel={`${formatNumber(
                              demographics.total.population
                            )}`}
                            centerSubLabel="Total Population"
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Religion Section - Only for sub-districts */}
                    {(entity.type === "subdistrict" ||
                      entity.type === "tehsil") &&
                      (subDistrictReligionData ? (
                        <>
                          {/* Religion Distribution - Switchable */}
                          {(() => {
                            const getReligionData = () => {
                              const stats =
                                subDistrictReligionData.stats?.[religionView];
                              if (!stats?.religion) return null;
                              return stats;
                            };

                            const religionStats = getReligionData();
                            const colors = [
                              "#ff671f", // hindu - orange
                              "#00401A", // muslim - dark green
                              "#3B82F6", // christian - blue
                              "#F59E0B", // sikh - amber
                              "#8B5CF6", // buddhist - purple
                              "#EC4899", // jain - pink
                              "#6B7280", // others - gray
                              "#94A3B8", // not_stated - slate
                            ];

                            if (!religionStats) return null;

                            const pieChartData = Object.entries(
                              religionStats.religion
                            )
                              .filter(
                                ([_, data]: [string, any]) =>
                                  data && data.persons > 0
                              )
                              .map(([religion, data]: [string, any]) => ({
                                name:
                                  religion.charAt(0).toUpperCase() +
                                  religion.slice(1),
                                value: data.persons,
                              }));

                            const totalPop =
                              religionStats.population?.persons || 0;

                            return (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">
                                    Religion Distribution ({religionView})
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-shrink-0 flex justify-center">
                                      <PieChart
                                        data={pieChartData}
                                        colors={colors}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-col gap-2 w-full">
                                        <button
                                          onClick={() =>
                                            setReligionView("Total")
                                          }
                                          className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                                            religionView === "Total"
                                              ? "bg-[#0c245a] text-white shadow-md"
                                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          }`}
                                        >
                                          Total
                                        </button>
                                        <button
                                          onClick={() =>
                                            setReligionView("Rural")
                                          }
                                          className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                                            religionView === "Rural"
                                              ? "bg-[#0c245a] text-white shadow-md"
                                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          }`}
                                        >
                                          Rural
                                        </button>
                                        <button
                                          onClick={() =>
                                            setReligionView("Urban")
                                          }
                                          className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                                            religionView === "Urban"
                                              ? "bg-[#0c245a] text-white shadow-md"
                                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          }`}
                                        >
                                          Urban
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })()}

                          {/* Towns within Sub-district */}
                          {subDistrictReligionData.towns &&
                            subDistrictReligionData.towns.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Towns (
                                    {subDistrictReligionData.towns.length})
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subDistrictReligionData.towns.map(
                                      (town: any, idx: number) => (
                                        <Card
                                          key={idx}
                                          className="border-l-4 border-l-blue-500"
                                        >
                                          <CardContent className="p-4">
                                            <h4 className="font-bold text-sm mb-1">
                                              {town.name}
                                            </h4>
                                            <p className="text-xs text-gray-600 mb-3">
                                              {town.type}
                                            </p>

                                            {/* Population - Horizontal Stacked Bar */}
                                            {town.population?.persons && (
                                              <div className="mb-3">
                                                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                                                  Population:{" "}
                                                  {town.population.persons.toLocaleString()}
                                                </p>
                                                <HorizontalStackedBar
                                                  male={
                                                    town.population.males || 0
                                                  }
                                                  female={
                                                    town.population.females || 0
                                                  }
                                                  height={24}
                                                />
                                              </div>
                                            )}

                                            {/* Religion - Small Donut Chart */}
                                            {town.religion &&
                                              (() => {
                                                const religionEntries =
                                                  Object.entries(town.religion)
                                                    .filter(
                                                      ([_, data]: [
                                                        string,
                                                        any
                                                      ]) =>
                                                        data && data.persons > 0
                                                    )
                                                    .sort(
                                                      (
                                                        [_, a]: [string, any],
                                                        [__, b]: [string, any]
                                                      ) => b.persons - a.persons
                                                    );

                                                // Get top 2 religions (Muslim and Hindu)
                                                const topReligions =
                                                  religionEntries
                                                    .slice(0, 2)
                                                    .map(
                                                      ([religion, data]: [
                                                        string,
                                                        any
                                                      ]) => ({
                                                        name:
                                                          religion
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                          religion.slice(1),
                                                        value: data.persons,
                                                        color:
                                                          religion.toLowerCase() ===
                                                          "muslim"
                                                            ? "#00401A"
                                                            : religion.toLowerCase() ===
                                                              "hindu"
                                                            ? "#ff671f"
                                                            : "#3B82F6",
                                                      })
                                                    );

                                                if (topReligions.length === 0)
                                                  return null;

                                                return (
                                                  <div className="mt-3 pt-3 border-t">
                                                    <SmallDonutChart
                                                      data={topReligions}
                                                      size={150}
                                                    />
                                                  </div>
                                                );
                                              })()}
                                          </CardContent>
                                        </Card>
                                      )
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                        </>
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center text-gray-500">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>
                              Religion demographic data not available for this
                              sub-district.
                            </p>
                          </CardContent>
                        </Card>
                      ))}

                    {/* Caste Section - Only for sub-districts */}
                    {(entity.type === "subdistrict" ||
                      entity.type === "tehsil") &&
                      subDistrictCasteData && (
                        <>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Caste Demographics
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Scheduled Castes - Left Side */}
                                {subDistrictCasteData.demographics
                                  ?.scheduled_castes?.length > 0 && (
                                  <Card className="border-l-4 border-l-blue-500">
                                    <CardHeader>
                                      <CardTitle className="text-base">
                                        Scheduled Castes (SC)
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {(() => {
                                        const filteredCastes =
                                          subDistrictCasteData.demographics.scheduled_castes.filter(
                                            (c: any) =>
                                              c.caste_name !==
                                                "All Schedule Castes" &&
                                              c.caste_name !==
                                                "All Schedule Tribes"
                                          );

                                        const pieChartData = filteredCastes
                                          .slice(0, 10)
                                          .map((caste: any) => ({
                                            name: caste.caste_name,
                                            value: caste.population.total,
                                          }))
                                          .sort((a, b) => b.value - a.value); // Sort in descending order

                                        const colors = [
                                          "#3B82F6",
                                          "#10B981",
                                          "#F59E0B",
                                          "#EF4444",
                                          "#8B5CF6",
                                          "#EC4899",
                                          "#06B6D4",
                                          "#84CC16",
                                          "#F97316",
                                          "#6366F1",
                                        ];

                                        const total = filteredCastes.reduce(
                                          (sum: number, c: any) =>
                                            sum + c.population.total,
                                          0
                                        );

                                        return (
                                          <div className="flex flex-col items-center gap-4">
                                            {/* Pie Chart */}
                                            <div className="flex-shrink-0 w-full">
                                              <PieChartColumn
                                                data={pieChartData}
                                                colors={colors}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Scheduled Tribes - Right Side */}
                                {subDistrictCasteData.demographics
                                  ?.scheduled_tribes?.length > 0 && (
                                  <Card className="border-l-4 border-l-green-500">
                                    <CardHeader>
                                      <CardTitle className="text-base">
                                        Scheduled Tribes (ST)
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {(() => {
                                        const filteredTribes =
                                          subDistrictCasteData.demographics.scheduled_tribes.filter(
                                            (c: any) =>
                                              c.caste_name !==
                                                "All Schedule Castes" &&
                                              c.caste_name !==
                                                "All Schedule Tribes"
                                          );

                                        const pieChartData = filteredTribes
                                          .map((caste: any) => ({
                                            name: caste.caste_name,
                                            value: caste.population.total,
                                          }))
                                          .sort((a, b) => b.value - a.value); // Sort in descending order

                                        const colors = [
                                          "#3B82F6",
                                          "#10B981",
                                          "#F59E0B",
                                          "#EF4444",
                                          "#8B5CF6",
                                          "#EC4899",
                                        ];

                                        const total = filteredTribes.reduce(
                                          (sum: number, c: any) =>
                                            sum + c.population.total,
                                          0
                                        );

                                        return (
                                          <div className="flex flex-col items-center gap-4">
                                            {/* Pie Chart */}
                                            <div className="flex-shrink-0 w-full">
                                              <PieChartColumn
                                                data={pieChartData}
                                                colors={colors}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </CardContent>
                                  </Card>
                                )}
                              </div>

                              {/* OBC and General - If available */}
                              {(subDistrictCasteData.demographics?.obcs
                                ?.length > 0 ||
                                subDistrictCasteData.demographics?.general
                                  ?.length > 0) && (
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* OBC */}
                                  {subDistrictCasteData.demographics?.obcs
                                    ?.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-base">
                                          Other Backward Classes (OBC)
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                                          {subDistrictCasteData.demographics.obcs.map(
                                            (caste: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="p-2 bg-gray-50 rounded"
                                              >
                                                <p className="font-medium text-sm">
                                                  {caste.caste_name}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                  {caste.population.total.toLocaleString()}{" "}
                                                  persons
                                                </p>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* General */}
                                  {subDistrictCasteData.demographics?.general
                                    ?.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-base">
                                          General Category
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                                          {subDistrictCasteData.demographics.general.map(
                                            (caste: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="p-2 bg-gray-50 rounded"
                                              >
                                                <p className="font-medium text-sm">
                                                  {caste.caste_name}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                  {caste.population.total.toLocaleString()}{" "}
                                                  persons
                                                </p>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Demographics data not available for this entity.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DynamicEntityPanel;
