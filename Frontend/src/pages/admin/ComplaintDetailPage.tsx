/**
 * Complaint Detail Page
 * Full complaint management interface with tabs
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { complaintsService } from '@/services/complaints.service';
import { Complaint, ComplaintNote, ComplaintDocument } from '@/types';
import { toast } from 'sonner';
import {
  notesUtils,
  documentsUtils,
  researchUtils,
  draftLetterUtils,
  actionsUtils,
  detailsUtils,
} from './utils/complaintDetailUtils';

const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Notes & Documents
  const [notes, setNotes] = useState<ComplaintNote[]>([]);
  const [documents, setDocuments] = useState<ComplaintDocument[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<'inward' | 'outward'>('inward');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  
  // Research
  const [researchData, setResearchData] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  
  // Draft Letter
  const [executives, setExecutives] = useState<any[]>([]);
  const [selectedExecutiveIndex, setSelectedExecutiveIndex] = useState<number>(0);
  const [letter, setLetter] = useState<any>(null);
  const [editableLetterBody, setEditableLetterBody] = useState('');
  const [stage1Loading, setStage1Loading] = useState(false);
  const [stage2Loading, setStage2Loading] = useState(false);
  const [stage3Loading, setStage3Loading] = useState(false);
  
  // Actions
  const [actions, setActions] = useState<any>(null);
  
  // Status updates
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (id) {
      loadComplaint();
      loadNotes();
      loadDocuments();
    }
  }, [id]);

  const loadComplaint = async () => {
    if (!id) return;
    try {
      setLoading(true);
      console.log('Loading complaint with ID:', id);
      const data = await complaintsService.getComplaintById(id);
      console.log('Complaint loaded:', data);
      console.log('Complaint ID fields:', { id: data.id, _id: data._id, complaintId: (data as any).complaintId });
      setComplaint(data);
      
      // Load saved research data
      const savedResearch = researchUtils.loadSavedResearch(data);
      if (savedResearch) {
        setResearchData(savedResearch);
        console.log('Loaded saved research data');
      }
      
      // Note: Executives are now loaded fresh from database when "Find Officers" is clicked
      // We don't load saved officers anymore - always fetch from DB
      
      // Load saved letter
      const savedLetter = draftLetterUtils.loadSavedLetter(data);
      if (savedLetter) {
        setLetter(savedLetter);
        setEditableLetterBody(savedLetter.body || '');
        console.log('Loaded saved letter');
      }
      
      // Load saved actions from AI resolution steps
      const savedActions = actionsUtils.loadSavedActions(data);
      if (savedActions.length > 0) {
        setActions(savedActions);
        console.log('Loaded saved actions from AI resolution steps');
      }
    } catch (error: any) {
      console.error('Error loading complaint:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.message || 'Failed to load complaint');
      // Don't navigate away immediately, show error first
      setTimeout(() => {
        navigate('/admin/complaints');
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
      setNewNote('');
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
      const fileInput = document.getElementById('document-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
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
      const executivesData = await draftLetterUtils.findOfficers(id);
      setExecutives(executivesData);
      // Default select the 0th index executive
      setSelectedExecutiveIndex(0);
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setStage1Loading(false);
    }
  };

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
      setEditableLetterBody(letterData?.body || letterData?.letter?.body || '');
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setStage2Loading(false);
    }
  };

  const handleSaveLetter = async () => {
    if (!id || !letter) return;
    try {
      const updatedLetter = await draftLetterUtils.saveLetter(id, letter, editableLetterBody);
      setLetter(updatedLetter);
    } catch (error: any) {
      // Error already handled in utility function
    }
  };

  const handleGenerateActions = async () => {
    if (!id) return;
    try {
      setStage3Loading(true);
      const actionsData = await actionsUtils.generateActions(id);
      setActions(actionsData);
      setActiveTab('actions');
      
      // TODO: Save actions to backend (convert to AIResolutionStep or save to complaint)
      // For now, actions are only stored in component state
      // Backend doesn't automatically save actions - they need to be converted to AIResolutionStep
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setStage3Loading(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail;
      case 'phone_call':
        return Phone;
      case 'whatsapp_message':
        return MessageSquare;
      case 'proposal':
        return FileText;
      case 'notice':
        return Bell;
      case 'meeting':
        return Users;
      case 'fieldwork':
        return MapPin;
      default:
        return Settings;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'text-blue-600';
      case 'phone_call':
        return 'text-green-600';
      case 'whatsapp_message':
        return 'text-teal-600';
      case 'proposal':
        return 'text-purple-600';
      case 'notice':
        return 'text-orange-600';
      case 'meeting':
        return 'text-indigo-600';
      case 'fieldwork':
        return 'text-cyan-600';
      default:
        return 'text-gray-600';
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
      navigate('/admin/complaints');
    } catch (error: any) {
      // Error already handled in utility function
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'destructive' as const, icon: Clock, label: 'Pending' },
      'in-progress': { variant: 'default' as const, icon: AlertCircle, label: 'In Progress' },
      in_progress: { variant: 'default' as const, icon: AlertCircle, label: 'In Progress' },
      resolved: { variant: 'default' as const, icon: CheckCircle, label: 'Resolved' },
      rejected: { variant: 'secondary' as const, icon: XCircle, label: 'Rejected' },
    };
    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { variant: 'secondary' as const, label: 'Low' },
      medium: { variant: 'default' as const, label: 'Medium' },
      high: { variant: 'destructive' as const, label: 'High' },
      urgent: { variant: 'destructive' as const, label: 'Urgent' },
    };
    const priorityConfig = config[priority as keyof typeof config] || config.medium;
    return <Badge variant={priorityConfig.variant}>{priorityConfig.label}</Badge>;
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
        <Button onClick={() => navigate('/admin/complaints')} className="mt-4">
          Back to Complaints
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 p-6 border-b border-gray-300">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/admin/complaints')}
                className="text-gray-700 hover:bg-gray-300 mt-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{complaint.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300">
                    <span className="text-xs font-mono">{complaint.id || complaint._id || 'N/A'}</span>
                  </Badge>
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
                <SelectTrigger className="w-36 bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300">
                  <SelectValue className="text-gray-800" />
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
                <SelectTrigger className="w-32 bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300">
                  <SelectValue className="text-gray-800" />
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
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">
            <Eye className="w-4 h-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="w-4 h-4 mr-2" />
            Notes & Docs
          </TabsTrigger>
          <TabsTrigger value="research">
            <Search className="w-4 h-4 mr-2" />
            Research
          </TabsTrigger>
          <TabsTrigger value="draft">
            <Edit className="w-4 h-4 mr-2" />
            Draft Letter
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Settings className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Main Complaint Information Card */}
          <Card className="border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-b border-gray-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-300 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900">Complaint Information</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete details and metadata
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Description Section */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Description
                  </Label>
                </div>
                <p className="text-foreground leading-relaxed pl-8">{complaint.description}</p>
              </div>

              {/* Category & Classification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-500 rounded-lg">
                        <Settings className="w-4 h-4 text-white" />
                      </div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Category
                      </Label>
                    </div>
                    <p className="text-base font-semibold text-foreground capitalize pl-8">
                      {complaint.category}
                    </p>
                    {complaint.subCategory && (
                      <p className="text-sm text-muted-foreground pl-8 mt-1">
                        {complaint.subCategory}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-purple-500 rounded-lg">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Submitted Date
                      </Label>
                    </div>
                    <p className="text-base font-semibold text-foreground pl-8">
                      {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground pl-8 mt-1">
                      {new Date(complaint.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-orange-200">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                        Submitted By
                      </Label>
                      <p className="text-sm font-semibold text-foreground">{complaint.contactName}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-orange-200">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                        Phone
                      </Label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{complaint.contactPhone}</p>
                      </div>
                    </div>
                    {complaint.contactEmail && (
                      <div className="p-3 bg-white rounded-lg border border-orange-200">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                          Email
                        </Label>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-primary" />
                          <p className="text-sm font-semibold text-foreground">{complaint.contactEmail}</p>
                        </div>
                      </div>
                    )}
                    {complaint.voterId && (
                      <div className="p-3 bg-white rounded-lg border border-orange-200">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                          Voter ID
                        </Label>
                        <p className="text-sm font-semibold text-foreground">{complaint.voterId}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location Information */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-base">Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {typeof complaint.location === 'string' ? (
                    <div className="p-4 bg-white rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-foreground">{complaint.location}</p>
                    </div>
                  ) : complaint.location ? (
                    <div className="space-y-3">
                      {complaint.location.address && (
                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                            Address
                          </Label>
                          <p className="text-sm font-medium text-foreground">{complaint.location.address}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {complaint.location.city && (
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
                            <p className="text-sm font-semibold text-foreground">{complaint.location.city}</p>
                          </div>
                        )}
                        {complaint.location.state && (
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <Label className="text-xs text-muted-foreground mb-1 block">State</Label>
                            <p className="text-sm font-semibold text-foreground">{complaint.location.state}</p>
                          </div>
                        )}
                        {complaint.location.pincode && (
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <Label className="text-xs text-muted-foreground mb-1 block">Pincode</Label>
                            <p className="text-sm font-semibold text-foreground">{complaint.location.pincode}</p>
                          </div>
                        )}
                        {(complaint.location.latitude && complaint.location.longitude) && (
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <Label className="text-xs text-muted-foreground mb-1 block">Coordinates</Label>
                            <p className="text-xs font-semibold text-foreground">
                              {complaint.location.latitude.toFixed(6)}, {complaint.location.longitude.toFixed(6)}
                            </p>
                          </div>
                        )}
                      </div>
                      {(complaint.location.latitude && complaint.location.longitude) && (
                        <a
                          href={`https://www.google.com/maps?q=${complaint.location.latitude},${complaint.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm font-medium">View on Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-lg border border-blue-200">
                      <p className="text-sm text-muted-foreground">No location information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attachments Section */}
              {complaint.documents && complaint.documents.length > 0 && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500 rounded-lg">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <CardTitle className="text-base">Attachments</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {complaint.documents.length} {complaint.documents.length === 1 ? 'file' : 'files'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {complaint.documents.map((doc, index) => {
                        const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.fileUrl?.toLowerCase().includes('.pdf');
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileName || '');
                        
                        return (
                          <a
                            key={index}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 bg-white rounded-xl border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                isPdf ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                {isPdf ? (
                                  <FileText className="w-5 h-5 text-red-600" />
                                ) : isImage ? (
                                  <FileText className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-gray-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                  {doc.fileName}
                                </p>
                                {doc.fileType && (
                                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                                    {doc.fileType}
                                  </Badge>
                                )}
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
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
                <Label htmlFor="note" className="text-sm font-semibold">Note Content</Label>
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
                      Note must be at least 5 characters ({newNote.trim().length}/5)
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
                disabled={isAddingNote || !newNote.trim() || newNote.trim().length < 5}
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
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
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
                      <div key={note._id || (note as any).id} className="relative pl-12">
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
                                {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Invalid Date'}
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">No notes yet</p>
                  <p className="text-xs text-muted-foreground">Start adding notes to track updates and communications</p>
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
                  <Select value={newDocumentType} onValueChange={(v: any) => setNewDocumentType(v)}>
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
                      onChange={(e) => setNewDocumentFile(e.target.files?.[0] || null)}
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
                      <p className="text-sm font-medium text-green-900">{newDocumentFile.name}</p>
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
                    {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => {
                    const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.fileUrl?.toLowerCase().includes('.pdf');
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileName || '');
                    
                    return (
                      <div
                        key={doc._id}
                        className="group relative bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            isPdf ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
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
                              <p className="text-sm font-semibold truncate mb-1">{doc.fileName}</p>
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
                                  doc.fileType === 'inward' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-green-50 text-green-700 border-green-200'
                                }`}
                              >
                                {doc.fileType}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl, '_blank')}
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">No documents yet</p>
                  <p className="text-xs text-muted-foreground">Upload documents to track related files</p>
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
                    <CardTitle className="text-2xl text-white">AI Research & Analysis</CardTitle>
                    <p className="text-sm text-orange-100 mt-1">
                      Comprehensive research on related issues and key facts
                    </p>
                  </div>
                </div>
                {researchData ? (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-white">Completed</span>
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
                    <p className="text-lg font-semibold text-foreground">Researching related issues...</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
                  </div>
                </div>
              ) : researchData ? (
                <div className="space-y-4">
                  <Accordion type="multiple" defaultValue={['similar-issues', 'budget-info', 'news-articles', 'key-facts']} className="w-full">
                    {/* Similar Issues */}
                    {researchData.similar_issues && researchData.similar_issues.length > 0 && (
                      <AccordionItem value="similar-issues" className="border border-orange-200 rounded-lg mb-4 overflow-hidden">
                        <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                              <Archive className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground">Similar Issues</p>
                              <p className="text-xs text-muted-foreground">
                                {researchData.similar_issues.length} related cases found
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {researchData.similar_issues.map((item: any, i: number) => (
                              <div 
                                key={i} 
                                className="p-4 bg-gradient-to-br from-white to-blue-50/30 border-l-4 border-blue-500 rounded-lg hover:shadow-md transition-all"
                              >
                                <p className="font-semibold text-foreground mb-2">{item.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                  <span className="font-medium">{item.source}</span>
                                  {item.date && (
                                    <>
                                      <span>•</span>
                                      <span>{item.date}</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Budget Info */}
                    {researchData.budget_info && (
                      <AccordionItem value="budget-info" className="border border-orange-200 rounded-lg mb-4 overflow-hidden">
                        <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground">Budget Information</p>
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
                                <span className="text-sm font-medium text-muted-foreground">Department</span>
                                <span className="text-sm font-semibold text-foreground">{researchData.budget_info.department}</span>
                              </div>
                              {researchData.budget_info.allocation && (
                                <div className="flex items-start justify-between pb-2 border-b border-green-200">
                                  <span className="text-sm font-medium text-muted-foreground">Allocation</span>
                                  <span className="text-sm font-semibold text-foreground">{researchData.budget_info.allocation}</span>
                                </div>
                              )}
                              {researchData.budget_info.source && (
                                <div className="flex items-start justify-between pb-2 border-b border-green-200">
                                  <span className="text-sm font-medium text-muted-foreground">Source</span>
                                  <span className="text-sm font-semibold text-foreground">{researchData.budget_info.source}</span>
                                </div>
                              )}
                              <div className="pt-2">
                                <p className="text-sm text-muted-foreground leading-relaxed">{researchData.budget_info.summary}</p>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* News Articles */}
                    {researchData.news_articles && researchData.news_articles.length > 0 && (
                      <AccordionItem value="news-articles" className="border border-orange-200 rounded-lg mb-4 overflow-hidden">
                        <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                              <Newspaper className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground">News Articles</p>
                              <p className="text-xs text-muted-foreground">
                                {researchData.news_articles.length} relevant articles
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {researchData.news_articles.map((item: any, i: number) => (
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
                                  <p className="font-semibold text-foreground mb-2">{item.title}</p>
                                )}
                                <p className="text-xs text-muted-foreground mb-2">{item.source}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Key Facts */}
                    {researchData.key_facts && researchData.key_facts.length > 0 && (
                      <AccordionItem value="key-facts" className="border border-orange-200 rounded-lg mb-4 overflow-hidden">
                        <AccordionTrigger className="px-4 py-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500 rounded-lg">
                              <Lightbulb className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-foreground">Key Facts for Letter</p>
                              <p className="text-xs text-muted-foreground">
                                {researchData.key_facts.length} important points
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-4">
                          <div className="p-4 bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-lg">
                            <div className="space-y-3">
                              {researchData.key_facts.map((fact: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-300 transition-colors">
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-bold">
                                    {i + 1}
                                  </div>
                                  <p className="text-sm text-foreground leading-relaxed flex-1">{fact}</p>
                                </div>
                              ))}
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
                            Research Depth: <span className="text-primary">{researchData.research_depth}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Key facts will be automatically included in the complaint letter.
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
                  <p className="text-lg font-semibold text-foreground mb-2">Ready to Research</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click "Start Research" to find related issues, news articles, and key facts
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                executives.length > 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
              }`}>
                {executives.length > 0 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <div className={`w-16 h-1 ${executives.length > 0 ? 'bg-gradient-to-r from-green-500 to-primary' : 'bg-gray-200'}`}></div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                letter ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg' : executives.length > 0 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {letter ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <div className={`w-16 h-1 ${letter ? 'bg-gradient-to-r from-green-500 to-primary' : executives.length > 0 ? 'bg-primary' : 'bg-gray-200'}`}></div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              actions ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg' : letter ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {actions ? <CheckCircle className="w-5 h-5" /> : '3'}
            </div>
          </div>

          {/* Stage 1: Find Officers */}
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">Stage 1: Find Officers</CardTitle>
                    <p className="text-sm text-blue-100 mt-1">
                      Identify relevant officers to address the complaint
                    </p>
                  </div>
                </div>
                {executives.length > 0 && (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-white">Completed</span>
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
                    <p className="text-lg font-semibold text-foreground">Searching for officers...</p>
                    <p className="text-sm text-muted-foreground mt-1">Finding the most relevant officials</p>
                  </div>
                </div>
              ) : executives.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <Label className="font-semibold text-lg text-foreground mb-4 block">
                      Select Executive to Address ({executives.length} available):
                    </Label>
                    <RadioGroup
                      value={selectedExecutiveIndex.toString()}
                      onValueChange={(value) => setSelectedExecutiveIndex(parseInt(value))}
                      className="space-y-3 max-h-96 overflow-y-auto"
                    >
                      {executives.map((exec, index) => (
                        <div key={index}>
                          <RadioGroupItem
                            value={index.toString()}
                            id={`executive-${index}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`executive-${index}`}
                            className="flex flex-col p-4 border-2 rounded-xl cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-primary/20 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-primary/5 peer-data-[state=checked]:to-orange-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base text-foreground mb-1">
                                  {exec.name || 'Unknown'}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground mb-2">
                                  {exec.designation} - {exec.district}
                                </div>
                                <div className="space-y-1.5 text-sm">
                                  {exec.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      <span className="truncate">{exec.email}</span>
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
                                      <span className="text-xs">{exec.office_address}</span>
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
                  <p className="text-lg font-semibold text-foreground mb-2">Ready to Find Officers</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click the button below to search for relevant officers
                  </p>
                  <Button 
                    onClick={handleFindOfficers} 
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Find Officers and Draft Letter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage 2: Draft Letter */}
          {executives.length > 0 && (
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">Stage 2: Draft Letter</CardTitle>
                      <p className="text-sm text-orange-100 mt-1">
                        AI-generated complaint letter for selected executive
                      </p>
                    </div>
                  </div>
                  {letter && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <CheckCircle className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">Drafted</span>
                    </div>
                  )}
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
                      <p className="text-lg font-semibold text-foreground">Drafting letter...</p>
                      <p className="text-sm text-muted-foreground mt-1">AI is generating the complaint letter</p>
                    </div>
                  </div>
                ) : letter ? (
                  <div className="space-y-6">
                    {/* Letter Header Info */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</Label>
                          <p className="text-sm font-semibold text-foreground mt-1">{letter.to || letter.letter?.to}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</Label>
                          <p className="text-sm font-semibold text-foreground mt-1">{letter.subject || letter.letter?.subject}</p>
                        </div>
                      </div>
                    </div>

                    {/* Letter Editor */}
                    <Card className="border-2 border-orange-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <Label className="text-base font-semibold">Letter Body</Label>
                        </div>
                        <div className="flex items-center gap-2">
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
                          onChange={(e) => setEditableLetterBody(e.target.value)}
                          className="min-h-[500px] font-serif text-base leading-relaxed resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                          placeholder="Letter body will appear here..."
                        />
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-orange-400" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">Ready to Draft Letter</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Click the button below to generate the complaint letter
                    </p>
                    <Button
                      onClick={handleDraftLetter}
                      disabled={stage2Loading}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {stage2Loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Drafting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Draft Letter to Selected Officer
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 3: Generate Actions */}
          {letter && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      actions
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    3
                  </div>
                  <CardTitle>Stage 3: Generate Action Plan</CardTitle>
                </div>
                {actions && <CheckCircle className="w-5 h-5 text-green-500" />}
              </CardHeader>
              <CardContent className="border-t">
                {stage3Loading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating action plan...</span>
                  </div>
                ) : actions ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Action plan generated. View in Actions tab.
                    </p>
                    <Button
                      onClick={() => setActiveTab('actions')}
                      className="w-full"
                      variant="outline"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Go to Actions
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateActions}
                    disabled={stage3Loading}
                    className="w-full"
                  >
                    {stage3Loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Proceed to Stage 3: Generate Actions'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    actions
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  3
                </div>
                <CardTitle>Stage 3: Action Plan</CardTitle>
              </div>
              {actions && <CheckCircle className="w-5 h-5 text-green-500" />}
            </CardHeader>
            <CardContent className="border-t">
              {actions && Array.isArray(actions) && actions.length > 0 ? (
                <div className="space-y-3">
                  {actions.map((action: any, index: number) => {
                    const ActionIcon = getActionIcon(action.type);
                    const iconColor = getActionColor(action.type);
                    return (
                      <Card key={index}>
                        <CardContent className="p-4 flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <ActionIcon className={`w-5 h-5 ${iconColor} mt-0.5`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold capitalize text-sm">
                                  {action.type?.replace('_', ' ')}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  Step {index + 1}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                To: {action.to}
                              </p>
                              <p className="text-sm text-foreground">{action.details}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Execute
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
                    onClick={() => setActiveTab('draft')}
                    variant="outline"
                    className="mt-4"
                  >
                    Go to Draft Letter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this complaint? This action cannot be undone.
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
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComplaintDetailPage;
