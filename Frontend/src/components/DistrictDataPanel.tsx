/**
 * District Data Panel Component
 * Displays district heat map data in various chart formats
 * Shows as a popup dialog above the map when a district is clicked
 */

import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  PolarAngleAxis,
  PolarRadiusAxis,
  PolarGrid,
  Radar,
  RadarChart,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  DistrictHeatMapData,
  SubdistrictDemographics,
} from "@/services/geo.service";
import { complaintHistoryService, HistoricalComparison } from "@/services/complaintHistory.service";

interface DistrictDataPanelProps {
  data: DistrictHeatMapData | null;
  demographics?: SubdistrictDemographics | null;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  hasError?: boolean;
  isEmpty?: boolean;
}

// Color palettes for charts
const STATUS_COLORS = {
  pending: "#ff671f", // Orange
  in_progress: "#3B82F6", // Blue
  resolved: "#10B981", // Green
  rejected: "#EF4444", // Red
};

const CATEGORY_COLORS = [
  "#8B5CF6", // Purple - roads
  "#06B6D4", // Cyan - water
  "#ff671f", // Orange - electricity
  "#EC4899", // Pink - documents
  "#10B981", // Green - health
  "#3B82F6", // Blue - education
  "#6B7280", // Gray - other
];

// Helper function to validate district data
const isValidDistrictData = (data: DistrictHeatMapData | null): boolean => {
  if (!data) return false;

  // Check if essential fields exist
  if (
    !data.districtCode ||
    !data.districtName ||
    data.heatValue === undefined
  ) {
    return false;
  }

  // Check if there's any meaningful data to display
  const hasStatusData =
    data.byStatus && Object.values(data.byStatus).some((v) => (v || 0) > 0);
  const hasCategoryData =
    data.byCategory &&
    Object.values(data.byCategory).some((cat) => (cat?.count || 0) > 0);
  const hasTimeSeriesData = data.timeSeries && data.timeSeries.length > 0;
  const hasTopIssuesData = data.topIssues && data.topIssues.length > 0;

  // At least one type of data should be available
  return (
    hasStatusData ||
    hasCategoryData ||
    hasTimeSeriesData ||
    hasTopIssuesData ||
    (data.totalComplaints || 0) > 0
  );
};

const DistrictDataPanel: React.FC<DistrictDataPanelProps> = ({
  data,
  demographics,
  isOpen,
  onClose,
  loading = false,
  hasError = false,
  isEmpty = false,
}) => {
  const [historicalComparison, setHistoricalComparison] = useState<HistoricalComparison | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch historical comparison when panel opens
  useEffect(() => {
    if (isOpen && data?.districtCode) {
      setLoadingHistory(true);
      complaintHistoryService
        .getComparison("district", data.districtCode, "daily")
        .then((comparison) => {
          setHistoricalComparison(comparison);
        })
        .catch((err) => {
          console.warn("Failed to fetch historical comparison:", err);
          setHistoricalComparison(null);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [isOpen, data?.districtCode]);
  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl w-[90vw] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Loading District Data...</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center py-12 min-h-0">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show empty state if data is empty or invalid
  if (hasError || isEmpty || !data || !isValidDistrictData(data)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              District Data
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center py-12 min-h-0">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  No District Level Data Available
                </h3>
                <p className="text-sm text-muted-foreground">
                  District level data is not present right now. Work is in
                  progress.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Transform byStatus data for Pie Chart
  const statusData = data.byStatus
    ? [
        {
          name: "Pending",
          value: data.byStatus.pending || 0,
          fill: STATUS_COLORS.pending,
        },
        {
          name: "In Progress",
          value: data.byStatus.in_progress || 0,
          fill: STATUS_COLORS.in_progress,
        },
        {
          name: "Resolved",
          value: data.byStatus.resolved || 0,
          fill: STATUS_COLORS.resolved,
        },
        {
          name: "Rejected",
          value: data.byStatus.rejected || 0,
          fill: STATUS_COLORS.rejected,
        },
      ].filter((item) => item.value > 0)
    : [];

  // Transform byCategory data for Polar Area Chart
  const categoryData = data.byCategory
    ? Object.entries(data.byCategory)
        .map(([category, info], index) => ({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          value: info?.count || 0,
          fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
        .filter((item) => item.value > 0)
    : [];

  // Transform sub-category data for Radar Chart
  // Aggregate all sub-categories across all main categories
  const subCategoryMap = new Map<string, number>();
  if (data.byCategory) {
    Object.entries(data.byCategory).forEach(([category, info]) => {
      if (info?.sub) {
        Object.entries(info.sub).forEach(([sub, count]) => {
          const key = `${category}_${sub}`;
          subCategoryMap.set(key, (subCategoryMap.get(key) || 0) + count);
        });
      }
    });
  }

  // Get top 6 sub-categories for radar chart (too many becomes cluttered)
  const radarData = Array.from(subCategoryMap.entries())
    .map(([key, value]) => ({
      category: key.split("_")[1]?.replace(/_/g, " ") || key,
      value,
      fullKey: key,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item) => ({
      category: item.category,
      count: item.value,
    }));

  // Transform timeSeries data for Line/Area Chart
  const timeSeriesData = data.timeSeries
    ? data.timeSeries
        .map((item) => ({
          date: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          count: item.count,
          fullDate: item.date,
        }))
        .sort(
          (a, b) =>
            new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
        )
    : [];

  // Transform topIssues data for Horizontal Bar Chart
  const topIssuesData = data.topIssues
    ? data.topIssues
        .map((issue) => ({
          name: `${issue.category}${issue.sub ? ` - ${issue.sub}` : ""}`,
          count: issue.count,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl">{data.districtName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            District Code: {data.districtCode} | Total Complaints:{" "}
            {data.totalComplaints || 0}
          </p>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Heat Value
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {data.heatValue}
                  </div>
                </CardContent>
              </Card>
              {/* Historical Comparison Card */}
              {historicalComparison && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Previous Complaints
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {historicalComparison.previous}
                      </div>
                      {historicalComparison.change !== 0 && (
                        <div
                          className={`flex items-center gap-1 text-sm font-medium ${
                            historicalComparison.trend === "up"
                              ? "text-red-600"
                              : historicalComparison.trend === "down"
                              ? "text-green-600"
                              : "text-gray-600"
                          }`}
                        >
                          {historicalComparison.trend === "up" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : historicalComparison.trend === "down" ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                          <span>
                            {historicalComparison.change > 0 ? "+" : ""}
                            {historicalComparison.change} (
                            {historicalComparison.changePercent > 0 ? "+" : ""}
                            {historicalComparison.changePercent.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Current: {historicalComparison.current}
                    </div>
                  </CardContent>
                </Card>
              )}
              {loadingHistory && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Loading History...
                    </div>
                    <Loader2 className="w-4 h-4 animate-spin mt-2" />
                  </CardContent>
                </Card>
              )}
              {data.normalized?.per100k && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Per 100k
                    </div>
                    <div className="text-2xl font-bold">
                      {data.normalized.per100k.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
              )}
              {data.meta?.population && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Population
                    </div>
                    <div className="text-2xl font-bold">
                      {(data.meta.population / 1000000).toFixed(1)}M
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* DEMOGRAPHICS SECTION (Census 2011) */}
            {demographics && (
              <>
                {/* Demographics Overview Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Info className="h-5 w-5" />
                      Demographics (Census 2011)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Top Row - Main Populations */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-gray-900">
                          {demographics.total.population.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-gray-600 mt-1">
                          Total Population
                        </div>
                      </div>

                      <div className="text-center p-4 bg-blue-50 rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-blue-700">
                          {demographics.urban.population.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-blue-600 mt-1">
                          Urban (
                          {demographics.metrics.urbanPercentage.toFixed(1)}%)
                        </div>
                      </div>

                      <div className="text-center p-4 bg-green-50 rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-green-700">
                          {demographics.rural.population.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-green-600 mt-1">
                          Rural (
                          {demographics.metrics.ruralPercentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row - Key Metrics */}
                    <div className="grid grid-cols-4 gap-3 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-xl font-bold text-pink-600">
                          {demographics.metrics.sexRatio}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Sex Ratio
                        </div>
                        <div className="text-xs text-gray-500">
                          (F per 1000 M)
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {demographics.metrics.childRatio.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Child Pop
                        </div>
                        <div className="text-xs text-gray-500">(0-6 years)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">
                          {demographics.metrics.scPercentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">SC Pop</div>
                        <div className="text-xs text-gray-500">
                          (Scheduled Caste)
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-cyan-600">
                          {demographics.total.households.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Households
                        </div>
                        <div className="text-xs text-gray-500">(Total)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Urban vs Rural Distribution Donut Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Urban vs Rural Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Rural",
                              value: demographics.rural.population,
                              fill: "#10B981",
                            },
                            {
                              name: "Urban",
                              value: demographics.urban.population,
                              fill: "#3B82F6",
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#3B82F6" />
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => value.toLocaleString()}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Population Breakdown Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Population Breakdown (Male vs Female)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          {
                            category: "Total",
                            Male: demographics.total.male,
                            Female: demographics.total.female,
                          },
                          {
                            category: "Urban",
                            Male: demographics.urban.male,
                            Female: demographics.urban.female,
                          },
                          {
                            category: "Rural",
                            Male: demographics.rural.male,
                            Female: demographics.rural.female,
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => value.toLocaleString()}
                        />
                        <Legend />
                        <Bar dataKey="Male" fill="#3B82F6" name="Male" />
                        <Bar dataKey="Female" fill="#EC4899" name="Female" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 1. Pie Chart - byStatus */}
            {statusData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Complaints by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 2. Polar Area Chart - byCategory (Donut Chart) */}
            {categoryData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Complaints by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        innerRadius={20}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 3. Radar Chart - Sub-category distributions */}
            {radarData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Top Sub-Category Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fontSize: 12 }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, "dataMax"]} />
                      <Radar
                        name="Count"
                        dataKey="count"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 4. Line/Area Chart - timeSeries */}
            {timeSeriesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Complaint Trends Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.6}
                        name="Complaints"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 5. Horizontal Bar Chart - topIssues */}
            {topIssuesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topIssuesData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={90} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#EF4444" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {data.lastAggregatedAt && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Last updated:{" "}
                    {new Date(data.lastAggregatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DistrictDataPanel;
