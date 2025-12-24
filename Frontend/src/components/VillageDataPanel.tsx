/**
 * Village Data Panel Component
 * Similar to DistrictDataPanel but for village-level data
 * Displays village information and complaints when village is clicked
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  PieChart as PieChartIcon,
  BarChart3,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Users,
  ExternalLink,
} from "lucide-react";
import { geoService, SubdistrictDemographics } from "@/services/geo.service";

interface VillageComplaint {
  id: string;
  complaint_id: string;
  title: string;
  category: string;
  sub_category?: string;
  status: string;
  priority: string;
  created_at: string;
}

interface VillageDataPanelProps {
  villageName: string;
  lgdCode: string;
  subdistrictName: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  area?: number;
  sarpanch?: string;
  complaints: VillageComplaint[];
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

// Color palettes
const STATUS_COLORS = {
  pending: "#ff671f",
  in_progress: "#3B82F6",
  resolved: "#10B981",
  rejected: "#EF4444",
};

const CATEGORY_COLORS: Record<string, string> = {
  roads: "#8B5CF6",
  water: "#06B6D4",
  electricity: "#ff671f",
  documents: "#EC4899",
  health: "#10B981",
  education: "#3B82F6",
  other: "#6B7280",
};

const VillageDataPanel: React.FC<VillageDataPanelProps> = ({
  villageName,
  lgdCode,
  subdistrictName,
  latitude,
  longitude,
  population,
  area,
  sarpanch,
  complaints,
  isOpen,
  onClose,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [demographics, setDemographics] = useState<SubdistrictDemographics | null>(null);
  const [loadingDemographics, setLoadingDemographics] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Helper function to format numbers
  const formatNumber = (num: number): string => {
    if (num === 0) return "0";
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(2)}M`;
  };

  // Fetch demographics when panel opens
  useEffect(() => {
    if (isOpen && lgdCode) {
      const fetchDemographics = async () => {
        try {
          setLoadingDemographics(true);
          // Fetch village demographics summary (Total, Urban, Rural format)
          const demo = await geoService.getVillageDemographicsSummary(lgdCode);
          setDemographics(demo);
        } catch (err) {
          console.error("Failed to fetch village demographics:", err);
          // Set empty demographics structure with 0s
          setDemographics({
            areaName: villageName,
            level: "village",
            total: {
              population: 0,
              male: 0,
              female: 0,
              households: 0,
              children: 0,
              sc: 0,
              st: 0,
            },
            rural: {
              population: 0,
              male: 0,
              female: 0,
              households: 0,
            },
            urban: {
              population: 0,
              male: 0,
              female: 0,
              households: 0,
            },
            metrics: {
              sexRatio: 0,
              childRatio: 0,
              scPercentage: 0,
              stPercentage: 0,
              urbanPercentage: 0,
              ruralPercentage: 0,
            },
          });
        } finally {
          setLoadingDemographics(false);
        }
      };
      fetchDemographics();
    }
  }, [isOpen, lgdCode, villageName]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Loading Village Data...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate statistics from complaints
  const totalComplaints = complaints.length;
  const byStatus = complaints.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byCategory = complaints.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byPriority = complaints.reduce((acc, c) => {
    acc[c.priority] = (acc[c.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Status pie chart data
  const statusData = Object.entries(byStatus).map(([status, count]) => ({
    name: status.replace("_", " ").toUpperCase(),
    value: count,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "#6B7280",
  }));

  // Category bar chart data
  const categoryData = Object.entries(byCategory).map(([category, count]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    count,
    fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MapPin className="h-6 w-6 text-green-600" />
            {villageName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            LGD Code: {lgdCode} | Sub-district: {subdistrictName}
          </p>
        </DialogHeader>

        {/* Tabs for Overview and Demographics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
          </TabsList>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-2 min-h-0 mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Complaints
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {totalComplaints}
                    </div>
                  </CardContent>
                </Card>

                {latitude && longitude && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">
                        Coordinates
                      </div>
                      <div className="text-xs font-mono">
                        {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {population && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">
                        Population
                      </div>
                      <div className="text-2xl font-bold">
                        {population.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sarpanch Information */}
              {sarpanch && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Village Leadership
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <User className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Sarpanch</div>
                        <div className="text-lg font-semibold">{sarpanch}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Complaints by Status - Pie Chart */}
            {totalComplaints > 0 && statusData.length > 0 && (
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

            {/* Complaints by Category - Bar Chart */}
            {totalComplaints > 0 && categoryData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Complaints by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8B5CF6">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Complaints List */}
            {totalComplaints > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Complaints ({totalComplaints})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complaints.map((complaint) => (
                      <div
                        key={complaint.id}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">
                              {complaint.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              ID: {complaint.complaint_id}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  complaint.status === "pending"
                                    ? "bg-orange-100 text-orange-700"
                                    : complaint.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : complaint.status === "resolved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {complaint.status.replace("_", " ")}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                                {complaint.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  complaint.priority === "urgent"
                                    ? "bg-red-100 text-red-700"
                                    : complaint.priority === "high"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {complaint.priority}
                              </span>
                            </div>
                            {/* View and Manage Button */}
                            {(complaint.id || complaint._id) && (
                              <div className="mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    const complaintId = complaint.id || complaint._id;
                                    navigate(`/admin/complaints/${complaintId}`);
                                    onClose(); // Close the panel when navigating
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View and Manage
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(
                              complaint.created_at
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

              {/* No Complaints Message */}
              {totalComplaints === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      No Complaints Yet
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      This village has no registered complaints.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Demographics Tab */}
            <TabsContent value="demographics" className="space-y-6 mt-0">
              {loadingDemographics ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Loading demographics data...
                    </p>
                  </CardContent>
                </Card>
              ) : demographics ? (
                <>
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
                            : "0"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 mb-1 font-medium">
                          Sex Ratio
                        </p>
                        <p className="text-xl font-bold text-green-700">
                          {demographics.metrics.sexRatio || "0"}
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
                            : "0%"}
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
                            ? `${demographics.metrics.scPercentage.toFixed(2)}%`
                            : "0%"}
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
                            ? `${demographics.metrics.stPercentage.toFixed(2)}%`
                            : "0%"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Total, Urban, Rural Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Total</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Population</div>
                            <div className="text-xl font-bold">
                              {formatNumber(demographics.total.population)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Male</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.total.male)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Female</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.total.female)}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Households</div>
                            <div className="text-lg font-semibold">
                              {formatNumber(demographics.total.households)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Children (0-6)</div>
                            <div className="text-lg font-semibold">
                              {formatNumber(demographics.total.children)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground">SC</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.total.sc)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">ST</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.total.st)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Rural */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Rural</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Population</div>
                            <div className="text-xl font-bold">
                              {formatNumber(demographics.rural.population)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Male</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.rural.male)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Female</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.rural.female)}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Households</div>
                            <div className="text-lg font-semibold">
                              {formatNumber(demographics.rural.households)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Urban */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Urban</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Population</div>
                            <div className="text-xl font-bold">
                              {formatNumber(demographics.urban.population)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Male</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.urban.male)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Female</div>
                              <div className="text-lg font-semibold">
                                {formatNumber(demographics.urban.female)}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Households</div>
                            <div className="text-lg font-semibold">
                              {formatNumber(demographics.urban.households)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Demographics Data Not Available
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Census demographics data is not available for this village.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VillageDataPanel;
