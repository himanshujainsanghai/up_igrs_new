/**
 * Complaint Detail Panel Component
 * Displays detailed information about a complaint when clicked on the map
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ComplaintDetailPanelProps {
  complaint: any;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

const ComplaintDetailPanel: React.FC<ComplaintDetailPanelProps> = ({
  complaint,
  isOpen,
  onClose,
  loading = false,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Loading Complaint Details...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!complaint) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Complaint Not Found</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Complaint details are not available.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCategoryLabel = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            {complaint.title || "Complaint Details"}
          </DialogTitle>
          {complaint.complaint_id && (
            <p className="text-sm text-muted-foreground">
              Complaint ID: {complaint.complaint_id}
            </p>
          )}
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-4">
          {/* Status and Priority */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={getStatusColor(complaint.status || "pending")}>
              {complaint.status?.replace("_", " ").toUpperCase() || "PENDING"}
            </Badge>
            <Badge className={getPriorityColor(complaint.priority || "medium")}>
              {complaint.priority?.toUpperCase() || "MEDIUM"} Priority
            </Badge>
            {complaint.category && (
              <Badge variant="outline" className="capitalize">
                {getCategoryLabel(complaint.category)}
              </Badge>
            )}
            {complaint.sub_category && (
              <Badge variant="outline" className="capitalize">
                {complaint.sub_category.replace("_", " ")}
              </Badge>
            )}
          </div>

          {/* Description */}
          {complaint.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complaint.village_name && (
                <div>
                  <div className="text-xs text-muted-foreground">Village</div>
                  <div className="text-sm font-semibold">
                    {complaint.village_name}
                  </div>
                </div>
              )}
              {complaint.subdistrict_name && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Sub-District
                  </div>
                  <div className="text-sm font-semibold">
                    {complaint.subdistrict_name}
                  </div>
                </div>
              )}
              {complaint.district_name && (
                <div>
                  <div className="text-xs text-muted-foreground">District</div>
                  <div className="text-sm font-semibold">
                    {complaint.district_name}
                  </div>
                </div>
              )}
              {complaint.location && (
                <div>
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="text-sm">{complaint.location}</div>
                </div>
              )}
              {complaint.latitude && complaint.longitude && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Coordinates
                  </div>
                  <div className="text-xs font-mono">
                    {complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`,
                        "_blank"
                      );
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Google Maps
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          {(complaint.contact_name ||
            complaint.contact_phone ||
            complaint.contact_email) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {complaint.contact_name && (
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="text-sm font-semibold">
                      {complaint.contact_name}
                    </div>
                  </div>
                )}
                {complaint.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="text-sm font-semibold">
                        {complaint.contact_phone}
                      </div>
                    </div>
                  </div>
                )}
                {complaint.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-semibold">
                        {complaint.contact_email}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complaint.created_at && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Created At
                  </div>
                  <div className="text-sm font-semibold">
                    {new Date(complaint.created_at).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
              {complaint.updated_at && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Last Updated
                  </div>
                  <div className="text-sm font-semibold">
                    {new Date(complaint.updated_at).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
              {complaint.estimated_resolution_date && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Estimated Resolution
                  </div>
                  <div className="text-sm font-semibold">
                    {new Date(
                      complaint.estimated_resolution_date
                    ).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              )}
              {complaint.actual_resolution_date && (
                <div>
                  <div className="text-xs text-muted-foreground">
                    Resolved On
                  </div>
                  <div className="text-sm font-semibold">
                    {new Date(
                      complaint.actual_resolution_date
                    ).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution Notes */}
          {complaint.resolution_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolution Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {complaint.resolution_notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Images */}
          {complaint.images && complaint.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attached Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {complaint.images.map((imageUrl: string, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Complaint image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Full Details Button */}
          {complaint.id && (
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={() => {
                  navigate(`/admin/complaints/${complaint.id}`);
                  onClose();
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Details & Manage
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplaintDetailPanel;

