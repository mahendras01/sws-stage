import { revalidateTag, unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { log } from "./logger";

export const SITE_LOGO_TAG = "site-logo";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export type LogoMime = "image/png" | "image/jpeg" | "image/webp";

export type LogoMeta = {
  file_name: string;
  mime_type: LogoMime;
  size_bytes: number;
  updated_at: string;
  version: number;
};

export function canManageLogo(role?: string | null) {
  return role === "super_admin";
}

/** Detects the real image type from the file's leading bytes (the browser-supplied MIME type is not trusted). */
export function detectLogoMime(buffer: Buffer): LogoMime | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function toMeta(row: any): LogoMeta {
  const updatedAt = new Date(row.updated_at);
  return {
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    updated_at: updatedAt.toISOString(),
    version: updatedAt.getTime(),
  };
}

export async function getLogoMeta(): Promise<{ data: LogoMeta | null; error: any }> {
  const { data, error } = await supabase
    .from("site_logo")
    .select("file_name, mime_type, size_bytes, updated_at")
    .eq("id", 1)
    .maybeSingle();

  return { data: data ? toMeta(data) : null, error };
}

export async function getLogoFile() {
  const { data, error } = await supabase
    .from("site_logo")
    .select("data, mime_type, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return { file: null, error };
  }

  return {
    file: {
      buffer: Buffer.from(data.data),
      mimeType: data.mime_type as LogoMime,
      version: new Date(data.updated_at).getTime(),
    },
    error: null,
  };
}

export async function saveLogo(buffer: Buffer, mimeType: LogoMime, fileName: string, userId: string | null) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("site_logo").upsert(
    {
      id: 1,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: buffer.length,
      data: buffer,
      uploaded_by: userId,
      updated_at: now,
    },
    { onConflict: "id" },
  ).select("id");

  if (!error) revalidateTag(SITE_LOGO_TAG);
  return { error };
}

export async function deleteLogo() {
  const { error } = await supabase.from("site_logo").delete().eq("id", 1);
  if (!error) revalidateTag(SITE_LOGO_TAG);
  return { error };
}

const readCachedVersion = unstable_cache(
  async () => {
    const { data, error } = await getLogoMeta();
    // Throwing keeps failures out of the cache so the next request retries.
    if (error) throw new Error(error.message ?? "Failed to load logo");
    return data ? data.version : null;
  },
  ["site-logo-version"],
  { tags: [SITE_LOGO_TAG] },
);

/** Cache-busting version of the active logo, or null if none is set (or the database is unreachable). */
export async function getActiveLogoVersion(): Promise<number | null> {
  try {
    return await readCachedVersion();
  } catch (error) {
    log.warn("logo.version_lookup_failed", { error });
    return null;
  }
}
