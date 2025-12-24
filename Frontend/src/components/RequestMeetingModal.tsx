/**
 * Request Meeting Modal
 * Request a meeting with admin/officer
 */

import React, { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { meetingsService } from '@/services/meetings.service';
import { locationService } from '@/services/location.service';
import { MeetingRequest } from '@/types';

interface RequestMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId?: string;
}

const RequestMeetingModal: React.FC<RequestMeetingModalProps> = ({
  isOpen,
  onClose,
  complaintId,
}) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    requestedDate: '',
    requestedTime: '',
    reason: '',
    subject: '',
    location: '',
  });

  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.info('Detecting location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const result = await locationService.reverseGeocode({
            latitude,
            longitude,
          });
          const address = result.address?.formatted_address || `${latitude}, ${longitude}`;
          setFormData((prev) => ({
            ...prev,
            location: address,
          }));
          toast.success('Location detected');
        } catch (error: any) {
          setFormData((prev) => ({
            ...prev,
            location: `${position.coords.latitude}, ${position.coords.longitude}`,
          }));
          toast.success('Coordinates captured');
        }
      },
      (error) => {
        toast.error('Unable to detect location. Please enter manually.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.reason || !formData.requestedDate || !formData.requestedTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const meetingRequest: MeetingRequest = {
        complaintId: complaintId || '',
        requestedDate: formData.requestedDate,
        requestedTime: formData.requestedTime,
        reason: formData.reason,
        // Additional fields will be transformed by service
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        location: formData.location,
      };

      await meetingsService.createMeeting(meetingRequest);
      setStep('success');
      toast.success('Meeting request submitted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit meeting request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormData({
      name: '',
      email: '',
      phone: '',
      requestedDate: '',
      requestedTime: '',
      reason: '',
      subject: '',
      location: '',
    });
    onClose();
  };

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Submitted</DialogTitle>
            <DialogDescription>
              Your meeting request has been submitted successfully
            </DialogDescription>
          </DialogHeader>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Meeting Request Submitted</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    We will review your request and get back to you soon.
                  </p>
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Request a Meeting</DialogTitle>
          <DialogDescription>
            Schedule a meeting to discuss your complaint
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="10-digit phone number"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Meeting Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Brief subject of the meeting"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Preferred Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="date"
                type="date"
                value={formData.requestedDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, requestedDate: e.target.value }))
                }
                className="pl-10"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Preferred Time *</Label>
            <Input
              id="time"
              type="time"
              value={formData.requestedTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, requestedTime: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Meeting location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoDetectLocation}
                title="Auto-detect location"
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Meeting *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need this meeting..."
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={4}
              required
            />
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
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestMeetingModal;

