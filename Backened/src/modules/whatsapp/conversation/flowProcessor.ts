import logger from "../../../config/logger";
import { Complaint } from "../../../models/Complaint";
import { mapToComplaintCreate } from "../mappers/complaintMapper";
import { templates } from "./templates";
import { validateComplaintData } from "../validators/complaintValidator";
import { CollectedComplaintData, FlowSubmissionPayload } from "../types";
import * as complaintTimeline from "../../../services/complaintTimeline.service";

export const processFlowSubmission = async (payload: FlowSubmissionPayload) => {
  const validation = validateComplaintData(payload.data);
  if (!validation.success) {
    const issues = validation.error.errors.map((e) => e.message).join("; ");
    logger.warn(`Flow submission invalid: ${issues}`);
    return {
      ok: false,
      message: `Some answers are missing/invalid: ${issues}`,
    };
  }

  const toCreate = mapToComplaintCreate(
    validation.data as CollectedComplaintData,
  );
  const doc = await Complaint.create(toCreate);
  try {
    await complaintTimeline.appendComplaintCreated(
      doc.id,
      { title: doc.title, category: doc.category },
      { role: "citizen" }
    );
  } catch (err) {
    logger.warn("Timeline appendComplaintCreated failed (flow):", err);
  }
  const message = templates.submitted(doc.complaint_id || doc.id);
  return { ok: true, complaint_id: doc.complaint_id || doc.id, message };
};
