/**
 * Complaint Timeline Component
 * Shows the progress of a complaint through its lifecycle
 */

import React from "react";
import { Complaint } from "@/types";
import {
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
  id: number;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  date?: string;
}

interface ComplaintTimelineProps {
  complaint: Complaint | any; // Allow any to handle backend snake_case fields
  variant?: "compact" | "detailed";
  className?: string;
}

const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({
  complaint,
  variant = "detailed",
  className,
}) => {
  // Handle both camelCase and snake_case field names from backend
  const draftedLetter =
    (complaint as any).drafted_letter ||
    complaint.drafted_letter ||
    (complaint as any).draftedLetter;
  const closingDetails =
    (complaint as any).closingDetails ||
    (complaint as any).closing_details ||
    complaint.closingDetails;
  const isOfficerAssigned =
    (complaint as any).isOfficerAssigned !== undefined
      ? (complaint as any).isOfficerAssigned
      : (complaint as any).is_officer_assigned !== undefined
      ? (complaint as any).is_officer_assigned
      : complaint.isOfficerAssigned;
  const isExtended =
    (complaint as any).isExtended !== undefined
      ? (complaint as any).isExtended
      : (complaint as any).is_extended !== undefined
      ? (complaint as any).is_extended
      : complaint.isExtended;
  const officerRemarks =
    closingDetails?.remarks ||
    (complaint as any).officerRemarks ||
    (complaint as any).officer_remarks ||
    complaint.officerRemarks;
  const isClosed =
    (complaint as any).isComplaintClosed !== undefined
      ? (complaint as any).isComplaintClosed
      : (complaint as any).is_closed !== undefined
      ? (complaint as any).is_closed
      : (complaint as any).isClosed !== undefined
      ? (complaint as any).isClosed
      : complaint.isComplaintClosed !== undefined
      ? complaint.isComplaintClosed
      : closingDetails?.closedAt
      ? true
      : complaint.isClosed;
  const createdAt =
    (complaint as any).created_at ||
    (complaint as any).createdAt ||
    complaint.createdAt;
  const assignedTime =
    (complaint as any).assignedTime ||
    (complaint as any).assigned_time ||
    complaint.assignedTime;
  const closingTime =
    closingDetails?.closedAt ||
    (closingDetails as any)?.closed_at ||
    (complaint as any).closingTime ||
    (complaint as any).closing_time ||
    complaint.closingTime;

  // Calculate timeline steps
  const steps: TimelineStep[] = [
    {
      id: 1,
      label: "Complaint Filed",
      description: "Complaint submitted by complainant",
      icon: CheckCircle2,
      completed: !!createdAt,
      date: createdAt,
    },
    {
      id: 2,
      label: "Draft Letter",
      description: "Letter drafted for relevant officers",
      icon: FileText,
      completed: !!draftedLetter,
      date: draftedLetter?.date,
    },
    {
      id: 3,
      label: "Officer Assigned",
      description: "Complaint assigned to officer",
      icon: UserCheck,
      completed: !!isOfficerAssigned,
      date: assignedTime,
    },
    {
      id: 4,
      label: "Officer Action",
      description: isExtended
        ? "Time boundary extended"
        : officerRemarks
        ? "Officer remarks added"
        : "Officer action taken",
      icon: MessageSquare,
      completed: !!isExtended || !!officerRemarks,
      date: officerRemarks ? undefined : undefined, // Could add timestamp if available
    },
    {
      id: 5,
      label: "Complaint Closed",
      description: "Complaint resolution completed",
      icon: CheckCircle,
      completed: !!isClosed,
      date: closingTime,
    },
  ];

  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Progress</span>
          <span className="font-medium">
            {completedSteps}/{totalSteps} steps
          </span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-primary to-green-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {/* Compact Step Indicators */}
        <div className="flex items-center justify-between gap-1 mt-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="flex flex-col items-center flex-1"
                title={step.label}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    step.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  <Icon className="w-3 h-3" />
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 text-center leading-tight",
                    step.completed
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Detailed variant - Horizontal Layout
  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Complaint Timeline
          </h3>
          <p className="text-sm text-muted-foreground">
            Track the progress of this complaint
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {completedSteps}/{totalSteps}
          </div>
          <div className="text-xs text-muted-foreground">Steps Completed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-primary to-green-500 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Horizontal Timeline Steps */}
      <div className="relative py-6">
        {/* Horizontal Timeline Line */}
        <div className="absolute top-10 left-0 right-0 h-0.5 bg-gray-200 hidden md:block" />

        {/* Steps Container */}
        <div className="relative flex flex-col md:flex-row items-start md:items-start justify-between gap-4 md:gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            const isCompleted = step.completed;
            const isActive = isCompleted || index === completedSteps;

            return (
              <div
                key={step.id}
                className="relative flex flex-row md:flex-col items-start md:items-center flex-1 md:max-w-[200px] gap-3 md:gap-0"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all md:mb-3 flex-shrink-0",
                    isCompleted
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                      : isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Connecting Line (between steps) - Only on desktop */}
                {!isLast && (
                  <div
                    className={cn(
                      "hidden md:block absolute top-10 left-[50%] w-full h-0.5",
                      isCompleted
                        ? "bg-green-500"
                        : isActive && index < completedSteps
                        ? "bg-primary"
                        : "bg-gray-200"
                    )}
                    style={{ width: "calc(100% - 40px)", marginLeft: "40px" }}
                  />
                )}

                {/* Content */}
                <div className="flex flex-col items-start md:items-center text-left md:text-center space-y-1 w-full">
                  <h4
                    className={cn(
                      "font-semibold text-sm",
                      isCompleted
                        ? "text-green-700 dark:text-green-400"
                        : isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </h4>
                  {step.description && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {step.description}
                    </p>
                  )}
                  {step.date && isCompleted && (
                    <div className="flex flex-col items-start md:items-center gap-0.5 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.date).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(step.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  {!isCompleted && (
                    <Clock className="w-3 h-3 text-gray-400 mt-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComplaintTimeline;
