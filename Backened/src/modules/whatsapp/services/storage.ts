import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_DOCUMENT_SIZE,
  MAX_IMAGE_SIZE,
  uploadToS3,
} from "../../../services/upload.service";
import { MediaDownloadResult } from "../types";

/** Normalize MIME type (e.g. image/jpg -> image/jpeg) so allowed-list check passes. */
function normalizeMimeType(mime: string): string {
  const normalized: Record<string, string> = {
    "image/jpg": "image/jpeg",
  };
  return normalized[mime] || mime;
}

/** Allowed for complaint attachments: images (jpg, jpeg, png) + docs (Word, PDF, Excel). */
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export const persistMedia = async (
  media: MediaDownloadResult,
  folder: string = "complaints"
): Promise<{ url: string; fileName: string }> => {
  const mimeType = normalizeMimeType(media.mimeType);
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported media type: ${media.mimeType}. Allowed: images (jpg, jpeg, png), Word, PDF, Excel.`
    );
  }
  if (media.fileSize > maxSize) {
    throw new Error(`File too large (max ${isImage ? "10MB" : "50MB"}).`);
  }

  const uploaded = await uploadToS3({
    file: media.buffer,
    fileName: media.fileName,
    mimeType,
    folder,
  });

  return { url: uploaded.url, fileName: uploaded.fileName };
};
