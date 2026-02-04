import { z } from "zod";
import { CollectedComplaintData, WhatsAppCategory } from "../types";

const complaintSchema = z
  .object({
    contact_name: z.string().trim().min(2).max(100),
    contact_email: z.string().trim().toLowerCase().email(),
    contact_phone: z
      .string()
      .trim()
      .min(10, "Phone must be at least 10 digits")
      .max(15, "Phone cannot exceed 15 digits")
      .refine(
        (val) => {
          const digits = val.replace(/\D/g, "");
          if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
          if (digits.length === 12 && digits.startsWith("91"))
            return /^91[6-9]\d{9}$/.test(digits);
          return false;
        },
        {
          message:
            "Phone must be 10 digits starting with 6, 7, 8, or 9 (or +91 followed by 10 digits)",
        }
      ),
    title: z.string().trim().min(5).max(255),
    description: z.string().trim().min(20).max(5000),
    category: z.enum([
      "roads",
      "water",
      "electricity",
      "documents",
      "health",
      "education",
    ]),
    district_name: z.string().trim().min(2).max(100),
    subdistrict_name: z.string().trim().min(2).max(100),
    area: z.string().trim().min(2).max(200),
    location: z.string().trim().max(500).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    images: z
      .array(
        z.object({
          url: z.string().url(),
          fileName: z.string().optional(),
          mimeType: z.string().optional(),
        })
      )
      .optional(),
    documents: z
      .array(
        z.object({
          url: z.string().url(),
          fileName: z.string().optional(),
          mimeType: z.string().optional(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.latitude === undefined) !== (data.longitude === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both latitude and longitude are required together.",
        path: ["latitude"],
      });
    }
  });

export const validateComplaintData = (data: CollectedComplaintData) => {
  return complaintSchema.safeParse(data);
};
