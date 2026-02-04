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
import {
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
  CheckCircle2,
  FileText,
  UserCheck,
  MessageSquare,
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
        bgColor: "bg-green-50",
        textColor: "text-green-600",
        label: "Low",
      },
      medium: {
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-600",
        label: "Medium",
      },
      high: {
        bgColor: "bg-orange-50",
        textColor: "text-orange-600",
        label: "High",
      },
      urgent: {
        bgColor: "bg-red-50",
        textColor: "text-red-600",
        label: "Urgent",
      },
    };
    const priorityConfig =
      config[priority as keyof typeof config] || config.medium;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.textColor}`}
      >
        <Tag className={`w-3 h-3 ${priorityConfig.textColor}`} />
        {priorityConfig.label}
      </span>
    );
  };

  const calculateProgressSteps = (complaint: any) => {
    const steps = [
      {
        id: 1,
        label: "Complaint",
        icon: CheckCircle2,
        completed: !!(
          complaint.createdAt ||
          (complaint as any).created_at ||
          (complaint as any).submittedAt
        ),
      },
      {
        id: 2,
        label: "Draft",
        icon: FileText,
        completed: !!(
          (complaint as any).drafted_letter || complaint.drafted_letter
        ),
      },
      {
        id: 3,
        label: "Officer",
        icon: UserCheck,
        completed: !!(
          complaint.isOfficerAssigned || (complaint as any).is_officer_assigned
        ),
      },
      {
        id: 4,
        label: "Officer",
        icon: MessageSquare,
        completed: !!(
          (complaint as any).officerRemarks ||
          (complaint as any).officer_remarks ||
          complaint.officerFeedback
        ),
      },
      {
        id: 5,
        label: "Complaint",
        icon: CheckCircle2,
        completed: !!(
          complaint.isComplaintClosed ||
          (complaint as any).is_closed ||
          (complaint as any).closingDetails
        ),
      },
    ];
    const completed = steps.filter((s) => s.completed).length;
    return { steps, completed, total: 5 };
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
        complaints?.slice(0, 3).map((c) => c.category),
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
            const { steps, completed, total } =
              calculateProgressSteps(complaint);
            const progressPercentage = (completed / total) * 100;
            const location =
              complaint.location ||
              (complaint as any).area ||
              (complaint as any).village_name ||
              "";
            const districtName =
              (complaint as any).district_name || complaint.districtName || "";
            const subdistrictName =
              (complaint as any).subdistrict_name ||
              complaint.subdistrictName ||
              "";
            const pincode = (complaint as any).pincode || "";
            const submittedDate =
              (complaint as any).created_at ||
              complaint.createdAt ||
              (complaint as any).submittedAt;

            return (
              <Card
                key={complaintId}
                className="group border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => {
                  navigate(`/admin/complaints/${complaintId}`);
                }}
              >
                <CardHeader className="pb-4 space-y-3">
                  {/* Top Row: Status and Priority */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(complaint.status)}
                      {getPriorityBadge(complaint.priority)}
                    </div>
                    {complaint.complaint_id && (
                      <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                        {complaint.complaint_id}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <CardTitle className="text-base font-semibold text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {complaint.title}
                  </CardTitle>

                  {/* Description */}
                  <CardDescription className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {complaint.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Progress Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Progress
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {completed}/{total} steps
                      </span>
                    </div>
                    {/* Progress Bar with Gradient */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    {/* Step Icons */}
                    <div className="flex items-center justify-between gap-1 mt-2">
                      {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                          <div
                            key={step.id}
                            className="flex flex-col items-center flex-1"
                            title={step.label}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                step.completed
                                  ? "bg-green-500 text-white"
                                  : "bg-slate-200 text-slate-400"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span
                              className={`text-[10px] mt-1 text-center leading-tight ${
                                step.completed
                                  ? "text-slate-900 font-medium"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category and Submission Date */}
                  <div className="flex items-center gap-2 py-2 border-y border-slate-100">
                    <span className="text-xs font-medium text-slate-500">
                      Category: {complaint.category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-medium text-slate-500">
                      Submitted:{" "}
                      {submittedDate
                        ? new Date(submittedDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>

                  {/* Location Information */}
                  {location && (
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="font-medium">
                        {location}
                        {districtName && `, ${districtName}`}
                        {subdistrictName && `, ${subdistrictName}`}
                        {pincode && `, ${pincode}`}
                      </div>
                      {(districtName || subdistrictName || pincode) && (
                        <div className="text-slate-500">
                          {subdistrictName && `Locality: ${subdistrictName}`}
                          {districtName && ` • City: ${districtName}`}
                          {pincode && ` • Pincode: ${pincode}`}
                        </div>
                      )}
                    </div>
                  )}
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
