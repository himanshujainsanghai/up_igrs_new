/**
 * Officer Complaint Detail Page
 * Comprehensive complaint view for officers with improved UI
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  Tag,
  Globe,
  MessageSquare,
  Settings,
  AlertTriangle,
  StickyNote,
  Upload,
  X,
  Download,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { complaintsService } from "@/services/complaints.service";
import {
  Complaint,
  OfficerNote,
  OfficerAttachment,
  ComplaintExtensionRequest,
} from "@/types";
import { toast } from "sonner";
import { uploadService } from "@/services/upload.service";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OfficerComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionDays, setExtensionDays] = useState<number>(7);
  const [closingRemarks, setClosingRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState<OfficerNote[]>([]);
  const [attachments, setAttachments] = useState<OfficerAttachment[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<
    ComplaintExtensionRequest[]
  >([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"inward" | "outward">("inward");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<"inward" | "outward">(
    "inward",
  );
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadComplaint();
    }
  }, [id]);

  const loadComplaint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await complaintsService.getOfficerComplaintDetail(id);
      setComplaint(data.complaint);
      setNotes(data.officerNotes || []);
      setAttachments(data.officerAttachments || []);
      setExtensionRequests(data.extensionRequests || []);
    } catch (error: any) {
      console.error("Error loading complaint:", error);
      toast.error(error.message || "Failed to load complaint");
      navigate("/officer");
    } finally {
      setLoading(false);
    }
  };

  const closingDetails: any =
    complaint &&
    ((complaint as any).closingDetails ||
      (complaint as any).closing_details ||
      (complaint as Complaint).closingDetails);
  const isComplaintClosed =
    (complaint as any)?.isComplaintClosed ??
    (complaint as any)?.is_closed ??
    (complaint as any)?.isClosed ??
    (closingDetails?.closedAt ? true : false);
  const closingAttachments =
    (closingDetails?.attachments as any[] | undefined) || [];
  const closedAt =
    closingDetails?.closedAt || (closingDetails as any)?.closed_at || undefined;
  const closingRemarksValue = closingDetails?.remarks;

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
        className="flex items-center gap-1 bg-transparent border-0 text-foreground text-white"
      >
        <Tag className={`w-3 h-3 ${priorityConfig.iconColor}`} />
        {priorityConfig.label}
      </Badge>
    );
  };

  const handleRequestExtension = async () => {
    if (!id || !extensionReason.trim() || !extensionDays) {
      toast.error("Please provide days and a reason for extension");
      return;
    }

    try {
      setActionLoading(true);
      await complaintsService.requestExtension(id, {
        days: extensionDays,
        reason: extensionReason.trim(),
      });
      toast.success("Extension request submitted");
      setShowExtensionDialog(false);
      setExtensionReason("");
      setExtensionDays(7);
      await loadComplaint();
    } catch (error: any) {
      console.error("Error requesting extension:", error);
      toast.error(error.message || "Failed to request extension");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseComplaint = async () => {
    if (!id || !closingRemarks.trim()) {
      toast.error("Please provide closing remarks");
      return;
    }

    try {
      setActionLoading(true);
      await complaintsService.closeComplaint(id, {
        remarks: closingRemarks.trim(),
      });
      toast.success("Complaint closed successfully");
      setShowCloseDialog(false);
      setClosingRemarks("");
      await loadComplaint();
    } catch (error: any) {
      console.error("Error closing complaint:", error);
      toast.error(error.message || "Failed to close complaint");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      setIsAddingNote(true);
      await complaintsService.addOfficerNote({
        complaintId: id,
        note: newNote.trim(),
        type: noteType,
      });
      toast.success("Note added successfully");
      setNewNote("");
      setNoteType("inward");
      await loadComplaint();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error(error.message || "Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleUploadFile = async () => {
    if (!id || !selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      setIsUploadingFile(true);

      // Upload file to S3
      const isImage = selectedFile.type.startsWith("image/");
      const uploadResult = isImage
        ? await uploadService.uploadImage(selectedFile)
        : await uploadService.uploadDocument(selectedFile);

      // Add officer attachment record with S3 URL
      await complaintsService.addOfficerAttachment({
        complaintId: id,
        attachmentType: documentType,
        fileUrl: uploadResult.url,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

      toast.success("File uploaded successfully");
      setSelectedFile(null);
      setFilePreview(null);
      setDocumentType("inward");
      // Reset file input
      const fileInput = document.getElementById(
        "file-upload-input",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadComplaint();
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const isImageFile = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const handleViewDocument = async (fileUrl: string) => {
    if (!fileUrl) return;
    try {
      const viewUrl = await uploadService.getPresignedViewUrl(fileUrl);
      window.open(viewUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error.message || "Failed to open document");
    }
  };

  const parseDateValue = (value?: string | Date | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatTimelineDate = (date: Date) => {
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const buildOfficerTimeline = () => {
    if (!complaint) return [];

    const events: Array<{
      id: string;
      title: string;
      date: Date;
      description?: string;
      badge?: { text: string; className: string };
      icon: React.ReactNode;
      iconBg: string;
    }> = [];

    const createdAt = parseDateValue(
      (complaint as any).created_at || complaint.createdAt,
    );
    const arrivalTime = parseDateValue(
      (complaint as any).arrivalTime ||
        (complaint as any).arrival_time ||
        complaint.arrivalTime,
    );
    const assignedTime = parseDateValue(
      (complaint as any).assignedTime ||
        (complaint as any).assigned_time ||
        complaint.assignedTime,
    );
    const timeBoundary = complaint.timeBoundary || 7;
    const deadlineBase = arrivalTime || assignedTime || createdAt;

    if (createdAt) {
      events.push({
        id: "created",
        title: "Complaint submitted",
        date: createdAt,
        icon: <FileText className="w-4 h-4 text-[#011a60]" />,
        iconBg: "bg-[#011a60]/10",
      });
    }

    if (assignedTime) {
      events.push({
        id: "assigned",
        title: "Assigned to officer",
        date: assignedTime,
        icon: <User className="w-4 h-4 text-indigo-700" />,
        iconBg: "bg-indigo-100",
      });
    }

    if (arrivalTime) {
      events.push({
        id: "arrival",
        title: "Arrived to officer",
        date: arrivalTime,
        icon: <Clock className="w-4 h-4 text-blue-700" />,
        iconBg: "bg-blue-100",
      });
    }

    if (deadlineBase) {
      const deadline = new Date(deadlineBase);
      deadline.setDate(deadline.getDate() + timeBoundary);
      events.push({
        id: "deadline",
        title: `Deadline (${timeBoundary} days)`,
        date: deadline,
        description: "Time boundary completion date",
        badge: {
          text: "Deadline",
          className: "bg-slate-100 text-slate-700",
        },
        icon: <Calendar className="w-4 h-4 text-slate-700" />,
        iconBg: "bg-slate-100",
      });

      const compareDate = parseDateValue(closedAt) || new Date();
      if (compareDate.getTime() > deadline.getTime()) {
        const overdueDays = Math.ceil(
          (compareDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24),
        );
        events.push({
          id: "overdue",
          title: "Overdue",
          date: compareDate,
          description: `${overdueDays} ${
            overdueDays === 1 ? "day" : "days"
          } past deadline`,
          badge: {
            text: "Overdue",
            className: "bg-red-100 text-red-700",
          },
          icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
          iconBg: "bg-red-100",
        });
      } else if (!isComplaintClosed) {
        const remainingDays = Math.ceil(
          (deadline.getTime() - compareDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        events.push({
          id: "remaining",
          title: "Time remaining",
          date: compareDate,
          description: `${remainingDays} ${
            remainingDays === 1 ? "day" : "days"
          } remaining until deadline`,
          badge: {
            text: "On track",
            className: "bg-emerald-100 text-emerald-700",
          },
          icon: <CheckCircle className="w-4 h-4 text-emerald-700" />,
          iconBg: "bg-emerald-100",
        });
      }
    }

    notes.forEach((note) => {
      const noteDate = parseDateValue(note.createdAt);
      if (!noteDate) return;
      const isInward = note.type === "inward";
      events.push({
        id: `note-${note._id}`,
        title: isInward ? "Inward note added" : "Outward note added",
        date: noteDate,
        description: note.content,
        badge: {
          text: isInward ? "Inward" : "Outward",
          className: isInward
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700",
        },
        icon: isInward ? (
          <ArrowDownCircle className="w-4 h-4 text-blue-600" />
        ) : (
          <ArrowUpCircle className="w-4 h-4 text-green-600" />
        ),
        iconBg: isInward ? "bg-blue-100" : "bg-green-100",
      });
    });

    attachments.forEach((doc) => {
      const attachmentDate = parseDateValue(doc.createdAt);
      if (!attachmentDate) return;
      const isInward = doc.attachmentType === "inward";
      events.push({
        id: `attachment-${doc._id}`,
        title: isInward
          ? "Inward document uploaded"
          : "Outward document uploaded",
        date: attachmentDate,
        description: doc.fileName,
        badge: {
          text: isInward ? "Inward" : "Outward",
          className: isInward
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700",
        },
        icon: <Upload className="w-4 h-4 text-[#011a60]" />,
        iconBg: "bg-[#011a60]/10",
      });
    });

    extensionRequests.forEach((request) => {
      const requestedAt = parseDateValue(request.createdAt);
      if (requestedAt) {
        events.push({
          id: `extension-request-${request._id}`,
          title: "Extension requested",
          date: requestedAt,
          description: `${request.daysRequested} ${
            request.daysRequested === 1 ? "day" : "days"
          } requested${request.reason ? ` • ${request.reason}` : ""}`,
          badge: {
            text: request.status === "pending" ? "Pending" : "Requested",
            className:
              request.status === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-orange-100 text-orange-700",
          },
          icon: <Clock className="w-4 h-4 text-orange-600" />,
          iconBg: "bg-orange-100",
        });
      }

      const decidedAt = parseDateValue(request.decidedAt);
      if (decidedAt && request.status !== "pending") {
        const isApproved = request.status === "approved";
        events.push({
          id: `extension-${request._id}-${request.status}`,
          title: isApproved ? "Extension approved" : "Extension rejected",
          date: decidedAt,
          description: request.notes,
          badge: {
            text: isApproved ? "Approved" : "Rejected",
            className: isApproved
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700",
          },
          icon: isApproved ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          ),
          iconBg: isApproved ? "bg-emerald-100" : "bg-red-100",
        });
      }
    });

    closingAttachments.forEach((attachment, index) => {
      const uploadedAt = parseDateValue(
        attachment.uploadedAt || (attachment as any).uploaded_at || closedAt,
      );
      if (!uploadedAt) return;
      events.push({
        id: `closing-attachment-${index}`,
        title: "Closing document uploaded",
        date: uploadedAt,
        description:
          attachment.fileName ||
          (attachment as any).file_name ||
          `Attachment ${index + 1}`,
        badge: {
          text: "Closing proof",
          className: "bg-slate-100 text-slate-700",
        },
        icon: <Upload className="w-4 h-4 text-[#011a60]" />,
        iconBg: "bg-[#011a60]/10",
      });
    });

    const closedAtDate = parseDateValue(closedAt);
    if (closedAtDate) {
      events.push({
        id: "closed",
        title: "Complaint closed",
        date: closedAtDate,
        description: closingRemarksValue,
        badge: {
          text: "Closed",
          className: "bg-emerald-100 text-emerald-700",
        },
        icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
        iconBg: "bg-emerald-100",
      });
    }

    return events
      .filter((event) => event.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const timelineEvents = buildOfficerTimeline();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Complaint not found</p>
        <Button onClick={() => navigate("/officer")} className="mt-4">
          Back to My Complaints
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-[#011a60]/30 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#011a60] via-[#023a9f] to-[#011a60] text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/officer")}
                className="text-white hover:bg-white/20 mt-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-3">
                  {complaint.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap text-white">
                  {/* <Badge
                    variant="outline"
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  >
                    <span className="text-xs font-mono">
                      {complaint.id || complaint._id || "N/A"}
                    </span>
                  </Badge> */}
                  {getStatusBadge(complaint.status)}
                  {getPriorityBadge(complaint.priority)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content with Tabs */}
      <Card className="border-[#011a60]/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Complaint Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Complaint Details
              </TabsTrigger>
              <TabsTrigger
                value="mlc-message"
                className="data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
                disabled={!(complaint as any).drafted_letter}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                MLC's Message
              </TabsTrigger>
              <TabsTrigger
                value="notes-proofs"
                className="data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
              >
                <StickyNote className="w-4 h-4 mr-2" />
                Notes & Proofs
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Actions
              </TabsTrigger>
            </TabsList>

            {/* Complaint Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-0">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <p className="text-foreground mt-1 leading-relaxed">
                      {complaint.description}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Category
                    </Label>
                    <p className="text-foreground mt-1 capitalize">
                      {complaint.category}
                      {complaint.subCategory && ` - ${complaint.subCategory}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Contact Name
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).contact_name || complaint.contactName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Phone
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).contact_phone ||
                        complaint.contactPhone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Email
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).contact_email ||
                        complaint.contactEmail ||
                        "N/A"}
                    </p>
                  </div>
                  {(complaint as any).voterId && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Voter ID
                      </Label>
                      <p className="text-foreground mt-1">
                        {(complaint as any).voterId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Geographic Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Geographic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  {(complaint as any).village_name && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Village
                      </Label>
                      <p className="text-foreground mt-1">
                        {(complaint as any).village_name}
                      </p>
                    </div>
                  )}
                  {(complaint as any).subdistrict_name && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Sub-District
                      </Label>
                      <p className="text-foreground mt-1">
                        {(complaint as any).subdistrict_name}
                      </p>
                    </div>
                  )}
                  {(complaint as any).district_name && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        District
                      </Label>
                      <p className="text-foreground mt-1">
                        {(complaint as any).district_name}
                      </p>
                    </div>
                  )}
                  {complaint.latitude && complaint.longitude && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Coordinates
                      </Label>
                      <p className="text-foreground mt-1 text-xs">
                        {complaint.latitude.toFixed(6)},{" "}
                        {complaint.longitude.toFixed(6)}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        View on Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
                {typeof complaint.location === "string" && (
                  <div className="text-sm">
                    <Label className="text-xs text-muted-foreground">
                      Location
                    </Label>
                    <p className="text-foreground mt-1">{complaint.location}</p>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Timestamps
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Created At
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).created_at || complaint.createdAt
                        ? new Date(
                            (complaint as any).created_at ||
                              complaint.createdAt,
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  {(complaint as any).updated_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Updated At
                      </Label>
                      <p className="text-foreground mt-1">
                        {new Date(
                          (complaint as any).updated_at,
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {(complaint as any).arrivalTime && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Arrival Time
                      </Label>
                      <p className="text-foreground mt-1">
                        {new Date(
                          (complaint as any).arrivalTime,
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {(complaint as any).assignedTime && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Assigned Time
                      </Label>
                      <p className="text-foreground mt-1">
                        {new Date(
                          (complaint as any).assignedTime,
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Officer Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Officer Timeline
                </h3>
                {timelineEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No timeline events available yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timelineEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-lg border border-[#011a60]/10 bg-white p-3"
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${event.iconBg}`}
                        >
                          {event.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {event.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimelineDate(event.date)}
                            </span>
                          </div>
                          {event.badge && (
                            <Badge
                              className={`mt-1 border-0 text-xs ${event.badge.className}`}
                            >
                              {event.badge.text}
                            </Badge>
                          )}
                          {event.description && (
                            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Assignment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {/* <div>
                <Label className="text-xs text-muted-foreground">
                  Officer Assigned
                </Label>
                <p className="text-foreground mt-1">
                  {(complaint as any).isOfficerAssigned ? "Yes" : "No"}
                </p>
              </div> */}
                  {/* {(complaint as any).assignedOfficer && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Assigned Officer ID
                  </Label>
                  <p className="text-foreground mt-1 text-xs font-mono">
                    {typeof (complaint as any).assignedOfficer === "string"
                      ? (complaint as any).assignedOfficer
                      : (complaint as any).assignedOfficer?.name || "N/A"}
                  </p>
                </div>
              )} */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <p className="text-foreground mt-1">
                      {isComplaintClosed ? "Closed" : "Open"}
                      {(complaint as any).isExtended && " (Extended)"}
                    </p>
                  </div>
                  {complaint.timeBoundary && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Time Boundary
                      </Label>
                      <p className="text-foreground mt-1">
                        {complaint.timeBoundary} days
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              {(complaint as any).images &&
                Array.isArray((complaint as any).images) &&
                (complaint as any).images.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                      Images ({(complaint as any).images.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(complaint as any).images.map(
                        (imageUrl: string, index: number) => (
                          <a
                            key={index}
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square border border-[#011a60]/30 rounded-lg overflow-hidden hover:border-[#011a60]/60 transition-all"
                          >
                            <img
                              src={imageUrl}
                              alt={`Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Documents */}
              {complaint.documents && complaint.documents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                    Documents ({complaint.documents.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {complaint.documents.map((doc, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleViewDocument(doc.fileUrl)}
                        className="flex items-center gap-3 p-3 border border-[#011a60]/30 rounded-lg hover:border-[#011a60]/60 transition-all w-full text-left"
                      >
                        <FileText className="w-5 h-5 text-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.fileName || `Document ${index + 1}`}
                          </p>
                          {doc.fileType && (
                            <p className="text-xs text-muted-foreground">
                              {doc.fileType}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing Attachments */}
              {closingAttachments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                    Closing Attachments ({closingAttachments.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {closingAttachments.map(
                      (attachment: any, index: number) => {
                        const url = attachment.url || attachment.fileUrl;
                        const fileName =
                          attachment.fileName ||
                          attachment.file_name ||
                          `Attachment ${index + 1}`;
                        const fileType =
                          attachment.fileType || attachment.file_type || "";
                        const uploadedBy =
                          attachment.uploadedBy || attachment.uploaded_by;
                        const uploadedAt =
                          attachment.uploadedAt || attachment.uploaded_at;

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleViewDocument(url)}
                            className="flex items-center gap-3 p-3 border border-[#011a60]/30 rounded-lg hover:border-[#011a60]/60 transition-all w-full text-left"
                          >
                            <FileText className="w-5 h-5 text-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {fileName}
                              </p>
                              {(fileType || uploadedBy || uploadedAt) && (
                                <p className="text-xs text-muted-foreground">
                                  {[fileType, uploadedBy]
                                    .filter(Boolean)
                                    .join(" • ")}
                                  {uploadedAt
                                    ? ` • ${new Date(
                                        uploadedAt,
                                      ).toLocaleString()}`
                                    : ""}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* MLC's Message Tab */}
            <TabsContent value="mlc-message" className="mt-0">
              {(complaint as any).drafted_letter ? (
                <div className="space-y-6">
                  {/* Formal Letter Display */}
                  <div className="bg-white border-2 border-[#011a60]/30 rounded-lg shadow-lg overflow-hidden">
                    {/* Letter Paper Effect */}
                    <div className="bg-gradient-to-br from-amber-50/30 via-white to-amber-50/30 p-8 md:p-12 lg:p-16">
                      <div className="max-w-4xl mx-auto space-y-8">
                        {/* From Section - Right Aligned */}
                        <div className="text-right border-b border-[#011a60]/10 pb-4">
                          <p className="text-base md:text-lg font-bold text-[#011a60] tracking-wide">
                            {(complaint as any).drafted_letter.from}
                          </p>
                        </div>

                        {/* Date - Right Aligned */}
                        <div className="text-right">
                          <p className="text-sm md:text-base text-gray-700 font-medium">
                            दिनांक:{" "}
                            <span className="text-[#011a60]">
                              {new Date(
                                (complaint as any).drafted_letter.date,
                              ).toLocaleDateString("hi-IN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </p>
                        </div>

                        {/* To Section - Left Aligned */}
                        <div className="mt-10 border-l-4 border-[#011a60]/30 pl-4">
                          <div className="whitespace-pre-line text-sm md:text-base text-gray-800 leading-relaxed font-medium">
                            {(complaint as any).drafted_letter.to}
                          </div>
                        </div>

                        {/* Subject - Left Aligned with underline effect */}
                        <div className="mt-8 pt-4 border-t border-[#011a60]/10">
                          <p className="text-sm md:text-base font-bold text-[#011a60] leading-relaxed">
                            {(complaint as any).drafted_letter.subject}
                          </p>
                        </div>

                        {/* Body - Justified text for formal look */}
                        <div className="mt-8">
                          <div className="whitespace-pre-line text-sm md:text-base text-gray-800 leading-relaxed text-justify font-normal">
                            {(complaint as any).drafted_letter.body}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  {(complaint as any).drafted_letter.attachments &&
                  Array.isArray(
                    (complaint as any).drafted_letter.attachments,
                  ) &&
                  (complaint as any).drafted_letter.attachments.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                        Attachments (
                        {(complaint as any).drafted_letter.attachments.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(complaint as any).drafted_letter.attachments.map(
                          (attachment: string, index: number) => (
                            <a
                              key={index}
                              href={attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 border border-[#011a60]/30 rounded-lg hover:border-[#011a60]/60 transition-all"
                            >
                              <FileText className="w-5 h-5 text-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  Attachment {index + 1}
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No drafted letter available
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Notes and Proofs Tab */}
            <TabsContent value="notes-proofs" className="mt-0">
              <div className="space-y-6">
                {/* Add Note Section */}
                <Card className="border-[#011a60]/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-[#011a60]" />
                      Add Note
                    </CardTitle>
                    <CardDescription>
                      Add a note to track your progress or observations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Note Type</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="noteType"
                            value="inward"
                            checked={noteType === "inward"}
                            onChange={(e) =>
                              setNoteType(
                                e.target.value as "inward" | "outward",
                              )
                            }
                            className="w-4 h-4 text-[#011a60]"
                          />
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">Inward</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="noteType"
                            value="outward"
                            checked={noteType === "outward"}
                            onChange={(e) =>
                              setNoteType(
                                e.target.value as "inward" | "outward",
                              )
                            }
                            className="w-4 h-4 text-[#011a60]"
                          />
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">Outward</span>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-note">Note Content</Label>
                      <Textarea
                        id="new-note"
                        placeholder="Enter your note here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={4}
                        className="resize-none"
                        maxLength={2000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {newNote.length}/2000 characters
                      </p>
                    </div>
                    <Button
                      onClick={handleAddNote}
                      disabled={isAddingNote || !newNote.trim()}
                      className="bg-[#011a60] hover:bg-[#023a9f]"
                    >
                      {isAddingNote ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <StickyNote className="w-4 h-4 mr-2" />
                          Add Note
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Notes List */}
                <Card className="border-[#011a60]/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-[#011a60]" />
                      Notes ({notes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No notes added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {notes.map((note) => (
                          <div
                            key={note._id}
                            className="border border-[#011a60]/20 rounded-lg p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />

                                <Badge
                                  variant="outline"
                                  className={
                                    note.type === "inward"
                                      ? "border-blue-500 text-blue-700 bg-blue-50"
                                      : "border-green-500 text-green-700 bg-green-50"
                                  }
                                >
                                  {note.type === "inward" ? (
                                    <>
                                      <ArrowDownCircle className="w-3 h-3 mr-1" />
                                      Inward
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpCircle className="w-3 h-3 mr-1" />
                                      Outward
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {note.content}
                            </p>
                            {note.attachments &&
                              note.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Attachments ({note.attachments.length})
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {note.attachments.map((url, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleViewDocument(url)}
                                        className="flex items-center gap-2 p-2 border border-[#011a60]/20 rounded hover:border-[#011a60]/40 transition-colors text-sm w-full text-left"
                                      >
                                        <FileText className="w-4 h-4 text-foreground" />
                                        <span className="truncate">
                                          Attachment {idx + 1}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upload File Section */}
                <Card className="border-[#011a60]/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Upload className="w-5 h-5 text-[#011a60]" />
                      Upload Document/Image
                    </CardTitle>
                    <CardDescription>
                      Upload images or documents as proof of your actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Document Type Selection */}
                    <div className="space-y-2">
                      <Label>Document Type</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="documentType"
                            value="inward"
                            checked={documentType === "inward"}
                            onChange={(e) =>
                              setDocumentType(
                                e.target.value as "inward" | "outward",
                              )
                            }
                            className="w-4 h-4 text-[#011a60]"
                          />
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">Inward</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="documentType"
                            value="outward"
                            checked={documentType === "outward"}
                            onChange={(e) =>
                              setDocumentType(
                                e.target.value as "inward" | "outward",
                              )
                            }
                            className="w-4 h-4 text-[#011a60]"
                          />
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">Outward</span>
                          </div>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inward: Documents received | Outward: Documents sent
                      </p>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="file-upload-input">Select File</Label>
                      <div className="border-2 border-dashed border-[#011a60]/30 rounded-lg p-6 hover:border-[#011a60]/50 transition-colors">
                        <input
                          id="file-upload-input"
                          type="file"
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload-input"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          {filePreview ? (
                            <div className="space-y-2">
                              <img
                                src={filePreview}
                                alt="Preview"
                                className="max-h-48 rounded-lg border border-[#011a60]/20"
                              />
                              <p className="text-sm text-muted-foreground">
                                {selectedFile?.name}
                              </p>
                            </div>
                          ) : selectedFile ? (
                            <div className="space-y-2 text-center">
                              <FileText className="w-12 h-12 mx-auto text-[#011a60]/50" />
                              <p className="text-sm font-medium text-foreground">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center space-y-2">
                              <Upload className="w-12 h-12 mx-auto text-[#011a60]/50" />
                              <p className="text-sm font-medium text-foreground">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Images, PDF, DOC, DOCX, XLS, XLSX, TXT (Max
                                10MB)
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                      {selectedFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setFilePreview(null);
                            const fileInput = document.getElementById(
                              "file-upload-input",
                            ) as HTMLInputElement;
                            if (fileInput) fileInput.value = "";
                          }}
                          className="w-full"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove File
                        </Button>
                      )}
                    </div>

                    <Button
                      onClick={handleUploadFile}
                      disabled={isUploadingFile || !selectedFile}
                      className="w-full bg-[#011a60] hover:bg-[#023a9f]"
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload File
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Documents List */}
                <Card className="border-[#011a60]/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#011a60]" />
                      Uploaded Documents ({attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attachments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attachments.map((doc) => (
                          <div
                            key={doc._id}
                            className="border border-[#011a60]/20 rounded-lg p-4 hover:border-[#011a60]/40 transition-colors bg-white"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isImageFile(doc.fileUrl) ? (
                                  <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <FileText className="w-5 h-5 text-[#011a60] flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {doc.fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={
                                  doc.attachmentType === "inward"
                                    ? "border-blue-500 text-blue-700 bg-blue-50"
                                    : "border-green-500 text-green-700 bg-green-50"
                                }
                              >
                                {doc.attachmentType === "inward" ? (
                                  <>
                                    <ArrowDownCircle className="w-3 h-3 mr-1" />
                                    Inward
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpCircle className="w-3 h-3 mr-1" />
                                    Outward
                                  </>
                                )}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 p-0 hover:bg-[#011a60]/10"
                                  title="View"
                                  onClick={() =>
                                    handleViewDocument(doc.fileUrl)
                                  }
                                >
                                  <ExternalLink className="w-4 h-4 text-[#011a60]" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 p-0 hover:bg-[#011a60]/10"
                                  title="Download"
                                  onClick={async () => {
                                    try {
                                      const viewUrl =
                                        await uploadService.getPresignedViewUrl(
                                          doc.fileUrl,
                                        );
                                      const a = document.createElement("a");
                                      a.href = viewUrl;
                                      a.download = doc.fileName || "download";
                                      a.target = "_blank";
                                      a.rel = "noopener noreferrer";
                                      a.click();
                                    } catch (e: any) {
                                      toast.error(
                                        e.message || "Failed to download",
                                      );
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4 text-[#011a60]" />
                                </Button>
                              </div>
                            </div>
                            {isImageFile(doc.fileUrl) && (
                              <div
                                className="mt-3 rounded-lg overflow-hidden border border-[#011a60]/20 cursor-pointer flex items-center justify-center h-32 bg-[#011a60]/5"
                                onClick={() => handleViewDocument(doc.fileUrl)}
                                title="Click to view image"
                              >
                                <span className="text-xs text-muted-foreground">
                                  Click to view image
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Uploaded{" "}
                              {new Date(doc.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-0">
              <div className="space-y-6">
                {/* Status Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-[#011a60]/20 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#011a60]/10 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-[#011a60]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#011a60] mb-2">
                        Complaint Status
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium text-foreground">
                            {isComplaintClosed ? "Closed" : "Open"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Time Boundary:
                          </span>
                          <span className="font-medium text-foreground">
                            {complaint.timeBoundary || 7} days
                          </span>
                        </div>
                        {(complaint as any).isExtended && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Extension:
                            </span>
                            <Badge className="bg-orange-500 text-white">
                              Extended
                            </Badge>
                          </div>
                        )}
                        {isComplaintClosed && (
                          <>
                            {closedAt && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Closed At:
                                </span>
                                <span className="font-medium text-foreground">
                                  {new Date(closedAt).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {closingRemarksValue && (
                              <div className="mt-2">
                                <span className="text-muted-foreground block mb-1">
                                  Closing Remarks:
                                </span>
                                <p className="text-foreground text-sm leading-relaxed">
                                  {closingRemarksValue}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extension Requests History */}
                {extensionRequests.length > 0 && (
                  <Card className="border-[#011a60]/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#011a60]" />
                        Extension Requests ({extensionRequests.length})
                      </CardTitle>
                      <CardDescription>
                        History of all extension requests for this complaint
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {extensionRequests
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime(),
                          )
                          .map((request) => (
                            <div
                              key={request._id}
                              className="border border-[#011a60]/20 rounded-lg p-4 bg-gradient-to-r from-orange-50/50 to-amber-50/50"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    className={
                                      request.status === "pending"
                                        ? "bg-yellow-500 text-white"
                                        : request.status === "approved"
                                          ? "bg-green-500 text-white"
                                          : "bg-red-500 text-white"
                                    }
                                  >
                                    {request.status === "pending"
                                      ? "Pending"
                                      : request.status === "approved"
                                        ? "Approved"
                                        : "Rejected"}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {request.daysRequested} day
                                    {request.daysRequested !== 1
                                      ? "s"
                                      : ""}{" "}
                                    requested
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleString()}
                                </span>
                              </div>
                              {request.reason && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-foreground mb-1">
                                    Reason:
                                  </p>
                                  <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {request.reason}
                                  </p>
                                </div>
                              )}
                              {request.status !== "pending" && (
                                <div className="mt-3 pt-3 border-t border-[#011a60]/10">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                      {request.status === "approved"
                                        ? "Approved"
                                        : "Rejected"}{" "}
                                      {request.decidedAt &&
                                        `on ${new Date(
                                          request.decidedAt,
                                        ).toLocaleDateString()}`}
                                    </span>
                                    {request.notes && (
                                      <span className="text-foreground">
                                        {request.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Request Extension Card */}
                  <Card className="border-2 border-orange-200 hover:border-orange-300 transition-colors">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Request Term Extension
                          </CardTitle>
                          <CardDescription>
                            Request additional time to act on this complaint
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        If you need more time to resolve this complaint, you can
                        request an extension. Please provide a valid reason for
                        the extension request.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Extension requests are subject to approval</span>
                      </div>
                      <Button
                        onClick={() => setShowExtensionDialog(true)}
                        disabled={
                          isComplaintClosed ||
                          actionLoading ||
                          (complaint as any).isExtended
                        }
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        variant="default"
                      >
                        {(complaint as any).isExtended ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Already Extended
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 mr-2" />
                            Request Extension
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Close Complaint Card */}
                  <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Close Complaint
                          </CardTitle>
                          <CardDescription>
                            Mark this complaint as resolved and closed
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Once you have completed all necessary actions on this
                        complaint, you can close it. Please provide closing
                        remarks describing the resolution.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="w-4 h-4" />
                        <span>This action cannot be undone easily</span>
                      </div>
                      <Button
                        onClick={() => setShowCloseDialog(true)}
                        disabled={isComplaintClosed || actionLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        variant="default"
                      >
                        {isComplaintClosed ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Already Closed
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Close Complaint
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Extension Request Dialog */}
      <Dialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Request Term Extension
            </DialogTitle>
            <DialogDescription>
              Request more time to act on this complaint. This will be sent to
              the admin for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extension-days">
                Extension (days) <span className="text-red-500">*</span>
              </Label>
              <input
                id="extension-days"
                type="number"
                min={1}
                max={365}
                value={extensionDays}
                onChange={(e) => setExtensionDays(Number(e.target.value))}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-reason">
                Reason for Extension <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="extension-reason"
                placeholder="Please explain why you need additional time to resolve this complaint..."
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                rows={5}
                className="resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {extensionReason.length}/1000 characters
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Your extension request will be reviewed. The time boundary for
                  this complaint is{" "}
                  <strong>{complaint?.timeBoundary || 7} days</strong>.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExtensionDialog(false);
                setExtensionReason("");
                setExtensionDays(7);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestExtension}
              disabled={
                actionLoading ||
                !extensionReason.trim() ||
                !extensionDays ||
                extensionDays < 1
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Complaint Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Close Complaint
            </DialogTitle>
            <DialogDescription>
              Please provide closing remarks describing how this complaint was
              resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="closing-remarks">
                Closing Remarks <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="closing-remarks"
                placeholder="Please describe the actions taken and how the complaint was resolved..."
                value={closingRemarks}
                onChange={(e) => setClosingRemarks(e.target.value)}
                rows={5}
                className="resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {closingRemarks.length}/2000 characters
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Once closed, this complaint will be marked as resolved. Make
                  sure all necessary actions have been completed before closing.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCloseDialog(false);
                setClosingRemarks("");
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseComplaint}
              disabled={actionLoading || !closingRemarks.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Close Complaint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficerComplaintDetailPage;
