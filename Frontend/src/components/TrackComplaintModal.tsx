/**
 * Track Complaint Modal
 * Track complaints by phone number using backend API
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Ticket, Loader2, CheckCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { complaintsService } from '@/services/complaints.service';
import { Complaint } from '@/types';

interface TrackComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrackComplaintModal: React.FC<TrackComplaintModalProps> = ({ isOpen, onClose }) => {
  const [searchType, setSearchType] = useState<'phone'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Validate phone number (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      toast.error('Please enter a valid 10-digit phone number starting with 6-9');
      return;
    }

    setLoading(true);
    try {
      const results = await complaintsService.trackByPhone(phoneNumber.trim());
      setComplaints(results);
      
      if (results.length === 0) {
        toast.info('No complaints found for this phone number');
      } else {
        toast.success(`Found ${results.length} complaint(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to track complaints');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    switch (normalizedStatus) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Track Complaint Status</DialogTitle>
          <DialogDescription>
            Enter your phone number to view the status of your complaints
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Search Section */}
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Track by Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading}>
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
                <p className="text-xs text-muted-foreground">
                  Enter the phone number you used when filing the complaint
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {complaints.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Found {complaints.length} Complaint{complaints.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-4">
                {complaints.map((complaint) => (
                  <Card key={complaint._id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{complaint.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {complaint.location?.address || 'Location not specified'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(complaint.status)}>
                          {getStatusLabel(complaint.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-foreground line-clamp-2">
                          {complaint.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {complaint.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(complaint.createdAt)}
                          </span>
                        </div>
                        {complaint.status === 'resolved' && (
                          <div className="flex items-center gap-2 mt-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Resolved</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackComplaintModal;

