/**
 * My Complaints Page
 * Officer's assigned complaints listing page
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { complaintsService } from "@/services/complaints.service";
import { Complaint } from "@/types";
import {
  Search,
  Eye,
  Loader2,
  AlertCircle,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const MyComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, priorityFilter, categoryFilter, page, searchTerm]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const response = await complaintsService.getMyComplaints({
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        category:
          categoryFilter !== "all" ? (categoryFilter as any) : undefined,
        priority:
          priorityFilter !== "all" ? (priorityFilter as any) : undefined,
        search: searchTerm || undefined,
        page,
        limit,
      });

      // Response is PaginatedResponse<Complaint> with { success, data: Complaint[], meta: { total, page, limit, totalPages } }
      if (response && response.data) {
        setComplaints(response.data);
        setTotal(response.meta?.total || response.data.length);
      } else {
        setComplaints([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error("Error loading complaints:", error);
      toast.error(error.message || "Failed to load complaints");
      setComplaints([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        dotColor: "bg-amber-500",
        label: "Pending",
      },
      "in-progress": {
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        dotColor: "bg-blue-500",
        label: "In Progress",
      },
      in_progress: {
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        dotColor: "bg-blue-500",
        label: "In Progress",
      },
      resolved: {
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        dotColor: "bg-emerald-500",
        label: "Resolved",
      },
      rejected: {
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        dotColor: "bg-red-500",
        label: "Rejected",
      },
    };
    const statusConfig =
      config[status as keyof typeof config] || config.pending;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
        {statusConfig.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: {
        textColor: "text-slate-600",
        label: "Low",
      },
      medium: {
        textColor: "text-amber-600",
        label: "Medium",
      },
      high: {
        textColor: "text-orange-600",
        label: "High",
      },
      urgent: {
        textColor: "text-red-600",
        label: "Urgent",
      },
    };
    const priorityConfig =
      config[priority as keyof typeof config] || config.medium;
    return (
      <span className={`text-xs font-medium ${priorityConfig.textColor}`}>
        {priorityConfig.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    return (
      <span className="text-xs font-medium text-slate-600 capitalize">
        {category}
      </span>
    );
  };

  const calculateRemainingTime = (complaint: Complaint) => {
    // Get arrival time (use this as the base for deadline calculation)
    const arrivalTime =
      (complaint as any).arrivalTime ||
      (complaint as any).arrival_time ||
      complaint.arrivalTime ||
      complaint.createdAt;

    if (!arrivalTime) return null;

    // Get time boundary (default 14 days as mentioned, but check complaint.timeBoundary)
    const timeBoundary = complaint.timeBoundary || 14; // Default 14 days

    // Calculate deadline from arrival date + timeBoundary
    const arrivalDate = new Date(arrivalTime);
    const deadline = new Date(arrivalDate);
    deadline.setDate(deadline.getDate() + timeBoundary);

    // Calculate remaining time
    const now = new Date();
    const remainingMs = deadline.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    return {
      remainingDays,
      deadline,
      arrivalDate,
      timeBoundary,
      isOverdue: remainingDays < 0,
    };
  };

  const handleViewComplaint = (complaintId: string) => {
    navigate(`/officer/complaints/${complaintId}`);
  };

  const totalPages = Math.ceil(total / limit);

  // Calculate statistics
  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    inProgress: complaints.filter(
      (c) => c.status === "in_progress" || (c as any).status === "in-progress",
    ).length,
    overdue: complaints.filter((c) => {
      const rt = calculateRemainingTime(c);
      return rt && rt.isOverdue;
    }).length,
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Professional Header Section */}
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Total Cases
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.pending}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                    In Progress
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.inProgress}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">
                    Overdue
                  </p>
                  <p className="text-2xl font-bold text-red-700">
                    {stats.overdue}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Professional Filters Section */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <CardTitle className="text-base font-semibold text-slate-900">
              Filter & Search
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by title, ID, or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 border-slate-200 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 border-slate-200 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
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
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 border-slate-200 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="All Categories" />
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
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : complaints.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Complaints Found
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                ? "No complaints match your current filters. Try adjusting your search criteria."
                : "You don't have any assigned complaints at this time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Assigned Cases
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {total} {total === 1 ? "case" : "cases"} found
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {complaints.map((complaint) => {
              const complaintId = complaint.id || complaint._id;
              const remainingTime = calculateRemainingTime(complaint);
              const arrivalTime =
                (complaint as any).arrivalTime ||
                (complaint as any).arrival_time ||
                complaint.arrivalTime ||
                complaint.createdAt;
              const assignedTime =
                (complaint as any).assignedTime ||
                (complaint as any).assigned_time ||
                complaint.assignedTime ||
                arrivalTime;

              return (
                <Card
                  key={complaintId}
                  className="group border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer overflow-hidden"
                  onClick={() => handleViewComplaint(complaintId || "")}
                >
                  <CardHeader className="pb-4 space-y-3">
                    {/* Top Row: ID and Status */}
                    <div className="flex items-start justify-between">
                      {complaint.complaint_id && (
                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                          {complaint.complaint_id}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        {getStatusBadge(complaint.status)}
                        {getPriorityBadge(complaint.priority)}
                      </div>
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
                          Case Progress
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          {(() => {
                            const steps = [
                              complaint.createdAt ? 1 : 0,
                              (complaint as any).drafted_letter ||
                              complaint.drafted_letter
                                ? 1
                                : 0,
                              complaint.isOfficerAssigned ||
                              (complaint as any).is_officer_assigned
                                ? 1
                                : 0,
                              (complaint as any).officerRemarks ||
                              (complaint as any).officer_remarks ||
                              complaint.officerFeedback
                                ? 1
                                : 0,
                              complaint.isComplaintClosed ||
                              (complaint as any).is_closed ||
                              (complaint as any).closingDetails
                                ? 1
                                : 0,
                            ];
                            const completed = steps.reduce((a, b) => a + b, 0);
                            return `${completed}/5`;
                          })()}{" "}
                          Steps Completed
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500 rounded-full transition-all duration-700"
                          style={{
                            width: `${(() => {
                              const steps = [
                                complaint.createdAt ? 1 : 0,
                                (complaint as any).drafted_letter ||
                                complaint.drafted_letter
                                  ? 1
                                  : 0,
                                complaint.isOfficerAssigned ||
                                (complaint as any).is_officer_assigned
                                  ? 1
                                  : 0,
                                (complaint as any).officerRemarks ||
                                (complaint as any).officer_remarks ||
                                complaint.officerFeedback
                                  ? 1
                                  : 0,
                                complaint.isComplaintClosed ||
                                (complaint as any).is_closed ||
                                (complaint as any).closingDetails
                                  ? 1
                                  : 0,
                              ];
                              const completed = steps.reduce(
                                (a, b) => a + b,
                                0,
                              );
                              return (completed / 5) * 100;
                            })()}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-2 py-2 border-y border-slate-100">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Category
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-semibold text-slate-700 capitalize">
                        {complaint.category}
                      </span>
                    </div>

                    {/* Timeline Information */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          Arrived
                        </span>
                        <span className="text-slate-900 font-semibold">
                          {arrivalTime
                            ? new Date(arrivalTime).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "N/A"}
                        </span>
                      </div>
                      {assignedTime && assignedTime !== arrivalTime && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            Assigned
                          </span>
                          <span className="text-slate-900 font-semibold">
                            {new Date(assignedTime).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      )}
                      {/* Deadline Date */}
                      {remainingTime && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            Deadline
                          </span>
                          <span
                            className={`font-semibold ${
                              remainingTime.isOverdue
                                ? "text-red-600"
                                : remainingTime.remainingDays <= 3
                                  ? "text-orange-600"
                                  : "text-slate-900"
                            }`}
                          >
                            {remainingTime.deadline.toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                            {remainingTime.isOverdue && (
                              <span className="ml-1.5 text-red-500">⚠</span>
                            )}
                          </span>
                        </div>
                      )}
                      {remainingTime && (
                        <div
                          className={`flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100 ${
                            remainingTime.isOverdue
                              ? "text-red-600"
                              : remainingTime.remainingDays <= 3
                                ? "text-orange-600"
                                : "text-slate-700"
                          }`}
                        >
                          <span>
                            {remainingTime.isOverdue
                              ? "Overdue by"
                              : "Time remaining"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {Math.abs(remainingTime.remainingDays)}{" "}
                            {Math.abs(remainingTime.remainingDays) === 1
                              ? "day"
                              : "days"}
                            {remainingTime.isOverdue && (
                              <span className="text-red-500">⚠</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewComplaint(complaintId || "");
                        }}
                        className="w-full text-xs font-medium border-slate-200 hover:border-primary hover:bg-primary hover:text-white transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 mr-2" />
                        View Case Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Professional Pagination */}
          {totalPages > 1 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-600">
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {(page - 1) * limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-900">
                      {Math.min(page * limit, total)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {total}
                    </span>{" "}
                    cases
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-slate-200 hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-600 px-3">
                      Page{" "}
                      <span className="font-semibold text-slate-900">
                        {page}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-900">
                        {totalPages}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="border-slate-200 hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MyComplaintsPage;
