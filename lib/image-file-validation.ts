export const ACCEPTED_QR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/jpg", "image/pjpeg", "image/x-png"]);
export const MAX_QR_BYTES = 2 * 1024 * 1024;

function normalizeMimeType(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  switch (normalized) {
    case "image/jpg":
    case "image/pjpeg":
      return "image/jpeg";
    case "image/x-png":
      return "image/png";
    default:
      return normalized;
  }
}

export function inferImageMimeFromSignature(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }

  return null;
}

export async function detectImageMimeType(file: Blob): Promise<string | null> {
  const sliced = file.slice(0, 12);
  const buffer = new Uint8Array(await sliced.arrayBuffer());
  const fromSignature = inferImageMimeFromSignature(buffer);
  if (fromSignature) {
    return fromSignature;
  }

  const fromType = normalizeMimeType(file.type);
  return fromType && ACCEPTED_QR_TYPES.has(fromType) ? fromType : null;
}

export function resolveImageExtensionForMime(mimeType: string | null): string {
  switch (normalizeMimeType(mimeType) ?? "") {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/jpeg":
    default:
      return ".jpg";
  }
}

export async function validateQrImageFile(file: File | Blob): Promise<{ valid: boolean; mimeType: string | null; error: string | null }> {
  if (!(file instanceof Blob) || typeof file.size !== "number") {
    return { valid: false, mimeType: null, error: "QR code image could not be loaded. Please upload a valid PNG, JPG, JPEG, or WebP file." };
  }

  if (file.size <= 0) {
    return { valid: false, mimeType: null, error: "QR code image is empty. Please upload a valid PNG, JPG, JPEG, or WebP file." };
  }

  if (file.size > MAX_QR_BYTES) {
    return { valid: false, mimeType: null, error: "QR code is too large. Maximum size is 2 MB." };
  }

  const detectedMime = await detectImageMimeType(file);
  if (!detectedMime) {
    return { valid: false, mimeType: null, error: "QR code image could not be loaded. Please upload a valid PNG, JPG, JPEG, or WebP file." };
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const validDecode = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      if (!validDecode) {
        return { valid: false, mimeType: detectedMime, error: "The selected image could not be decoded as a valid QR code image." };
      }
    } catch {
      return { valid: false, mimeType: detectedMime, error: "The selected image could not be decoded. Please upload a valid PNG, JPG, JPEG, or WebP file." };
    }
  }

  return { valid: true, mimeType: detectedMime, error: null };
}
