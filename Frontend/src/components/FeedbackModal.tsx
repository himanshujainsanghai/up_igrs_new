/**
 * Feedback Modal
 * Submit feedback about the service
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
import { Star, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { feedbackService } from '@/services/feedback.service';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  complaintId,
}) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'praise' | 'issue'>('issue');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      toast.error('Please provide your feedback');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Feedback must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.createFeedback({
        complaintId,
        comment: comment.trim(),
        category: feedbackType,
        userName: isAnonymous ? undefined : (userName.trim() || undefined),
        userEmail: isAnonymous ? undefined : (userEmail.trim() || undefined),
      });
      
      setStep('success');
      toast.success('Thank you for your feedback!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setRating(0);
    setComment('');
    setFeedbackType('issue');
    setIsAnonymous(false);
    setUserName('');
    setUserEmail('');
    setHoveredRating(0);
    onClose();
  };

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback Submitted</DialogTitle>
            <DialogDescription>
              Thank you for taking the time to share your feedback
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
                    Your feedback helps us improve our services.
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
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts and suggestions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>Feedback Type *</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={feedbackType === 'suggestion' ? 'default' : 'outline'}
                onClick={() => setFeedbackType('suggestion')}
                className="text-xs"
              >
                Suggestion
              </Button>
              <Button
                type="button"
                variant={feedbackType === 'praise' ? 'default' : 'outline'}
                onClick={() => setFeedbackType('praise')}
                className="text-xs"
              >
                Praise
              </Button>
              <Button
                type="button"
                variant={feedbackType === 'issue' ? 'default' : 'outline'}
                onClick={() => setFeedbackType('issue')}
                className="text-xs"
              >
                Issue
              </Button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Feedback *</Label>
            <Textarea
              id="comment"
              placeholder="Please share your thoughts, suggestions, or concerns (minimum 10 characters)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              minLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/5000 characters (minimum 10 required)
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="anonymous" className="cursor-pointer">
              Submit anonymously
            </Label>
          </div>

          {/* User Info (if not anonymous) */}
          {!isAnonymous && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-name">Your Name (Optional)</Label>
                <Input
                  id="feedback-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-email">Your Email (Optional)</Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || comment.trim().length < 10} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;

