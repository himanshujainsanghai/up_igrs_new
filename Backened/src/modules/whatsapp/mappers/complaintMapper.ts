import { CollectedComplaintData } from "../types";

/**
 * Maps WhatsApp-collected complaint data to Complaint.create payload.
 * All attachments (images + PDF/Word/Excel docs) are stored in images array.
 * Only used by WhatsApp module; sets created_via_whatsapp: true.
 */
export const mapToComplaintCreate = (data: CollectedComplaintData) => {
  const imageUrls = data.images?.map((img) => img.url) ?? [];
  const docUrls = data.documents?.map((doc) => doc.url) ?? [];
  const images = [...imageUrls, ...docUrls];

  return {
    title: data.title!,
    description: data.description!,
    category: data.category!,
    district_name: data.district_name!,
    subdistrict_name: data.subdistrict_name!,
    location: data.location || data.area,
    latitude: data.latitude!,
    longitude: data.longitude!,
    contact_name: data.contact_name!,
    contact_email: data.contact_email!,
    contact_phone: data.contact_phone,
    status: "pending",
    priority: "medium",
    images,
    created_via_whatsapp: true,
  };
};
