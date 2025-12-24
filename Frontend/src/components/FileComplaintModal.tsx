/**
 * File Complaint Modal
 * Submit a new complaint using backend API
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Upload,
  X,
  CheckCircle,
  Loader2,
  FileText,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { complaintsService } from '@/services/complaints.service';
import { uploadService } from '@/services/upload.service';
import { locationService } from '@/services/location.service';
import { COMPLAINT_CATEGORIES } from '@/lib/constants';
import { Complaint } from '@/types';

interface Attachment {
  file: File;
  preview: string;
}

interface FileComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCategory?: string;
}

const FileComplaintModal: React.FC<FileComplaintModalProps> = ({
  isOpen,
  onClose,
  preSelectedCategory,
}) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [complaintId, setComplaintId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    title: '',
    description: '',
    category: preSelectedCategory || '',
    subCategory: '',
    voterId: '',
    location: '',
    latitude: 0,
    longitude: 0,
    city: '',
    locality: '',
    pincode: '',
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Set pre-selected category when modal opens
  useEffect(() => {
    if (preSelectedCategory && isOpen) {
      setFormData((prev) => ({ ...prev, category: preSelectedCategory }));
    }
  }, [preSelectedCategory, isOpen]);

  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setDetectingLocation(true);
    toast.info('Detecting location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const result = await locationService.reverseGeocode({ latitude, longitude });
          
          // Extract address components
          const address = result.address || {};
          const formattedAddress = address.formatted_address || `${latitude}, ${longitude}`;
          const city = address.city || '';
          const locality = address.suburb || '';
          const pincode = address.postcode || '';
          
          setFormData((prev) => ({
            ...prev,
            location: formattedAddress,
            latitude,
            longitude,
            city,
            locality,
            pincode,
          }));
          
          toast.success('Location detected');
        } catch (error: any) {
          setFormData((prev) => ({
            ...prev,
            location: `${position.coords.latitude}, ${position.coords.longitude}`,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: '',
            locality: '',
            pincode: '',
          }));
          toast.success('Coordinates captured');
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        toast.error('Unable to detect location. Please enter manually.');
        setDetectingLocation(false);
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    const newAttachments: Attachment[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (index: number) => {
    const attachment = attachments[index];
    URL.revokeObjectURL(attachment.preview);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.contactName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.contactPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    setSubmitting(true);
    try {
      // Upload files first
      const documentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            // Use uploadDocument for PDFs, uploadImage for images
            const isPDF = attachment.file.type === 'application/pdf' || attachment.file.name.toLowerCase().endsWith('.pdf');
            const uploadResult = isPDF 
              ? await uploadService.uploadDocument(attachment.file)
              : await uploadService.uploadImage(attachment.file);
            documentUrls.push(uploadResult.url);
          } catch (error) {
            console.error('File upload error:', error);
            toast.error(`Failed to upload ${attachment.file.name}`);
          }
        }
      }

      // Create complaint
      // Note: complaintsService will transform to backend format (snake_case)
      // Build location string with address details
      let locationString = formData.location.trim();
      if (formData.city || formData.locality || formData.pincode) {
        const addressParts = [
          locationString,
          formData.locality ? `Locality: ${formData.locality}` : '',
          formData.city ? `City: ${formData.city}` : '',
          formData.pincode ? `Pincode: ${formData.pincode}` : '',
        ].filter(Boolean);
        locationString = addressParts.join(' | ');
      }

      const complaintData: any = {
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim() || `${formData.contactPhone.trim()}@temp.com`, // Backend requires email
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category as any,
        subCategory: formData.subCategory.trim() || undefined,
        voterId: formData.voterId.trim()?.toUpperCase() || undefined,
        location: locationString || '', // Backend expects string location (not object)
        documents: documentUrls.map(url => ({
          _id: '',
          complaintId: '',
          fileName: '',
          fileUrl: url,
          fileType: '',
          fileSize: 0,
          uploadedBy: '',
          createdAt: new Date().toISOString(),
        })),
      };

      const complaint = await complaintsService.createComplaint(complaintData);
      // Backend returns MongoDB document with _id field
      setComplaintId(complaint._id || (complaint as any).id || '');
      setStep('success');
      toast.success('Complaint submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormData({
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      title: '',
      description: '',
      category: preSelectedCategory || '',
      subCategory: '',
      voterId: '',
      location: '',
      latitude: 0,
      longitude: 0,
      city: '',
      locality: '',
      pincode: '',
    });
    attachments.forEach((att) => URL.revokeObjectURL(att.preview));
    setAttachments([]);
    setComplaintId('');
    onClose();
  };

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complaint Submitted</DialogTitle>
            <DialogDescription>
              Your complaint has been submitted successfully
            </DialogDescription>
          </DialogHeader>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Thank You!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your complaint has been registered. We'll review it and get back to you soon.
                  </p>
                  {complaintId && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      ID: {complaintId}
                    </p>
                  )}
                </div>
                <Button onClick={handleClose} className="w-full">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">File a New Complaint</DialogTitle>
          <DialogDescription>
            Provide details about your issue. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                }
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                }
                placeholder="10-digit phone number"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.contactEmail}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
              }
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-muted-foreground">
              If not provided, a temporary email will be generated
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Enter location or auto-detect"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoDetectLocation}
                disabled={detectingLocation}
                title="Auto-detect location from map"
              >
                {detectingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the map icon to automatically detect your location from GPS
            </p>
          </div>

          {/* Address Details (Auto-filled from map) */}
          {(formData.city || formData.locality || formData.pincode) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs font-medium text-muted-foreground">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  readOnly
                  className="bg-background"
                  placeholder="Auto-detected from map"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locality" className="text-xs font-medium text-muted-foreground">
                  Locality
                </Label>
                <Input
                  id="locality"
                  value={formData.locality}
                  readOnly
                  className="bg-background"
                  placeholder="Auto-detected from map"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode" className="text-xs font-medium text-muted-foreground">
                  Pincode
                </Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  readOnly
                  className="bg-background"
                  placeholder="Auto-detected from map"
                />
              </div>
            </div>
          )}

          {/* Complaint Details */}
          <div className="space-y-2">
            <Label htmlFor="title">Complaint Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Brief title of your complaint"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subCategory">Sub-Category (Optional)</Label>
              <Input
                id="subCategory"
                value={formData.subCategory}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subCategory: e.target.value }))
                }
                placeholder="Optional sub-category"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe your complaint in detail..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voterId">Voter ID (Optional)</Label>
            <Input
              id="voterId"
              value={formData.voterId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, voterId: e.target.value }))
              }
              placeholder="ABC1234567"
              maxLength={10}
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>Attachments (Photos/Documents)</Label>
            <div className="border-2 border-dashed border-orange-200 rounded-lg p-4">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </span>
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    {attachment.file.type.startsWith('image/') ? (
                      <img
                        src={attachment.preview}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-full h-24 border rounded flex items-center justify-center bg-muted">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Complaint'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FileComplaintModal;

