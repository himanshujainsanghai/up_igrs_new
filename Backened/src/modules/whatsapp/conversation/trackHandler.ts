import { Complaint } from "../../../models/Complaint";

export interface TrackHandlerResult {
  replies: string[];
  /** True when we returned a status (found or not found); session can end. */
  resolved: boolean;
}

/**
 * Track handler: returns reply messages for tracking complaint status.
 * Does NOT send messages - caller (session manager) sends.
 * Used when intent is "track" (e.g. user chose 2 in intent capture).
 */
export async function getTrackingReplies(text: string | undefined): Promise<TrackHandlerResult> {
  if (!text || !text.trim()) {
    return {
      replies: ["Please send your complaint ID to track status (e.g. 31012026MLA002)."],
      resolved: false,
    };
  }
  const lower = text.trim().toLowerCase();
  if (!lower.includes("track")) {
    const idMatch = text.match(/([A-Z0-9]{6,})/i);
    if (idMatch) {
      const { reply, resolved } = await lookupComplaintStatus(idMatch[1]);
      return { replies: [reply], resolved };
    }
    return {
      replies: ["Please send your complaint ID to track status (e.g. 31012026MLA002)."],
      resolved: false,
    };
  }
  const idMatch = text.match(/([A-Z0-9]{6,})/i);
  if (!idMatch) {
    return {
      replies: ["Please provide your complaint ID to track (e.g. 31012026MLA002)."],
      resolved: false,
    };
  }
  const { reply, resolved } = await lookupComplaintStatus(idMatch[1]);
  return { replies: [reply], resolved };
}

async function lookupComplaintStatus(
  complaintId: string
): Promise<{ reply: string; resolved: boolean }> {
  const complaint = await Complaint.findOne({
    $or: [{ complaint_id: complaintId }, { id: complaintId }],
  })
    .select(
      "complaint_id status priority district_name subdistrict_name updated_at assigned_department assignedOfficer"
    )
    .lean();

  if (!complaint) {
    return {
      reply: "No complaint found for that ID. Please check and try again.",
      resolved: true,
    };
  }

  return {
    reply: `Status for ${complaint.complaint_id || complaintId}: ${complaint.status}. District: ${complaint.district_name}. Sub-district: ${complaint.subdistrict_name}. Priority: ${complaint.priority}. Last update: ${complaint.updated_at?.toISOString?.() || complaint.updated_at}`,
    resolved: true,
  };
}
