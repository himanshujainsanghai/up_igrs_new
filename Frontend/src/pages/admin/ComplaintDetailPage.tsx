/**
 * Complaint Detail Page
 * Full complaint management interface with tabs
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  FileText,
  Search,
  Edit,
  Settings,
  ArrowLeft,
  Download,
  Trash,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Upload,
  ExternalLink,
  MessageSquare,
  Bell,
  Users,
  Archive,
  DollarSign,
  Newspaper,
  Lightbulb,
  Sparkles,
  MessageCircle,
  FileUp,
  FileDown,
  Globe,
  Languages,
  Save,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  Tag,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { complaintsService } from "@/services/complaints.service";
import { Complaint, ComplaintNote, ComplaintDocument } from "@/types";
import { toast } from "sonner";
import ComplaintTimeline from "@/components/complaints/ComplaintTimeline";
import {
  notesUtils,
  documentsUtils,
  researchUtils,
  draftLetterUtils,
  actionsUtils,
  detailsUtils,
} from "./utils/complaintDetailUtils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchExecutives,
  selectFlattenedExecutives,
  selectExecutivesLoading,
  selectExecutivesError,
} from "@/store/slices/executives.slice";

const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state for executives
  const flattenedExecutives = useAppSelector(selectFlattenedExecutives);
  const executivesLoading = useAppSelector(selectExecutivesLoading);
  const executivesError = useAppSelector(selectExecutivesError);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  // Notes & Documents
  const [notes, setNotes] = useState<ComplaintNote[]>([]);
  const [documents, setDocuments] = useState<ComplaintDocument[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<"inward" | "outward">(
    "inward"
  );
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Research
  const [researchData, setResearchData] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);

  // Draft Letter
  const [executives, setExecutives] = useState<any[]>([]);
  const [selectedExecutiveIndex, setSelectedExecutiveIndex] =
    useState<number>(0);
  const [letter, setLetter] = useState<any>(null);
  const [editableLetterBody, setEditableLetterBody] = useState("");
  const [stage1Loading, setStage1Loading] = useState(false);
  const [stage2Loading, setStage2Loading] = useState(false);
  const officersScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [stage3Loading, setStage3Loading] = useState(false);

  // Assignment Officers Scroll
  const assignmentOfficersScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeftAssignment, setCanScrollLeftAssignment] = useState(false);
  const [canScrollRightAssignment, setCanScrollRightAssignment] =
    useState(true);

  // Actions
  const [actions, setActions] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);

  // Status updates
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Officer Assignment
  const [assignmentExecutives, setAssignmentExecutives] = useState<any[]>([]);
  const [
    selectedAssignmentExecutiveIndex,
    setSelectedAssignmentExecutiveIndex,
  ] = useState<number>(-1);
  const [loadingAssignmentExecutives, setLoadingAssignmentExecutives] =
    useState(false);
  const [assigningOfficer, setAssigningOfficer] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{
    isNewOfficer: boolean;
    user?: {
      id: string;
      email: string;
      name: string;
      password?: string;
    };
    officer: any;
  } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    if (id) {
      loadComplaint();
      loadNotes();
      loadDocuments();
      loadEmailHistory();
    }
  }, [id]);

  // Sync executives from Redux store when it changes
  useEffect(() => {
    if (flattenedExecutives.length > 0) {
      // Sync executives from Redux to local state for draft letter
      setExecutives(flattenedExecutives);
      // Also sync to assignment executives
      setAssignmentExecutives(flattenedExecutives);
    }
  }, [flattenedExecutives]);

  // Note: Assignment executives are no longer loaded - we use selected_officer directly

  const loadEmailHistory = async () => {
    if (!id) return;
    try {
      setLoadingEmailHistory(true);
      const history = await complaintsService.getEmailHistory(id);
      setEmailHistory(history);
    } catch (error: any) {
      console.error("Failed to load email history:", error);
    } finally {
      setLoadingEmailHistory(false);
    }
  };

  const loadComplaint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      console.log("Loading complaint with ID:", id);
      const data = await complaintsService.getComplaintById(id);
      console.log("Complaint loaded:", data);
      console.log("Complaint ID fields:", {
        id: data.id,
        _id: data._id,
        complaintId: (data as any).complaintId,
      });
      setComplaint(data);

      // Load saved research data
      const savedResearch = researchUtils.loadSavedResearch(data);
      if (savedResearch) {
        setResearchData(savedResearch);
        console.log("Loaded saved research data");
      }

      // Note: Executives are now loaded fresh from database when "Find Officers" is clicked
      // We don't load saved officers anymore - always fetch from DB

      // Load saved letter
      const savedLetter = draftLetterUtils.loadSavedLetter(data);
      if (savedLetter) {
        setLetter(savedLetter);
        // Handle both formats: direct letter object or nested letter.letter
        const letterBody = savedLetter.body || savedLetter.letter?.body || "";
        setEditableLetterBody(letterBody);
        console.log("Loaded saved letter:", savedLetter);
      }

      // Load saved actions from AI resolution steps
      const savedActions = actionsUtils.loadSavedActions(data);
      if (savedActions.length > 0) {
        setActions(savedActions);
        console.log("Loaded saved actions from AI resolution steps");
      }

      // Note: selected_officer is only for display in the header
      // It should NOT be added to executives list - executives come only from API/context
      if ((data as any).selected_officer) {
        console.log("Loaded selected officer:", (data as any).selected_officer);
      }
    } catch (error: any) {
      console.error("Error loading complaint:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.message || "Failed to load complaint");
      // Don't navigate away immediately, show error first
      setTimeout(() => {
        navigate("/admin/complaints");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    if (!id) return;
    const data = await notesUtils.loadNotes(id);
    setNotes(data);
  };

  const loadDocuments = async () => {
    if (!id) return;
    const data = await documentsUtils.loadDocuments(id);
    setDocuments(data);
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    try {
      setIsAddingNote(true);
      const note = await notesUtils.addNote(id, newNote.trim());
      // Reload notes to ensure we have the latest data
      await loadNotes();
      setNewNote("");
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleAddDocument = async () => {
    if (!id || !newDocumentFile) return;
    try {
      setIsUploadingDoc(true);
      await documentsUtils.addDocument(id, newDocumentFile, newDocumentType);
      // Reload documents to ensure we have the latest data
      await loadDocuments();
      // Reset file input
      setNewDocumentFile(null);
      const fileInput = document.getElementById(
        "document-file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleResearch = async () => {
    if (!id) return;
    try {
      setResearchLoading(true);
      const research = await researchUtils.performResearch(id);
      setResearchData(research);
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setResearchLoading(false);
    }
  };

  const handleFindOfficers = async () => {
    if (!id) return;
    try {
      setStage1Loading(true);

      // First, check if we have executives in Redux context (from API)
      if (flattenedExecutives.length > 0) {
        // Use cached executives from Redux context (API data only, no selected_officer mixing)
        setExecutives(flattenedExecutives);
        setSelectedExecutiveIndex(0);
        toast.success(
          `Loaded ${flattenedExecutives.length} executives from cache`
        );
        setStage1Loading(false);
        return;
      }

      // If context is empty, fetch from API and store in context
      const result = await dispatch(fetchExecutives(false));

      if (fetchExecutives.fulfilled.match(result)) {
        // Use executives from API (stored in context) - pure API data only
        const executivesData = result.payload.flattenedExecutives;
        setExecutives(executivesData);
        setSelectedExecutiveIndex(0);

        if (result.payload.fromCache) {
          toast.success(
            `Loaded ${executivesData.length} executives from cache`
          );
        } else {
          toast.success(`Found ${executivesData.length} executives`);
        }
      } else {
        throw new Error(executivesError || "Failed to fetch executives");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch executives");
    } finally {
      setStage1Loading(false);
    }
  };

  const checkScrollButtons = useCallback(() => {
    if (!officersScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = officersScrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const scrollOfficers = useCallback((direction: "left" | "right") => {
    if (!officersScrollRef.current) return;
    const scrollAmount = 400; // Scroll by 400px
    const currentScroll = officersScrollRef.current.scrollLeft;
    const newScroll =
      direction === "left"
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;
    officersScrollRef.current.scrollTo({
      left: newScroll,
      behavior: "smooth",
    });
  }, []);

  // Check scroll buttons when executives change or component mounts
  useEffect(() => {
    if (executives.length > 0) {
      const timer = setTimeout(() => {
        checkScrollButtons();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [executives, checkScrollButtons]);

  const checkAssignmentScrollButtons = useCallback(() => {
    if (!assignmentOfficersScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } =
      assignmentOfficersScrollRef.current;
    setCanScrollLeftAssignment(scrollLeft > 0);
    setCanScrollRightAssignment(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const scrollAssignmentOfficers = useCallback(
    (direction: "left" | "right") => {
      if (!assignmentOfficersScrollRef.current) return;
      const scrollAmount = 400; // Scroll by 400px
      const currentScroll = assignmentOfficersScrollRef.current.scrollLeft;
      const newScroll =
        direction === "left"
          ? currentScroll - scrollAmount
          : currentScroll + scrollAmount;
      assignmentOfficersScrollRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    },
    []
  );

  // Check scroll buttons when assignment executives change or component mounts
  useEffect(() => {
    if (assignmentExecutives.length > 0) {
      const timer = setTimeout(() => {
        checkAssignmentScrollButtons();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [assignmentExecutives, checkAssignmentScrollButtons]);

  const handleDraftLetter = async () => {
    if (!id || executives.length === 0) return;
    try {
      setStage2Loading(true);
      // Get the selected executive
      const selectedExecutive = executives[selectedExecutiveIndex];
      const letterData = await draftLetterUtils.draftLetter(
        id,
        selectedExecutive
      );
      setLetter(letterData);
      // Handle both formats: direct body or nested letter.body
      const letterBody =
        letterData?.body ||
        letterData?.letter?.body ||
        (letterData?.letter ? letterData.letter.body : "") ||
        "";
      setEditableLetterBody(letterBody);
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setStage2Loading(false);
    }
  };

  const handleSaveLetter = async () => {
    if (!id || !letter) return;
    try {
      const updatedLetter = await draftLetterUtils.saveLetter(
        id,
        letter,
        editableLetterBody
      );
      setLetter(updatedLetter);
    } catch (error: any) {
      // Error already handled in utility function
    }
  };

  const handleProceedToActions = () => {
    // Simply redirect to Actions tab - no AI generation
    setActiveTab("actions");
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "email":
        return Mail;
      case "phone_call":
        return Phone;
      case "whatsapp_message":
        return MessageSquare;
      case "proposal":
        return FileText;
      case "notice":
        return Bell;
      case "meeting":
        return Users;
      case "fieldwork":
        return MapPin;
      default:
        return Settings;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "email":
        return "text-blue-600";
      case "phone_call":
        return "text-green-600";
      case "whatsapp_message":
        return "text-teal-600";
      case "proposal":
        return "text-purple-600";
      case "notice":
        return "text-orange-600";
      case "meeting":
        return "text-indigo-600";
      case "fieldwork":
        return "text-cyan-600";
      default:
        return "text-gray-600";
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !complaint) return;
    try {
      setUpdatingStatus(true);
      const updated = await detailsUtils.updateStatus(id, newStatus);
      setComplaint({ ...complaint, status: newStatus as any });
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!id || !complaint) return;
    try {
      setUpdatingPriority(true);
      const updated = await detailsUtils.updatePriority(id, newPriority);
      setComplaint({ ...complaint, priority: newPriority as any });
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await detailsUtils.deleteComplaint(id);
      navigate("/admin/complaints");
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExecuteAction = async (action: any, index: number) => {
    if (!id) return;

    // Only handle email actions for now
    if (action.type === "email") {
      try {
        setSendingEmail({ ...sendingEmail, [index]: true });

        // Get recipient email from primary_officer or action.to
        let recipientEmail: string | undefined;
        const primaryOfficer = (complaint as any)?.primary_officer;
        if (primaryOfficer?.email) {
          recipientEmail = primaryOfficer.email;
        } else if (action.to && action.to.includes("@")) {
          // Try to extract email from action.to if it contains @
          recipientEmail = action.to;
        }

        await actionsUtils.sendEmail(id, recipientEmail);
        // Reload email history after sending
        await loadEmailHistory();
      } catch (error: any) {
        // Error already handled in utility function
      } finally {
        setSendingEmail({ ...sendingEmail, [index]: false });
      }
    } else {
      toast.info(`Action type "${action.type}" execution not yet implemented`);
    }
  };

  const loadAssignmentExecutives = async () => {
    if (!id) return;
    try {
      setLoadingAssignmentExecutives(true);
      // Fetch executives from Redux store (will use cache if available)
      const result = await dispatch(fetchExecutives(false));

      if (fetchExecutives.fulfilled.match(result)) {
        // Use flattened executives from Redux store
        const executivesData =
          flattenedExecutives.length > 0
            ? flattenedExecutives
            : result.payload.flattenedExecutives;
        setAssignmentExecutives(executivesData);
        if (executivesData.length > 0) {
          setSelectedAssignmentExecutiveIndex(0);
        }
        if (result.payload.fromCache) {
          toast.success(
            `Loaded ${executivesData.length} executives from cache`
          );
        }
      } else {
        throw new Error(executivesError || "Failed to fetch executives");
      }
    } catch (error: any) {
      console.error("Failed to load executives:", error);
      toast.error(error.message || "Failed to load executives");
    } finally {
      setLoadingAssignmentExecutives(false);
    }
  };

  const handleAssignOfficer = async () => {
    if (!id) return;

    // Use selected_officer directly
    const selectedOfficer = (complaint as any)?.selected_officer;

    if (!selectedOfficer) {
      toast.error("No selected officer found. Please draft a letter first.");
      return;
    }

    try {
      setAssigningOfficer(true);

      // Convert selected_officer to executive format for API
      const executiveForAPI = {
        name: selectedOfficer.name || "",
        designation: selectedOfficer.designation || "",
        email: selectedOfficer.email || "",
        phone: selectedOfficer.phone || "",
        office_address: selectedOfficer.office_address || "",
        district:
          complaint?.districtName ||
          (complaint as any)?.district_name ||
          "Unknown",
        category: "general_administration" as const,
      };

      // Use unified endpoint: assign officer and send email
      const result = await complaintsService.assignOfficerAndSendEmail(
        id,
        executiveForAPI
      );

      if (!result || !result.assignment || !result.assignment.complaint) {
        toast.error("Invalid response from server");
        return;
      }

      // Set assignment result (using the assignment part of the response)
      setAssignmentResult(result.assignment);
      // Reload complaint to ensure we have all updated fields from backend
      await loadComplaint();
      // Reload email history to show the new email
      await loadEmailHistory();

      // Show success messages based on assignment and email status
      if (result.assignment.isNewOfficer && result.assignment.user?.password) {
        if (result.email.success) {
          toast.success(
            `Officer assigned and email sent successfully! Password: ${result.assignment.user.password} (sent via email)`,
            { duration: 10000 }
          );
        } else {
          toast.warning(
            `Officer assigned but email failed. Password: ${result.assignment.user.password}`,
            { duration: 10000 }
          );
          toast.error(`Email error: ${result.email.error || "Unknown error"}`, {
            duration: 5000,
          });
        }
      } else {
        if (result.email.success) {
          toast.success(
            "Complaint assigned to existing officer and email sent successfully!"
          );
        } else {
          toast.warning("Complaint assigned but email failed to send");
          toast.error(`Email error: ${result.email.error || "Unknown error"}`, {
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to assign officer and send email:", error);
      toast.error(error.message || "Failed to assign officer and send email");
    } finally {
      setAssigningOfficer(false);
    }
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      toast.success("Email copied to clipboard!");
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (error) {
      toast.error("Failed to copy email");
    }
  };

  const handleCopyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      toast.success("Password copied to clipboard!");
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      toast.error("Failed to copy password");
    }
  };

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
        <Button onClick={() => navigate("/admin/complaints")} className="mt-4">
          Back to Complaints
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/complaints")}
                className="mt-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-3">
                  {complaint.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(complaint.status)}
                  {getPriorityBadge(complaint.priority)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Select
                value={complaint.status}
                onValueChange={handleUpdateStatus}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={complaint.priority}
                onValueChange={handleUpdatePriority}
                disabled={updatingPriority}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white">
          <TabsTrigger
            value="details"
            className="bg-white text-foreground data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="bg-white text-foreground data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Notes & Docs
          </TabsTrigger>
          <TabsTrigger
            value="research"
            className="bg-white text-foreground data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
          >
            <Search className="w-4 h-4 mr-2" />
            Research
          </TabsTrigger>
          <TabsTrigger
            value="draft"
            className="bg-white text-foreground data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
          >
            <Edit className="w-4 h-4 mr-2" />
            Draft Letter
          </TabsTrigger>
          <TabsTrigger
            value="actions"
            className="bg-white text-foreground data-[state=active]:bg-[#011a60] data-[state=active]:text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card className="border-[#011a60]/30">
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeline */}
              <div className="pb-6 border-b border-gray-200">
                <ComplaintTimeline complaint={complaint} variant="detailed" />
              </div>
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
                    <p className="text-foreground mt-1">
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
                  {complaint.voterId && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Voter ID
                      </Label>
                      <p className="text-foreground mt-1">
                        {complaint.voterId}
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
                            (complaint as any).created_at || complaint.createdAt
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
                          (complaint as any).updated_at
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
                          (complaint as any).arrivalTime
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
                          (complaint as any).assignedTime
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                  Assignment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Officer Assigned
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).isOfficerAssigned ? "Yes" : "No"}
                    </p>
                  </div>
                  {(complaint as any).assignedOfficer && (
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
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Created by Admin
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).created_by_admin ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <p className="text-foreground mt-1">
                      {(complaint as any).isClosed ? "Closed" : "Open"}
                      {(complaint as any).isExtended && " (Extended)"}
                    </p>
                  </div>
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
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        )
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
                      <a
                        key={index}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-[#011a60]/30 rounded-lg hover:border-[#011a60]/60 transition-all"
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
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Officer Attachments */}
              {(complaint as any).officerAttachments &&
                Array.isArray((complaint as any).officerAttachments) &&
                (complaint as any).officerAttachments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide border-b pb-2">
                      Officer Attachments (
                      {(complaint as any).officerAttachments.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(complaint as any).officerAttachments.map(
                        (attachmentUrl: string, index: number) => (
                          <a
                            key={index}
                            href={attachmentUrl}
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
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes & Documents Tab */}
        <TabsContent value="notes" className="space-y-6">
          {/* Add Note Section - Modern Design */}
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Add New Note</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm font-semibold">
                  Note Content
                </Label>
                <Textarea
                  id="note"
                  placeholder="Add internal notes, updates, or communication logs..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex items-center justify-between">
                  {newNote.trim().length > 0 && newNote.trim().length < 5 && (
                    <p className="text-xs text-destructive animate-in fade-in">
                      Note must be at least 5 characters (
                      {newNote.trim().length}/5)
                    </p>
                  )}
                  {newNote.trim().length >= 5 && (
                    <p className="text-xs text-green-600 animate-in fade-in">
                      ✓ Ready to save
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleAddNote}
                disabled={
                  isAddingNote || !newNote.trim() || newNote.trim().length < 5
                }
                className="w-full bg-primary hover:bg-primary/90 shadow-sm"
                size="lg"
              >
                {isAddingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Note...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Add Note
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Notes History - Timeline Design */}
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Notes History</CardTitle>
                </div>
                {notes.length > 0 && (
                  <Badge variant="outline" className="bg-white">
                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {notes.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/30 to-transparent"></div>

                  <div className="space-y-6">
                    {notes.map((note, index) => (
                      <div
                        key={note._id || (note as any).id}
                        className="relative pl-12"
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-500 border-4 border-background shadow-md flex items-center justify-center">
                          <MessageCircle className="w-3 h-3 text-white" />
                        </div>

                        {/* Note content */}
                        <div className="bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {note.content || (note as any).note}
                          </p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-100">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {note.createdAt
                                  ? new Date(note.createdAt).toLocaleString()
                                  : "Invalid Date"}
                              </p>
                            </div>
                            {note.createdBy && (
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground font-medium">
                                  {note.createdBy}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No notes yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Start adding notes to track updates and communications
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Document Section - Modern Design */}
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileUp className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Upload Document</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Document Type</Label>
                  <Select
                    value={newDocumentType}
                    onValueChange={(v: any) => setNewDocumentType(v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inward">
                        <div className="flex items-center gap-2">
                          <FileDown className="w-4 h-4" />
                          Inward
                        </div>
                      </SelectItem>
                      <SelectItem value="outward">
                        <div className="flex items-center gap-2">
                          <FileUp className="w-4 h-4" />
                          Outward
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Select File</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      id="document-file-input"
                      onChange={(e) =>
                        setNewDocumentFile(e.target.files?.[0] || null)
                      }
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      className="h-11 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {newDocumentFile && (
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        {newDocumentFile.name}
                      </p>
                      <p className="text-xs text-green-700">
                        {(newDocumentFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddDocument}
                disabled={isUploadingDoc || !newDocumentFile}
                className="w-full bg-primary hover:bg-primary/90 shadow-sm"
                size="lg"
              >
                {isUploadingDoc ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Document...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Documents History - Modern Grid Design */}
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileDown className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Documents History</CardTitle>
                </div>
                {documents.length > 0 && (
                  <Badge variant="outline" className="bg-white">
                    {documents.length}{" "}
                    {documents.length === 1 ? "document" : "documents"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => {
                    const isPdf =
                      doc.fileName?.toLowerCase().endsWith(".pdf") ||
                      doc.fileUrl?.toLowerCase().includes(".pdf");
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(
                      doc.fileName || ""
                    );

                    return (
                      <div
                        key={doc._id}
                        className="group relative bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isPdf
                                ? "bg-red-100"
                                : isImage
                                ? "bg-blue-100"
                                : "bg-gray-100"
                            }`}
                          >
                            {isPdf ? (
                              <FileText className="w-5 h-5 text-red-600" />
                            ) : isImage ? (
                              <FileText className="w-5 h-5 text-blue-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:text-primary transition-colors"
                            >
                              <p className="text-sm font-semibold truncate mb-1">
                                {doc.fileName}
                              </p>
                              {doc.createdAt && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(doc.createdAt).toLocaleString()}
                                </p>
                              )}
                            </a>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className={`capitalize text-xs ${
                                  doc.fileType === "inward"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                }`}
                              >
                                {doc.fileType}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(doc.fileUrl, "_blank")
                                }
                                className="h-7 px-2 text-xs"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No documents yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload documents to track related files
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="space-y-6">
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">
                      AI Research & Analysis
                    </CardTitle>
                    <p className="text-sm text-orange-100 mt-1">
                      Comprehensive research on related issues and key facts
                    </p>
                  </div>
                </div>
                {researchData ? (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-white">
                      Completed
                    </span>
                  </div>
                ) : (
                  <Button
                    onClick={handleResearch}
                    disabled={researchLoading}
                    size="lg"
                    className="bg-white text-primary hover:bg-orange-50 shadow-lg"
                  >
                    {researchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Researching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Start Research
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {researchLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      Researching related issues...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This may take a few moments
                    </p>
                  </div>
                </div>
              ) : researchData ? (
                <div className="space-y-4">
                  <Accordion
                    type="multiple"
                    defaultValue={[
                      "similar-issues",
                      "budget-info",
                      "news-articles",
                      "key-facts",
                    ]}
                    className="w-full"
                  >
                    {/* Similar Issues */}
                    {researchData.similar_issues &&
                      researchData.similar_issues.length > 0 && (
                        <AccordionItem
                          value="similar-issues"
                          className="border border-orange-200 rounded-lg mb-4 overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500 rounded-lg">
                                <Archive className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-foreground">
                                  Similar Issues
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {researchData.similar_issues.length} related
                                  cases found
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-4">
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                              {researchData.similar_issues.map(
                                (item: any, i: number) => (
                                  <div
                                    key={i}
                                    className="p-4 bg-gradient-to-br from-white to-blue-50/30 border-l-4 border-blue-500 rounded-lg hover:shadow-md transition-all"
                                  >
                                    <p className="font-semibold text-foreground mb-2">
                                      {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                      <span className="font-medium">
                                        {item.source}
                                      </span>
                                      {item.date && (
                                        <>
                                          <span>•</span>
                                          <span>{item.date}</span>
                                        </>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {item.summary}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                    {/* Budget Info */}
                    {researchData.budget_info && (
                      <AccordionItem
                        value="budget-info"
                        className="border border-orange-200 rounded-lg mb-4 overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground">
                                Budget Information
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Department allocation details
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                          <div className="p-4 bg-gradient-to-br from-white to-green-50/30 border border-green-200 rounded-lg">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between pb-2 border-b border-green-200">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Department
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                  {researchData.budget_info.department}
                                </span>
                              </div>
                              {researchData.budget_info.allocation && (
                                <div className="flex items-start justify-between pb-2 border-b border-green-200">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Allocation
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {researchData.budget_info.allocation}
                                  </span>
                                </div>
                              )}
                              {researchData.budget_info.source && (
                                <div className="flex items-start justify-between pb-2 border-b border-green-200">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Source
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {researchData.budget_info.source}
                                  </span>
                                </div>
                              )}
                              <div className="pt-2">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {researchData.budget_info.summary}
                                </p>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* News Articles */}
                    {researchData.news_articles &&
                      researchData.news_articles.length > 0 && (
                        <AccordionItem
                          value="news-articles"
                          className="border border-orange-200 rounded-lg mb-4 overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-500 rounded-lg">
                                <Newspaper className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-foreground">
                                  News Articles
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {researchData.news_articles.length} relevant
                                  articles
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-4">
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                              {researchData.news_articles.map(
                                (item: any, i: number) => (
                                  <div
                                    key={i}
                                    className="p-4 bg-gradient-to-br from-white to-purple-50/30 border-l-4 border-purple-500 rounded-lg hover:shadow-md transition-all"
                                  >
                                    {item.url ? (
                                      <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-primary hover:underline block mb-2"
                                      >
                                        {item.title}
                                        <ExternalLink className="w-3 h-3 inline ml-1" />
                                      </a>
                                    ) : (
                                      <p className="font-semibold text-foreground mb-2">
                                        {item.title}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mb-2">
                                      {item.source}
                                    </p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {item.summary}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                    {/* Key Facts */}
                    {researchData.key_facts &&
                      researchData.key_facts.length > 0 && (
                        <AccordionItem
                          value="key-facts"
                          className="border border-orange-200 rounded-lg mb-4 overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-500 rounded-lg">
                                <Lightbulb className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-foreground">
                                  Key Facts for Letter
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {researchData.key_facts.length} important
                                  points
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-4">
                            <div className="p-4 bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-lg">
                              <div className="space-y-3">
                                {researchData.key_facts.map(
                                  (fact: string, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-300 transition-colors"
                                    >
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-bold">
                                        {i + 1}
                                      </div>
                                      <p className="text-sm text-foreground leading-relaxed flex-1">
                                        {fact}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                  </Accordion>

                  {/* Research Depth Info */}
                  {researchData.research_depth && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 via-orange-100 to-amber-100 border-2 border-primary/20 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Research Depth:{" "}
                            <span className="text-primary">
                              {researchData.research_depth}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Key facts will be automatically included in the
                            complaint letter.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <Search className="w-10 h-10 text-orange-400" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Ready to Research
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click "Start Research" to find related issues, news
                    articles, and key facts
                  </p>
                  <Button
                    onClick={handleResearch}
                    disabled={researchLoading}
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Start Research
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Draft Letter Tab */}
        <TabsContent value="draft" className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  executives.length > 0 || (complaint as any)?.selected_officer
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {executives.length > 0 ||
                (complaint as any)?.selected_officer ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  "1"
                )}
              </div>
              <div
                className={`w-16 h-1 ${
                  executives.length > 0 || (complaint as any)?.selected_officer
                    ? "bg-gradient-to-r from-green-500 to-primary"
                    : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  letter
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                    : executives.length > 0 ||
                      (complaint as any)?.selected_officer
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {letter ? <CheckCircle className="w-5 h-5" /> : "2"}
              </div>
              <div
                className={`w-16 h-1 ${
                  letter
                    ? "bg-gradient-to-r from-green-500 to-primary"
                    : executives.length > 0 ||
                      (complaint as any)?.selected_officer
                    ? "bg-primary"
                    : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                actions
                  ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                  : letter
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {actions ? <CheckCircle className="w-5 h-5" /> : "3"}
            </div>
          </div>

          {/* Stage 1: Find Officers */}
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">
                        Stage 1: Find Officers
                      </CardTitle>
                      <p className="text-sm text-orange-100 mt-1">
                        Identify relevant officers to address the complaint
                      </p>
                    </div>
                  </div>
                  {(executives.length > 0 ||
                    (complaint as any)?.selected_officer) && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        {(complaint as any)?.selected_officer
                          ? "Officer Selected"
                          : "Completed"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Selected Officer Details in Header */}
                {(complaint as any)?.selected_officer && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="w-4 h-4 text-white/90" />
                      <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                        Selected Officer Details:
                      </span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg flex-shrink-0 border-2 border-white/30">
                          {(complaint as any).selected_officer.name
                            ?.charAt(0)
                            .toUpperCase() || "O"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-white mb-1">
                              {(complaint as any).selected_officer.name ||
                                "Unknown"}
                            </h3>
                            <p className="text-sm font-medium text-white/90">
                              {(complaint as any).selected_officer.designation}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {(complaint as any).selected_officer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-white/80" />
                                <a
                                  href={`mailto:${
                                    (complaint as any).selected_officer.email
                                  }`}
                                  className="text-white/90 hover:text-white hover:underline break-all"
                                >
                                  {(complaint as any).selected_officer.email}
                                </a>
                              </div>
                            )}
                            {(complaint as any).selected_officer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-white/80" />
                                <a
                                  href={`tel:${
                                    (complaint as any).selected_officer.phone
                                  }`}
                                  className="text-white/90 hover:text-white hover:underline"
                                >
                                  {(complaint as any).selected_officer.phone}
                                </a>
                              </div>
                            )}
                            {(complaint as any).selected_officer
                              .office_address && (
                              <div className="flex items-start gap-2 w-full">
                                <MapPin className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                                <span className="text-white/90 text-xs">
                                  {
                                    (complaint as any).selected_officer
                                      .office_address
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {stage1Loading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <Users className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      Searching for officers...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Finding the most relevant officials
                    </p>
                  </div>
                </div>
              ) : executives.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <Label className="font-semibold text-lg text-foreground mb-4 block">
                      Select Executive to Address ({executives.length}{" "}
                      available):
                    </Label>
                    <div className="relative w-full overflow-hidden">
                      {/* Left Scroll Button */}
                      {canScrollLeft && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:bg-gray-50"
                          onClick={() => scrollOfficers("left")}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                      )}
                      {/* Right Scroll Button */}
                      {canScrollRight && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:bg-gray-50"
                          onClick={() => scrollOfficers("right")}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      )}
                      {/* Scrollable Container */}
                      <div
                        ref={officersScrollRef}
                        onScroll={checkScrollButtons}
                        className="overflow-x-auto scrollbar-hide pb-4 px-12"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        <RadioGroup
                          value={selectedExecutiveIndex.toString()}
                          onValueChange={(value) =>
                            setSelectedExecutiveIndex(parseInt(value))
                          }
                          className="flex gap-4"
                        >
                          {executives.map((exec, index) => (
                            <div
                              key={index}
                              className="w-[320px] flex-shrink-0"
                            >
                              <RadioGroupItem
                                value={index.toString()}
                                id={`executive-${index}`}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={`executive-${index}`}
                                className="flex flex-col p-4 border-2 rounded-xl cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-primary/20 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-primary/5 peer-data-[state=checked]:to-orange-50 h-full"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-base text-foreground mb-1">
                                      {exec.name || "Unknown"}
                                    </div>
                                    <div className="text-sm font-medium text-muted-foreground mb-2">
                                      {exec.designation} - {exec.district}
                                    </div>
                                    <div className="space-y-1.5 text-sm">
                                      {exec.email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                          <span className="truncate">
                                            {exec.email}
                                          </span>
                                        </div>
                                      )}
                                      {exec.phone && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                          <span>{exec.phone}</span>
                                        </div>
                                      )}
                                      {exec.office_address && (
                                        <div className="flex items-start gap-2 text-muted-foreground">
                                          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="text-xs">
                                            {exec.office_address}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  {!letter && (
                    <Button
                      onClick={handleDraftLetter}
                      disabled={stage2Loading}
                      className="w-full bg-primary hover:bg-primary/90 shadow-lg"
                      size="lg"
                    >
                      {stage2Loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Drafting Letter...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Stage 2: Draft Letter to Selected Executive
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <Users className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {flattenedExecutives.length === 0
                      ? "Ready to Find Officers"
                      : "No Executives Available"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {flattenedExecutives.length === 0
                      ? "Click the button below to fetch officers from the API and store them in context"
                      : "Executives have been loaded but none are available for this complaint"}
                  </p>
                  {flattenedExecutives.length === 0 && (
                    <Button
                      onClick={handleFindOfficers}
                      disabled={stage1Loading}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {stage1Loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching Officers...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Find Officers and Draft Letter
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage 2: Draft Letter */}
          {letter && (
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">
                        Stage 2: Draft Letter
                      </CardTitle>
                      <p className="text-sm text-orange-100 mt-1">
                        {executives.length > 0
                          ? "AI-generated complaint letter for selected executive"
                          : "Saved complaint letter"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-white">
                      Drafted
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {stage2Loading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <FileText className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        Drafting letter...
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI is generating the complaint letter
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Letter Header Info */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {letter.from && (
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              From
                            </Label>
                            <p className="text-sm font-semibold text-foreground mt-1">
                              {letter.from}
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            To
                          </Label>
                          <p className="text-sm font-semibold text-foreground mt-1">
                            {letter.to || letter.letter?.to}
                          </p>
                        </div>
                        {letter.date && (
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Date
                            </Label>
                            <p className="text-sm font-semibold text-foreground mt-1">
                              {letter.date}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Subject
                        </Label>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {letter.subject || letter.letter?.subject}
                        </p>
                      </div>
                    </div>

                    {/* Letter Editor */}
                    <Card className="border-2 border-orange-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <Label className="text-base font-semibold">
                            Letter Body
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          {executives.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDraftLetter}
                              disabled={stage2Loading}
                              className="border-orange-200 hover:bg-orange-50"
                            >
                              {stage2Loading ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Redrafting...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Redraft
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            onClick={handleSaveLetter}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </div>
                      <div className="p-6 bg-white">
                        <Textarea
                          value={editableLetterBody}
                          onChange={(e) =>
                            setEditableLetterBody(e.target.value)
                          }
                          className="min-h-[500px] font-serif text-base leading-relaxed resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                          placeholder="Letter body will appear here..."
                        />
                      </div>
                    </Card>
                    {letter.attachments &&
                      Array.isArray(letter.attachments) &&
                      letter.attachments.length > 0 && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                            Attachments ({letter.attachments.length})
                          </Label>
                          <div className="space-y-2">
                            {letter.attachments.map(
                              (url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  Attachment {idx + 1}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 3: Proceed to Actions Panel */}
          {letter && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-white">
                    3
                  </div>
                  <CardTitle>Stage 3: Proceed to Actions Panel</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="border-t">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Continue to the Actions tab to assign officers and manage
                    complaint resolution.
                  </p>
                  <Button
                    onClick={handleProceedToActions}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Proceed to Actions Panel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {/* Check if drafted_letter exists */}
          {!(complaint as any)?.drafted_letter && !letter ? (
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">
                      Draft Letter Required
                    </CardTitle>
                    <p className="text-sm text-orange-100 mt-1">
                      Please draft a letter first to proceed with actions
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Draft Letter Required
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    You need to draft a letter for this complaint before you can
                    proceed with actions. Please go to the Draft Letter tab to
                    create the letter first.
                  </p>
                  <Button
                    onClick={() => setActiveTab("draft")}
                    size="lg"
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Go to Draft Letter Tab
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Officer Assignment Section */}
              <Card className="border-orange-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl text-white">
                            Assign to Officer
                          </CardTitle>
                          <p className="text-sm text-orange-100 mt-1">
                            Assign this complaint to an officer for resolution
                          </p>
                        </div>
                      </div>
                      {complaint?.isOfficerAssigned && (
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                          <CheckCircle className="w-5 h-5 text-white" />
                          <span className="text-sm font-medium text-white">
                            Assigned
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Selected Officer Details in Header */}
                    {/* {(complaint as any)?.selected_officer && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3">
                          <UserCheck className="w-4 h-4 text-white/90" />
                          <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                            Selected Officer Details:
                          </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg flex-shrink-0 border-2 border-white/30">
                              {(complaint as any).selected_officer.name
                                ?.charAt(0)
                                .toUpperCase() || "O"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="mb-3">
                                <h3 className="text-lg font-bold text-white mb-1">
                                  {(complaint as any).selected_officer.name ||
                                    "Unknown"}
                                </h3>
                                <p className="text-sm font-medium text-white/90">
                                  {
                                    (complaint as any).selected_officer
                                      .designation
                                  }
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                {(complaint as any).selected_officer.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-white/80" />
                                    <a
                                      href={`mailto:${
                                        (complaint as any).selected_officer
                                          .email
                                      }`}
                                      className="text-white/90 hover:text-white hover:underline break-all"
                                    >
                                      {
                                        (complaint as any).selected_officer
                                          .email
                                      }
                                    </a>
                                  </div>
                                )}
                                {(complaint as any).selected_officer.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-white/80" />
                                    <a
                                      href={`tel:${
                                        (complaint as any).selected_officer
                                          .phone
                                      }`}
                                      className="text-white/90 hover:text-white hover:underline"
                                    >
                                      {
                                        (complaint as any).selected_officer
                                          .phone
                                      }
                                    </a>
                                  </div>
                                )}
                                {(complaint as any).selected_officer
                                  .office_address && (
                                  <div className="flex items-start gap-2 w-full">
                                    <MapPin className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                                    <span className="text-white/90 text-xs">
                                      {
                                        (complaint as any).selected_officer
                                          .office_address
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )} */}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {complaint?.isOfficerAssigned && !assignmentResult ? (
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500 rounded-lg">
                          <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-blue-900 mb-2">
                            Complaint Already Assigned
                          </h3>
                          <p className="text-sm text-blue-700 mb-4">
                            This complaint has already been assigned to an
                            officer.
                          </p>
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <p className="text-sm font-semibold text-foreground">
                              Assigned Officer
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Check the complaint details for more information.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : !(complaint as any)?.selected_officer ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                        <UserCheck className="w-10 h-10 text-orange-400" />
                      </div>
                      <p className="text-lg font-semibold text-foreground mb-2">
                        No Selected Officer
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
                        Please draft a letter first to select an officer for
                        assignment.
                      </p>
                      <Button
                        onClick={() => setActiveTab("draft")}
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Go to Draft Letter Tab
                      </Button>
                    </div>
                  ) : assignmentResult ? (
                    <div className="space-y-4">
                      {assignmentResult.isNewOfficer &&
                      assignmentResult.user &&
                      assignmentResult.user.password ? (
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-green-500 rounded-lg">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-green-900 mb-2">
                                Officer Assigned Successfully!
                              </h3>
                              <p className="text-sm text-green-700 mb-4">
                                A new user account has been created for the
                                officer. Please save the credentials below.
                              </p>
                              <div className="space-y-3">
                                <div className="p-4 bg-white rounded-lg border border-green-200">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                                    Email
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-green-600" />
                                    <p className="text-sm font-semibold text-foreground">
                                      {assignmentResult.user?.email || "N/A"}
                                    </p>
                                    {assignmentResult.user?.email && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleCopyEmail(
                                            assignmentResult.user!.email
                                          )
                                        }
                                        className="ml-auto h-7 px-2"
                                      >
                                        {copiedEmail ? (
                                          <Check className="w-3 h-3 text-green-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-green-200">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                                    Password
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 font-mono text-sm font-semibold text-foreground bg-gray-50 px-3 py-2 rounded border">
                                      {assignmentResult.user?.password || "N/A"}
                                    </div>
                                    {assignmentResult.user?.password && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleCopyPassword(
                                            assignmentResult.user!.password!
                                          )
                                        }
                                        className="h-9 px-3 border-green-300 hover:bg-green-50"
                                      >
                                        {copiedPassword ? (
                                          <>
                                            <Check className="w-4 h-4 mr-2 text-green-600" />
                                            Copied!
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500 rounded-lg">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-blue-900 mb-2">
                                Complaint Assigned Successfully!
                              </h3>
                              <p className="text-sm text-blue-700">
                                The complaint has been assigned to an existing
                                officer. They can now access it from their
                                dashboard.
                              </p>
                              {assignmentResult.officer && (
                                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                                  <p className="text-sm font-semibold text-foreground">
                                    {assignmentResult.officer.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {assignmentResult.officer.designation} -{" "}
                                    {assignmentResult.officer.department}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          setAssignmentResult(null);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Assign to Another Officer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Highlighted Selected Officer Card */}
                      {(complaint as any)?.selected_officer && (
                        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border-2 border-orange-300 rounded-xl p-6 shadow-lg">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg border-4 border-white">
                              {(complaint as any).selected_officer.name
                                ?.charAt(0)
                                .toUpperCase() || "O"}
                            </div>
                            <div className="flex-1">
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-orange-500 text-white border-0">
                                    Selected Officer
                                  </Badge>
                                </div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">
                                  {(complaint as any).selected_officer.name ||
                                    "Unknown"}
                                </h3>
                                <p className="text-lg font-semibold text-primary">
                                  {
                                    (complaint as any).selected_officer
                                      .designation
                                  }
                                </p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(complaint as any).selected_officer.email && (
                                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                      <Mail className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Email
                                      </p>
                                      <a
                                        href={`mailto:${
                                          (complaint as any).selected_officer
                                            .email
                                        }`}
                                        className="text-sm font-medium text-foreground hover:text-primary break-all"
                                      >
                                        {
                                          (complaint as any).selected_officer
                                            .email
                                        }
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {(complaint as any).selected_officer.phone && (
                                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                                    <div className="p-2 bg-green-500 rounded-lg">
                                      <Phone className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Phone
                                      </p>
                                      <a
                                        href={`tel:${
                                          (complaint as any).selected_officer
                                            .phone
                                        }`}
                                        className="text-sm font-medium text-foreground hover:text-primary"
                                      >
                                        {
                                          (complaint as any).selected_officer
                                            .phone
                                        }
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {(complaint as any).selected_officer
                                  .office_address && (
                                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm md:col-span-2">
                                    <div className="p-2 bg-purple-500 rounded-lg flex-shrink-0">
                                      <MapPin className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Office Address
                                      </p>
                                      <p className="text-sm font-medium text-foreground">
                                        {
                                          (complaint as any).selected_officer
                                            .office_address
                                        }
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Assign Button */}
                      <Button
                        onClick={handleAssignOfficer}
                        disabled={
                          assigningOfficer ||
                          !(complaint as any)?.selected_officer
                        }
                        className="w-full bg-primary hover:bg-primary/90 shadow-lg"
                        size="lg"
                      >
                        {assigningOfficer ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Assigning Officer...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Assign Complaint to Selected Officer
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                {/* <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        actions
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      3
                    </div>
                    <CardTitle>Stage 3: Action Plan</CardTitle>
                  </div>
                  {actions && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </CardHeader> */}
                <CardContent className="border-t">
                  {/* {actions && Array.isArray(actions) && actions.length > 0 ? (
                    <div className="space-y-3">
                      {actions.map((action: any, index: number) => {
                        const ActionIcon = getActionIcon(action.type);
                        const iconColor = getActionColor(action.type);
                        return (
                          <Card key={index}>
                            <CardContent className="p-4 flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <ActionIcon
                                  className={`w-5 h-5 ${iconColor} mt-0.5`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold capitalize text-sm">
                                      {action.type?.replace("_", " ")}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Step {index + 1}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    To: {action.to}
                                  </p>
                                  <p className="text-sm text-foreground">
                                    {action.details}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleExecuteAction(action, index)
                                }
                                disabled={sendingEmail[index]}
                              >
                                {sendingEmail[index] ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  "Execute"
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : actions ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-sm">No actions in the action plan.</p>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-sm">No action plan generated yet.</p>
                      <p className="text-sm mt-1">
                        Please complete the Draft Letter workflow first.
                      </p>
                      <Button
                        onClick={() => setActiveTab("draft")}
                        variant="outline"
                        className="mt-4"
                      >
                        Go to Draft Letter
                      </Button>
                    </div>
                  )} */}

                  {(emailHistory.length > 0 || loadingEmailHistory) && (
                    <div className="mt-8 pt-6 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">Email History</CardTitle>
                        {!loadingEmailHistory && (
                          <Badge variant="outline" className="ml-auto">
                            {emailHistory.length}{" "}
                            {emailHistory.length === 1 ? "email" : "emails"}
                          </Badge>
                        )}
                      </div>
                      {loadingEmailHistory ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            Loading email history...
                          </span>
                        </div>
                      ) : emailHistory.length > 0 ? (
                        <div className="space-y-3">
                          {emailHistory
                            .slice()
                            .reverse()
                            .map((email: any, index: number) => (
                              <Card
                                key={index}
                                className={`border-l-4 ${
                                  email.status === "sent"
                                    ? "border-l-green-500"
                                    : "border-l-red-500"
                                }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {email.status === "sent" ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                      )}
                                      <Badge
                                        variant={
                                          email.status === "sent"
                                            ? "default"
                                            : "destructive"
                                        }
                                        className="text-xs"
                                      >
                                        {email.status === "sent"
                                          ? "Sent"
                                          : "Failed"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(email.sentAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs font-semibold text-muted-foreground w-12">
                                        From:
                                      </Label>
                                      <p className="text-sm text-foreground">
                                        {email.from}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs font-semibold text-muted-foreground w-12">
                                        To:
                                      </Label>
                                      <p className="text-sm text-foreground">
                                        {email.to}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs font-semibold text-muted-foreground w-12">
                                        Subject:
                                      </Label>
                                      <p className="text-sm font-medium text-foreground">
                                        {email.subject}
                                      </p>
                                    </div>
                                    {email.messageId && (
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold text-muted-foreground w-12">
                                          ID:
                                        </Label>
                                        <p className="text-xs text-muted-foreground font-mono">
                                          {email.messageId}
                                        </p>
                                      </div>
                                    )}
                                    {email.error && (
                                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                        <p className="text-xs text-red-700">
                                          <strong>Error:</strong> {email.error}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-sm">No email history yet.</p>
                          <p className="text-xs mt-1">
                            Emails sent for this complaint will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this complaint? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComplaintDetailPage;
