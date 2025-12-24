/**
 * Track Page
 * Track complaints by phone number
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Ticket,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  ArrowLeft,
  Search,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { complaintsService } from "@/services/complaints.service";
import { Complaint } from "@/types";

const Track: React.FC = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    // Validate phone number (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      toast.error(
        "Please enter a valid 10-digit phone number starting with 6-9"
      );
      return;
    }

    setLoading(true);
    try {
      const results = await complaintsService.trackByPhone(phoneNumber.trim());
      setComplaints(results);

      if (results.length === 0) {
        toast.info("No complaints found for this phone number");
      } else {
        toast.success(`Found ${results.length} complaint(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to track complaints");
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || "pending";
    switch (normalizedStatus) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || "pending";
    switch (normalizedStatus) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "rejected":
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-4 md:py-6">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header Section with Gradient */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Search className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold mb-1">
                    Track Complaint Status
                  </h1>
                  <p className="text-orange-100 text-xs md:text-sm">
                    Enter your phone number to view the status of your
                    complaints
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-white hover:bg-white/20 hidden md:flex"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <CardContent className="p-4 md:p-6">
            {/* Mobile Back Button */}
            <div className="md:hidden mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-gray-700 hover:bg-orange-100 hover:text-orange-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Search Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                </div>
                <h2 className="text-base font-bold text-gray-800">
                  Track by Phone Number
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10 flex-1"
                      maxLength={10}
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={loading}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-10 px-6 shadow-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter the phone number you used when filing the complaint
                  </p>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {complaints.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">
                    Found {complaints.length} Complaint
                    {complaints.length > 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="space-y-3">
                  {complaints.map((complaint) => (
                    <Card
                      key={complaint._id}
                      className="hover:shadow-md transition-shadow border-gray-200"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <h3 className="text-base font-bold text-gray-900 mb-1">
                                {complaint.title || "Untitled Complaint"}
                              </h3>
                              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {typeof complaint.location === "string"
                                  ? complaint.location ||
                                    "Location not specified"
                                  : complaint.location?.address ||
                                    "Location not specified"}
                              </p>
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                complaint.status || "pending"
                              )} text-xs font-semibold`}
                            >
                              {getStatusLabel(complaint.status || "pending")}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {complaint.description || "No description provided"}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              {complaint.category || "N/A"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {complaint.createdAt
                                ? formatDate(complaint.createdAt)
                                : "N/A"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {complaint.contactName ||
                                complaint.contactPhone ||
                                "N/A"}
                            </span>
                            {complaint.complaint_id && (
                              <span className="flex items-center gap-1.5">
                                <Ticket className="w-3.5 h-3.5" />
                                ID: {complaint.complaint_id}
                              </span>
                            )}
                          </div>
                          {complaint.status === "resolved" && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                Resolved
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Track;
