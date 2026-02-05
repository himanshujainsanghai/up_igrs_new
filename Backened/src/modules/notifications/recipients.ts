/**
 * NOTIFICATION MODULE - RECIPIENT RESOLUTION
 * Resolves which user ids (admins / officers) should receive a notification.
 * Complaint-isolated: we always work in context of complaint_id.
 */

import { User } from "../../models/User";
import { Complaint } from "../../models/Complaint";
import { ComplaintExtensionRequest } from "../../models/ComplaintExtensionRequest";
import Officer from "../../models/Officer";
import logger from "../../config/logger";

/** Resolve Officer MongoDB _id to User.id (UUID) for notification routing. */
export async function getOfficerUserId(
  officerId: string
): Promise<string | null> {
  if (!officerId) return null;
  try {
    const officer = await Officer.findById(officerId).select("userId").lean();
    if (!officer?.userId) return null;
    const user = await User.findById(officer.userId).select("id").lean();
    return user?.id ?? null;
  } catch (err) {
    logger.error("getOfficerUserId failed", { officerId, err });
    return null;
  }
}

/** All active admin user ids */
export async function getAllAdminUserIds(): Promise<string[]> {
  try {
    const admins = await User.find({ role: "admin", isActive: true })
      .select("id")
      .lean();
    return admins.map((u) => u.id).filter(Boolean);
  } catch (err) {
    logger.error("getAllAdminUserIds failed", err);
    return [];
  }
}

/** Assigned officer user id for a complaint (if any). Used for note_added, document_added. */
export async function getAssignedOfficerUserId(
  complaintId: string
): Promise<string | null> {
  try {
    const complaint = await Complaint.findOne({ id: complaintId })
      .select("assigned_to_user_id")
      .lean();
    return complaint?.assigned_to_user_id ?? null;
  } catch (err) {
    logger.error("getAssignedOfficerUserId failed", { complaintId, err });
    return null;
  }
}

/** Officer who requested extension (for extension_approved / extension_rejected). */
export async function getExtensionRequesterUserId(
  requestId: string
): Promise<string | null> {
  try {
    const req = await ComplaintExtensionRequest.findOne({ id: requestId })
      .select("requested_by")
      .lean();
    return req?.requested_by ?? null;
  } catch (err) {
    logger.error("getExtensionRequesterUserId failed", { requestId, err });
    return null;
  }
}
