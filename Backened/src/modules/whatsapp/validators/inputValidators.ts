/**
 * Input validators for WhatsApp complaint flow.
 * Aligned with Complaint model: contact_name, contact_email, title, etc.
 */

/** Name: only English letters and spaces, 2–100 chars (Complaint.contact_name). */
export function validateContactName(text: string): {
  ok: boolean;
  error?: string;
} {
  const trimmed = text.trim();
  if (trimmed.length < 2)
    return { ok: false, error: "Name must be at least 2 characters." };
  if (trimmed.length > 100)
    return { ok: false, error: "Name cannot exceed 100 characters." };
  // Only English letters (a-z, A-Z) and spaces; no numbers or special characters
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    return {
      ok: false,
      error:
        "Please enter a valid name (only English letters and spaces, no numbers or special characters).",
    };
  }
  return { ok: true };
}

/** Email: valid format (Complaint.contact_email). */
export function validateEmail(text: string): { ok: boolean; error?: string } {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required." };
  // Same pattern as Complaint model: /^\S+@\S+\.\S+$/
  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    return {
      ok: false,
      error: "Please enter a valid email address (e.g. name@example.com).",
    };
  }
  return { ok: true };
}

/** Title: 5–255 chars (Complaint.title). */
export function validateTitle(text: string): { ok: boolean; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length < 5)
    return { ok: false, error: "Title must be at least 5 characters." };
  if (trimmed.length > 255)
    return { ok: false, error: "Title cannot exceed 255 characters." };
  return { ok: true };
}

/** District or subdistrict name: 2–100 chars (Complaint.district_name / subdistrict_name). */
export function validateDistrictOrSubdistrict(text: string): {
  ok: boolean;
  error?: string;
} {
  const trimmed = text.trim();
  if (trimmed.length < 2)
    return { ok: false, error: "Must be at least 2 characters." };
  if (trimmed.length > 100)
    return { ok: false, error: "Cannot exceed 100 characters." };
  return { ok: true };
}

/** Area/locality: 2–200 chars (complaintValidator.area). */
export function validateArea(text: string): { ok: boolean; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length < 2)
    return { ok: false, error: "Area must be at least 2 characters." };
  if (trimmed.length > 200)
    return { ok: false, error: "Area cannot exceed 200 characters." };
  return { ok: true };
}

/** Latitude: number in [-90, 90] (Complaint.latitude). */
export function validateLatitude(value: number): {
  ok: boolean;
  error?: string;
} {
  if (Number.isNaN(value))
    return {
      ok: false,
      error: "Please provide a numeric latitude (e.g. 28.6139).",
    };
  if (value < -90 || value > 90)
    return { ok: false, error: "Latitude must be between -90 and 90." };
  return { ok: true };
}

/** Longitude: number in [-180, 180] (Complaint.longitude). */
export function validateLongitude(value: number): {
  ok: boolean;
  error?: string;
} {
  if (Number.isNaN(value))
    return {
      ok: false,
      error: "Please provide a numeric longitude (e.g. 77.2090).",
    };
  if (value < -180 || value > 180)
    return { ok: false, error: "Longitude must be between -180 and 180." };
  return { ok: true };
}

/** Indian mobile: exactly 10 digits, must start with 6, 7, 8, or 9. */
export function validateIndianMobile(text: string): {
  ok: boolean;
  error?: string;
  /** Normalized 10-digit number (digits only). */
  normalized?: string;
} {
  const digits = text.trim().replace(/\D/g, "");
  if (digits.length !== 10) {
    return {
      ok: false,
      error: "Phone number must be exactly 10 digits.",
    };
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      ok: false,
      error: "Phone number must start with 6, 7, 8, or 9.",
    };
  }
  return { ok: true, normalized: digits };
}

/** Phone: required; Indian 10-digit (6–9 start) or use sender's number (Complaint.contact_phone). */
export function validateContactPhone(text: string): {
  ok: boolean;
  error?: string;
  normalized?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Phone number is required." };
  return validateIndianMobile(trimmed);
}
