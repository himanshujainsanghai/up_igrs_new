/**
 * Utility Functions for Complaint Detail Page
 * Organized by tab functionality
 */

import { toast } from "sonner";
import { complaintsService } from "@/services/complaints.service";
import { aiService } from "@/services/ai.service";
import { uploadService } from "@/services/upload.service";

// ============================================================================
// NOTES & DOCUMENTS TAB UTILITIES
// ============================================================================

export const notesUtils = {
  /**
   * Add a note to complaint
   */
  async addNote(complaintId: string, noteContent: string): Promise<any> {
    // Validate note length
    if (!noteContent || noteContent.trim().length < 5) {
      throw new Error("Note must be at least 5 characters");
    }

    try {
      const note = await complaintsService.addNote(
        complaintId,
        noteContent.trim(),
      );
      toast.success("Note added successfully");
      return note;
    } catch (error: any) {
      toast.error(error.message || "Failed to add note");
      throw error;
    }
  },

  /**
   * Load notes for complaint
   */
  async loadNotes(complaintId: string): Promise<any[]> {
    try {
      const notes = await complaintsService.getNotes(complaintId);
      return notes;
    } catch (error: any) {
      console.error("Failed to load notes:", error);
      toast.error("Failed to load notes");
      return [];
    }
  },
};

export const documentsUtils = {
  /**
   * Upload and add document to complaint
   */
  async addDocument(
    complaintId: string,
    file: File,
    documentType: "inward" | "outward",
  ): Promise<any> {
    // Validate file
    if (!file) {
      throw new Error("Please select a file");
    }

    // Validate document type
    if (!["inward", "outward"].includes(documentType)) {
      throw new Error('Document type must be "inward" or "outward"');
    }

    try {
      // Step 1: Upload file (presigned S3 or fallback to backend)
      const fileUrl = await uploadService.uploadFile(file);
      if (!fileUrl) {
        throw new Error("Upload did not return a file URL");
      }

      // Step 2: Add document record to complaint
      const document = await complaintsService.addDocument(complaintId, {
        fileName: file.name,
        fileUrl: fileUrl,
        fileType: documentType,
        fileSize: file.size,
      });

      toast.success("Document uploaded successfully");
      return document;
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to upload document";
      toast.error(message);
      throw error;
    }
  },

  /**
   * Load documents for complaint
   */
  async loadDocuments(complaintId: string): Promise<any[]> {
    try {
      const documents = await complaintsService.getDocuments(complaintId);
      return documents;
    } catch (error: any) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
      return [];
    }
  },
};

// ============================================================================
// RESEARCH TAB UTILITIES
// ============================================================================

export const researchUtils = {
  /**
   * Perform research on complaint
   */
  async performResearch(
    complaintId: string,
    depth: "basic" | "detailed" | "comprehensive" = "detailed",
  ): Promise<any> {
    try {
      const response = await aiService.researchRelatedIssues(complaintId);
      // Backend returns { research: ResearchResponse } and auto-saves
      const research = response?.research || response;
      toast.success("Research completed successfully");
      return research;
    } catch (error: any) {
      toast.error(error.message || "Failed to perform research");
      throw error;
    }
  },

  /**
   * Load saved research data from complaint
   */
  loadSavedResearch(complaint: any): any | null {
    if (complaint?.research_data) {
      return complaint.research_data;
    }
    return null;
  },
};

// ============================================================================
// DRAFT LETTER TAB UTILITIES
// ============================================================================

export const draftLetterUtils = {
  /**
   * Find executives (executive authorities) for complaint
   * Fetches executives from all districts and flattens them into a single array
   */
  async findOfficers(complaintId: string): Promise<any[]> {
    try {
      const executivesData = await complaintsService.getExecutives();

      // Flatten executives from all districts into a single array
      const flattenedExecutives: any[] = [];

      executivesData.forEach((districtData: any) => {
        const district = districtData.district;
        const districtName =
          district?.districtName ||
          districtData.district_profile?.name ||
          "Unknown District";

        // Add general administration executives
        if (districtData.executive_authorities?.general_administration) {
          districtData.executive_authorities.general_administration.forEach(
            (exec: any) => {
              flattenedExecutives.push({
                ...exec,
                district: districtName,
                category: "general_administration",
                // Transform to match expected officer format
                name: exec.name || "",
                designation: exec.designation || "",
                email: exec.contact?.email || "",
                phone:
                  exec.contact?.office_phone || exec.contact?.cug_mobile || "",
                office_address: exec.contact?.address || "",
                role: exec.role || "",
              });
            },
          );
        }

        // Add police administration executives
        if (districtData.executive_authorities?.police_administration) {
          districtData.executive_authorities.police_administration.forEach(
            (exec: any) => {
              flattenedExecutives.push({
                ...exec,
                district: districtName,
                category: "police_administration",
                // Transform to match expected officer format
                name: exec.name || "",
                designation: exec.designation || "",
                email: exec.contact?.email || "",
                phone:
                  exec.contact?.office_phone || exec.contact?.cug_mobile || "",
                office_address: exec.contact?.address || "",
                role: exec.role || "",
              });
            },
          );
        }
      });

      toast.success(`Found ${flattenedExecutives.length} executives`);
      return flattenedExecutives;
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch executives");
      throw error;
    }
  },

  /**
   * Draft letter for complaint
   * Now accepts selectedExecutive to use for drafting
   */
  async draftLetter(
    complaintId: string,
    selectedExecutive?: any,
  ): Promise<any> {
    try {
      // Transform executive to match expected officer format
      const officerFormat = selectedExecutive
        ? {
            name: selectedExecutive.name || "",
            designation: selectedExecutive.designation || "",
            email: selectedExecutive.email || "",
            phone: selectedExecutive.phone || "",
            office_address: selectedExecutive.office_address || "",
          }
        : undefined;

      // Save selected executive as primary_officer for persistence
      if (officerFormat) {
        await complaintsService.updateComplaintStage1Data(complaintId, {
          primary_officer: officerFormat,
        });
      }

      // Pass selected executive directly to API
      const response = await aiService.draftComplaintLetter(
        complaintId,
        officerFormat,
      );
      // Backend returns ComplaintLetterResponse and auto-saves
      const letterData = response?.letter || response;
      toast.success("Letter drafted successfully");
      return letterData;
    } catch (error: any) {
      toast.error(error.message || "Failed to draft letter");
      throw error;
    }
  },

  /**
   * Save edited letter
   */
  async saveLetter(
    complaintId: string,
    letter: any,
    editedBody: string,
  ): Promise<any> {
    try {
      const updatedLetter = {
        ...letter,
        body: editedBody,
      };

      await complaintsService.updateComplaintStage1Data(complaintId, {
        drafted_letter: updatedLetter,
      });

      toast.success("Letter saved successfully");
      return updatedLetter;
    } catch (error: any) {
      toast.error(error.message || "Failed to save letter");
      throw error;
    }
  },

  /**
   * Load saved executives from complaint
   * Returns the saved primary_officer if exists (for backward compatibility)
   */
  loadSavedOfficers(complaint: any): any | null {
    // For backward compatibility, if we have saved primary_officer, return it
    // But we'll fetch fresh executives from API instead
    return null; // Always fetch fresh executives
  },

  /**
   * Load saved letter from complaint
   */
  loadSavedLetter(complaint: any): any | null {
    if (complaint?.drafted_letter) {
      return complaint.drafted_letter;
    }
    return null;
  },

  /**
   * Build letter "to" line from officer (template, no AI)
   * Format: सेवा में,\n[Name]\n[Designation]\n[district/office]
   */
  buildLetterToFromOfficer(officer: {
    name?: string;
    designation?: string;
    office_address?: string;
    district?: string;
  }): string {
    const parts: string[] = ["सेवा में"];
    if (officer.name) parts.push(officer.name.trim());
    if (officer.designation) parts.push(officer.designation.trim());
    const location = officer.office_address || officer.district || "";
    if (location) parts.push(location.trim());
    return parts.join("\n");
  },

  /**
   * Update recipient only: selected_officer + drafted_letter.to (no AI redraft)
   */
  async updateRecipient(
    complaintId: string,
    letter: any,
    officer: {
      name?: string;
      designation?: string;
      email?: string;
      phone?: string;
      office_address?: string;
      district?: string;
    },
  ): Promise<{ selected_officer: any; letter: any }> {
    try {
      const officerFormat = {
        name: officer.name || "",
        designation: officer.designation || "",
        email: officer.email || "",
        phone: officer.phone || "",
        office_address: officer.office_address || "",
      };
      const newTo = draftLetterUtils.buildLetterToFromOfficer(officer);
      const updatedLetter = { ...letter, to: newTo };

      await complaintsService.updateComplaintStage1Data(complaintId, {
        selected_officer: officerFormat,
        drafted_letter: updatedLetter,
      });

      toast.success("Recipient updated successfully");
      return { selected_officer: officerFormat, letter: updatedLetter };
    } catch (error: any) {
      toast.error(error.message || "Failed to update recipient");
      throw error;
    }
  },
};

// ============================================================================
// ACTIONS TAB UTILITIES
// ============================================================================

export const actionsUtils = {
  /**
   * Generate actions for complaint
   */
  async generateActions(complaintId: string): Promise<any> {
    try {
      const response = await aiService.generateComplaintActions(complaintId);
      // Backend returns ComplaintActionsResponse { actions: ComplaintAction[] }
      const actionsData = response?.actions || response;
      toast.success("Action plan generated successfully");
      return actionsData;
    } catch (error: any) {
      toast.error(error.message || "Failed to generate actions");
      throw error;
    }
  },

  /**
   * Load saved actions from AI resolution steps
   */
  loadSavedActions(complaint: any): any[] {
    if (
      complaint?.aiResolution?.steps &&
      complaint.aiResolution.steps.length > 0
    ) {
      return complaint.aiResolution.steps.map((step: any) => ({
        type: step.action_type || "email",
        to: step.action_details?.recipient || step.title,
        details: step.description,
      }));
    }
    return [];
  },

  /**
   * Send email with drafted letter
   */
  async sendEmail(complaintId: string, recipientEmail?: string): Promise<any> {
    try {
      const result = await complaintsService.sendComplaintEmail(
        complaintId,
        recipientEmail,
      );
      toast.success("Email sent successfully");
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
      throw error;
    }
  },
};

// ============================================================================
// DETAILS TAB UTILITIES
// ============================================================================

export const detailsUtils = {
  /**
   * Update complaint status
   */
  async updateStatus(complaintId: string, newStatus: string): Promise<any> {
    try {
      const updated = await complaintsService.updateComplaint(complaintId, {
        status: newStatus as any,
      });
      toast.success("Status updated successfully");
      return updated;
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
      throw error;
    }
  },

  /**
   * Update complaint priority
   */
  async updatePriority(complaintId: string, newPriority: string): Promise<any> {
    try {
      const updated = await complaintsService.updateComplaint(complaintId, {
        priority: newPriority as any,
      });
      toast.success("Priority updated successfully");
      return updated;
    } catch (error: any) {
      toast.error(error.message || "Failed to update priority");
      throw error;
    }
  },

  /**
   * Delete complaint
   */
  async deleteComplaint(complaintId: string): Promise<void> {
    try {
      await complaintsService.deleteComplaint(complaintId);
      toast.success("Complaint deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete complaint");
      throw error;
    }
  },
};
