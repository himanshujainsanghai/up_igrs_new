/**
 * Feedback Page
 * Submit feedback about the service
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Loader2, 
  MessageSquare, 
  ArrowLeft,
  User,
  Mail,
  ThumbsUp,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { feedbackService } from '@/services/feedback.service';

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const complaintId = searchParams.get('complaintId') || '';

  const [step, setStep] = useState<'form' | 'success'>('form');
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
        complaintId: complaintId || undefined,
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

  const handleReset = () => {
    setStep('form');
    setComment('');
    setFeedbackType('issue');
    setIsAnonymous(false);
    setUserName('');
    setUserEmail('');
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
                  <h1 className="text-xl md:text-2xl font-bold mb-1">Thank You!</h1>
                  <p className="text-green-100 text-xs md:text-sm">
                    Your feedback helps us improve our services.
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
                    We appreciate your valuable feedback.
                  </p>
                  <p className="text-sm text-gray-600">
                    Your input helps us serve you better.
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
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Submit More Feedback
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
                  <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold mb-1">Share Your Feedback</h1>
                  <p className="text-orange-100 text-xs md:text-sm">
                    Help us improve by sharing your thoughts and suggestions
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
              {/* Feedback Type Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Feedback Type <span className="text-red-500">*</span></h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={feedbackType === 'suggestion' ? 'default' : 'outline'}
                    onClick={() => setFeedbackType('suggestion')}
                    className={`h-12 text-sm font-semibold ${
                      feedbackType === 'suggestion' 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0' 
                        : 'border-gray-300 hover:bg-orange-50'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Suggestion
                  </Button>
                  <Button
                    type="button"
                    variant={feedbackType === 'praise' ? 'default' : 'outline'}
                    onClick={() => setFeedbackType('praise')}
                    className={`h-12 text-sm font-semibold ${
                      feedbackType === 'praise' 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0' 
                        : 'border-gray-300 hover:bg-orange-50'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Praise
                  </Button>
                  <Button
                    type="button"
                    variant={feedbackType === 'issue' ? 'default' : 'outline'}
                    onClick={() => setFeedbackType('issue')}
                    className={`h-12 text-sm font-semibold ${
                      feedbackType === 'issue' 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0' 
                        : 'border-gray-300 hover:bg-orange-50'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Issue
                  </Button>
                </div>
              </div>

              {/* Feedback Content Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Your Feedback</h2>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="comment" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                    Feedback <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder="Please share your thoughts, suggestions, or concerns (minimum 10 characters)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={5}
                    minLength={10}
                    className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {comment.length}/5000 characters (minimum 10 required)
                  </p>
                </div>
              </div>

              {/* Anonymous Option */}
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <Label htmlFor="anonymous" className="cursor-pointer text-sm text-gray-700">
                  Submit anonymously
                </Label>
              </div>

              {/* User Info (if not anonymous) */}
              {!isAnonymous && (
                <div className="space-y-4 pt-2 border-t border-orange-200">
                  <div className="flex items-center gap-2 pb-2">
                    <div className="p-1.5 bg-orange-100 rounded-lg">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-800">Contact Information (Optional)</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="feedback-name" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-orange-600" />
                        Your Name
                      </Label>
                      <Input
                        id="feedback-name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter your name"
                        className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="feedback-email" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-orange-600" />
                        Your Email
                      </Label>
                      <Input
                        id="feedback-email"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="bg-gray-50 border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-10"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={submitting || comment.trim().length < 10} 
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Submit Feedback
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

export default Feedback;
