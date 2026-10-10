import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { MAX_LOGO_BYTES, canManageLogo, deleteLogo, detectLogoMime, getLogoMeta, saveLogo } from "@/lib/site-logo";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!canManageLogo(auth.session.user.role)) {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { session: auth.session };
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await getLogoMeta();
  if (error) {
    log.error("admin.logo.load_failed", { ...getRequestMeta(request), error });
    return NextResponse.json({ success: false, message: "Failed to load logo" }, { status: 500 });
  }

  return NextResponse.json({ success: true, logo: data, maxBytes: MAX_LOGO_BYTES });
}

/** Upload a new logo or replace the existing one. Expects multipart/form-data with a `logo` file. */
export async function PUT(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("logo");
  } catch {
    return NextResponse.json({ success: false, message: "Invalid upload." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, message: "Please choose a logo image." }, { status: 400 });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ success: false, message: "Logo is too large. Maximum size is 2 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectLogoMime(buffer);
  if (!mimeType) {
    return NextResponse.json({ success: false, message: "Logo must be a PNG, JPG or WebP image." }, { status: 400 });
  }

  const fileName = String(file.name || "logo").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 200);
  const { error } = await saveLogo(buffer, mimeType, fileName, auth.session.user.id);
  if (error) {
    log.error("admin.logo.save_failed", { ...getRequestMeta(request), error });
    return NextResponse.json({ success: false, message: "Failed to save logo." }, { status: 500 });
  }

  log.info("admin.logo.saved", { ...getRequestMeta(request), adminId: auth.session.user.id, mimeType, sizeBytes: buffer.length });
  const { data } = await getLogoMeta();
  return NextResponse.json({ success: true, logo: data });
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { error } = await deleteLogo();
  if (error) {
    log.error("admin.logo.delete_failed", { ...getRequestMeta(request), error });
    return NextResponse.json({ success: false, message: "Failed to delete logo." }, { status: 500 });
  }

  log.info("admin.logo.deleted", { ...getRequestMeta(request), adminId: auth.session.user.id });
  return NextResponse.json({ success: true });
}
