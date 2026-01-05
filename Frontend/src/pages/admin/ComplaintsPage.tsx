/**
 * Complaints Management Page
 * Main complaints listing page
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComplaints } from "@/hooks/useComplaints";
import { useAuth } from "@/hooks/useAuth";
import { complaintsService } from "@/services/complaints.service";
import ComplaintTimeline from "@/components/complaints/ComplaintTimeline";
import {
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
} from "lucide-react";

const ComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ category?: string }>();
  const { user, isOfficer } = useAuth();
  const { complaints, fetchComplaints, loading } = useComplaints();
  const [myComplaints, setMyComplaints] = React.useState<any[]>([]);
  const [loadingMyComplaints, setLoadingMyComplaints] = React.useState(false);

  const isMyComplaintsPage = location.pathname.includes("/my-complaints");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [subDistrictFilter, setSubDistrictFilter] = useState("all");

  // District to Sub-district mapping
  const districtSubDistrictMap: Record<string, string[]> = {
    Budaun: ["Bisauli", "Bilsi", "Sahaswan", "Badaun", "Dataganj"],
  };

  // Get available sub-districts based on selected district
  const availableSubDistricts =
    districtFilter !== "all" && districtSubDistrictMap[districtFilter]
      ? districtSubDistrictMap[districtFilter]
      : [];

  // Initialize filters from URL
  useEffect(() => {
    // Check if we're on a category route
    if (params.category) {
      setCategoryFilter(params.category);
      // Reset status filter when filtering by category
      setStatusFilter("all");
    } else {
      // Check if we're on a status route
      const pathParts = location.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];

      if (lastPart === "pending") {
        setStatusFilter("pending");
        setCategoryFilter("all"); // Reset category when filtering by status
      } else if (lastPart === "in-progress" || lastPart === "in_progress") {
        setStatusFilter("in_progress");
        setCategoryFilter("all");
      } else if (lastPart === "resolved") {
        setStatusFilter("resolved");
        setCategoryFilter("all");
      } else if (lastPart === "rejected") {
        setStatusFilter("rejected");
        setCategoryFilter("all");
      } else if (lastPart === "complaints") {
        // Reset to all if on base complaints route
        setStatusFilter("all");
        setCategoryFilter("all");
      }
    }
  }, [location.pathname, params.category]);

  // Reset sub-district when district changes
  useEffect(() => {
    if (districtFilter === "all") {
      setSubDistrictFilter("all");
    }
  }, [districtFilter]);

  useEffect(() => {
    if (isMyComplaintsPage && isOfficer) {
      // Fetch officer's assigned complaints
      const loadMyComplaints = async () => {
        try {
          setLoadingMyComplaints(true);
          const response = await complaintsService.getMyComplaints({
            status: statusFilter !== "all" ? (statusFilter as any) : undefined,
            category:
              categoryFilter !== "all" ? (categoryFilter as any) : undefined,
            priority:
              priorityFilter !== "all" ? (priorityFilter as any) : undefined,
            search: searchTerm || undefined,
          });
          setMyComplaints(response.data || []);
        } catch (error: any) {
          console.error("Error loading my complaints:", error);
          setMyComplaints([]);
        } finally {
          setLoadingMyComplaints(false);
        }
      };
      loadMyComplaints();
    } else {
      fetchComplaints({});
    }
  }, [
    isMyComplaintsPage,
    isOfficer,
    statusFilter,
    categoryFilter,
    priorityFilter,
    searchTerm,
  ]);

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        bgColor: "bg-yellow-500",
        textColor: "text-white",
        icon: Clock,
        label: "Pending",
      },
      "in-progress": {
        bgColor: "bg-orange-500",
        textColor: "text-white",
        icon: AlertCircle,
        label: "In Progress",
      },
      in_progress: {
        bgColor: "bg-orange-500",
        textColor: "text-white",
        icon: AlertCircle,
        label: "In Progress",
      },
      resolved: {
        bgColor: "bg-green-500",
        textColor: "text-white",
        icon: CheckCircle,
        label: "Resolved",
      },
      rejected: {
        bgColor: "bg-red-700",
        textColor: "text-white",
        icon: XCircle,
        label: "Rejected",
      },
    };
    const statusConfig =
      config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;
    return (
      <Badge
        className={`flex items-center gap-1 ${statusConfig.bgColor} ${statusConfig.textColor} border-0`}
      >
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: {
        iconColor: "text-green-600",
        label: "Low",
      },
      medium: {
        iconColor: "text-yellow-500",
        label: "Medium",
      },
      high: {
        iconColor: "text-orange-500",
        label: "High",
      },
      urgent: {
        iconColor: "text-red-700",
        label: "Urgent",
      },
    };
    const priorityConfig =
      config[priority as keyof typeof config] || config.medium;
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 bg-transparent border-0 text-foreground"
      >
        <Tag className={`w-3 h-3 ${priorityConfig.iconColor}`} />
        {priorityConfig.label}
      </Badge>
    );
  };

  // Use my complaints if on my-complaints page, otherwise use all complaints
  const complaintsToDisplay =
    isMyComplaintsPage && isOfficer ? myComplaints : complaints || [];
  const isLoading =
    isMyComplaintsPage && isOfficer ? loadingMyComplaints : loading;

  const filteredComplaints =
    complaintsToDisplay.filter((complaint) => {
      const matchesSearch =
        searchTerm === "" ||
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        complaint.complaintId?.toLowerCase().includes(searchTerm.toLowerCase());
      // Handle both 'in-progress' and 'in_progress' status formats
      const normalizedStatus =
        complaint.status === "in-progress" ? "in_progress" : complaint.status;
      const matchesStatus =
        statusFilter === "all" ||
        normalizedStatus === statusFilter ||
        complaint.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || complaint.priority === priorityFilter;
      // Case-insensitive category matching
      const matchesCategory =
        categoryFilter === "all" ||
        (complaint.category &&
          complaint.category.toLowerCase() === categoryFilter.toLowerCase());
      // District matching (case-insensitive)
      const complaintDistrict =
        (complaint as any).district_name || complaint.districtName || "";
      const matchesDistrict =
        districtFilter === "all" ||
        (complaintDistrict &&
          complaintDistrict.toLowerCase() === districtFilter.toLowerCase());
      // Sub-district matching (case-insensitive)
      const complaintSubDistrict =
        (complaint as any).subdistrict_name || complaint.subdistrictName || "";
      const matchesSubDistrict =
        subDistrictFilter === "all" ||
        (complaintSubDistrict &&
          complaintSubDistrict.toLowerCase() ===
            subDistrictFilter.toLowerCase());
      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesDistrict &&
        matchesSubDistrict
      );
    }) || [];

  // Debug logging (can be removed in production)
  useEffect(() => {
    if (categoryFilter !== "all") {
      console.log("Category Filter:", categoryFilter);
      console.log("Total Complaints:", complaints?.length || 0);
      console.log("Filtered Complaints:", filteredComplaints.length);
      console.log(
        "Sample complaint categories:",
        complaints?.slice(0, 3).map((c) => c.category)
      );
    }
  }, [categoryFilter, complaints, filteredComplaints]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isMyComplaintsPage && isOfficer
              ? "My Complaints"
              : "Complaints Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isMyComplaintsPage && isOfficer
              ? "View complaints assigned to you"
              : "View and manage all complaints"}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/complaints/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Complaint
        </Button>
      </div>

      {/* Filters */}
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                // Reset category filter when changing status
                setCategoryFilter("all");
                // Navigate to status route if not "all"
                if (value === "all") {
                  navigate("/admin/complaints");
                } else if (value === "in_progress") {
                  navigate("/admin/complaints/in-progress");
                } else {
                  navigate(`/admin/complaints/${value}`);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                // Reset status filter when changing category
                setStatusFilter("all");
                // Navigate to category route if not "all"
                if (value === "all") {
                  // If we're on a category route, go back to base complaints
                  if (location.pathname.includes("/category/")) {
                    navigate("/admin/complaints");
                  }
                } else {
                  navigate(`/admin/complaints/category/${value}`);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="roads">Roads & Infrastructure</SelectItem>
                <SelectItem value="water">Water Supply</SelectItem>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="documents">
                  Documents & Certificates
                </SelectItem>
                <SelectItem value="health">Health Services</SelectItem>
                <SelectItem value="education">Education</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={districtFilter}
              onValueChange={(value) => {
                setDistrictFilter(value);
                // Reset sub-district when district changes
                setSubDistrictFilter("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                <SelectItem value="Budaun">Budaun</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={subDistrictFilter}
              onValueChange={setSubDistrictFilter}
              disabled={
                districtFilter === "all" || availableSubDistricts.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    districtFilter === "all"
                      ? "Select District First"
                      : "Sub-District"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub-Districts</SelectItem>
                {availableSubDistricts.map((subDistrict) => (
                  <SelectItem key={subDistrict} value={subDistrict}>
                    {subDistrict}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <Card className="md:col-span-2">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Loading complaints...</p>
            </CardContent>
          </Card>
        ) : filteredComplaints.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No complaints found</p>
            </CardContent>
          </Card>
        ) : (
          filteredComplaints.map((complaint) => {
            const complaintId = complaint.id || complaint._id;
            return (
              <Card
                key={complaintId}
                className="border-[#011a60] border-2 hover:border-blue-900/60 hover:shadow-[0_4px_12px_rgba(30,58,138,0.15)] transition-all cursor-pointer "
                onClick={() => {
                  console.log(
                    "Navigating to complaint:",
                    complaintId,
                    "Full complaint:",
                    complaint
                  );
                  navigate(`/admin/complaints/${complaintId}`);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {complaint.complaintId && (
                          <Badge
                            variant="outline"
                            className="border-blue-900/40 text-foreground"
                          >
                            {complaint.complaintId}
                          </Badge>
                        )}
                        {getStatusBadge(complaint.status)}
                        {getPriorityBadge(complaint.priority)}
                      </div>
                      <CardTitle className="text-lg text-foreground">
                        {complaint.title}
                      </CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {complaint.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Timeline */}
                  <ComplaintTimeline complaint={complaint} variant="compact" />

                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>Category: {complaint.category}</span>
                    <span>•</span>
                    <span>
                      Submitted:{" "}
                      {(complaint as any).created_at ||
                      complaint.createdAt ||
                      (complaint as any).submittedAt
                        ? new Date(
                            (complaint as any).created_at ||
                              complaint.createdAt ||
                              (complaint as any).submittedAt
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                    {complaint.location && (
                      <>
                        <span>•</span>
                        <span>{complaint.location}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ComplaintsPage;
