/**
 * Request Meeting Page
 * Request a meeting with admin/officer
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  MapPin, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  FileText,
  User,
  Mail,
  Phone,
  Clock,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { meetingsService } from '@/services/meetings.service';
import { locationService } from '@/services/location.service';
import { MeetingRequest } from '@/types';

const RequestMeeting: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const complaintId = searchParams.get('complaintId') || '';

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    reason?: string;
  }>({});
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

    setDetectingLocation(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});

    // Validate required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.reason || !formData.requestedDate || !formData.requestedTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate reason/description (min 20 characters)
    if (formData.reason.trim().length < 20) {
      setFormErrors({
        reason: 'Reason for meeting must be at least 20 characters',
      });
      toast.error('Reason for meeting must be at least 20 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Convert time from HH:MM to HH:MM:SS format
      const timeInHHMMSS = formData.requestedTime
        ? `${formData.requestedTime}:00`
        : '';

      const meetingRequest: MeetingRequest = {
        complaintId: complaintId || '',
        requestedDate: formData.requestedDate,
        requestedTime: timeInHHMMSS,
        reason: formData.reason.trim(),
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
      // Handle validation errors from backend
      if (error.response?.data?.error?.details) {
        const errorDetails = error.response.data.error.details;
        if (errorDetails.includes('preferred_time')) {
          toast.error('Invalid time format. Please select a valid time.');
        } else if (errorDetails.includes('purpose') || errorDetails.includes('20')) {
          setFormErrors({
            reason: 'Reason for meeting must be at least 20 characters',
          });
          toast.error('Reason for meeting must be at least 20 characters');
        } else {
          toast.error(errorDetails || error.message || 'Failed to submit meeting request');
        }
      } else {
        toast.error(error.message || 'Failed to submit meeting request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setFormErrors({});
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
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-4 md:py-6">
        <div className="container mx-auto max-w-6xl px-4">
          <Card className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold mb-1">Meeting Request Submitted</h1>
                  <p className="text-green-100 text-xs md:text-sm">
                    We will review your request and get back to you soon.
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="p-4 md:p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-base text-gray-700">
                    Your meeting request has been received successfully.
                  </p>
                  <p className="text-sm text-gray-600">
                    We'll contact you on your registered email and phone number.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={() => navigate('/')} 
                    variant="outline" 
                    className="flex-1 border-gray-300 hover:bg-gray-50 h-11 text-sm font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                  <Button 
                    onClick={handleReset} 
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Request Another Meeting
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-4 md:py-6">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header Section with Gradient */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 md:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Calendar className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold mb-1">Request a Meeting</h1>
                  <p className="text-orange-100 text-xs md:text-sm">
                    Schedule a meeting to discuss your complaint
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/20 hidden md:flex"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <CardContent className="p-4 md:p-6">
            {/* Mobile Back Button */}
            <div className="md:hidden mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="text-gray-700 hover:bg-orange-100 hover:text-orange-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Personal Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                      Your Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Enter your full name"
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-orange-600" />
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="your.email@example.com"
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-600" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="10-digit phone number"
                      maxLength={10}
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Meeting Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Meeting Details</h2>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-orange-600" />
                    Meeting Subject <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    placeholder="Brief subject of the meeting"
                    className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-600" />
                      Preferred Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.requestedDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requestedDate: e.target.value }))
                      }
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="time" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-600" />
                      Preferred Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.requestedTime}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requestedTime: e.target.value }))
                      }
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    Location (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      placeholder="Meeting location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, location: e.target.value }))
                      }
                      className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 flex-1 h-10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAutoDetectLocation}
                      disabled={detectingLocation}
                      title="Auto-detect location"
                      className="border-gray-300 hover:bg-orange-50 hover:border-orange-300 h-10 px-3"
                    >
                      {detectingLocation ? (
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-orange-600" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Click the map icon to automatically detect your location from GPS.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                    Reason for Meeting <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Please explain why you need this meeting (minimum 20 characters)..."
                    value={formData.reason}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        reason: value,
                      }));
                      // Clear error when user starts typing
                      if (formErrors.reason && value.trim().length >= 20) {
                        setFormErrors({});
                      }
                    }}
                    rows={5}
                    className={`bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 resize-none ${
                      formErrors.reason
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : ''
                    }`}
                    required
                  />
                  <div className="flex items-center justify-between">
                    {formErrors.reason ? (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <span className="text-red-500">⚠</span>
                        {formErrors.reason}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Minimum 20 characters required
                      </p>
                    )}
                    <p
                      className={`text-xs ${
                        formData.reason.trim().length < 20
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formData.reason.trim().length}/20 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-orange-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/')} 
                  className="flex-1 border-gray-300 hover:bg-gray-50 h-11 text-sm font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestMeeting;
