import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canManageAnnualMaintenance, getAnnualMaintenanceSettings, upsertAnnualMaintenanceSettings, validateAnnualMaintenanceSettings } from "@/lib/annual-maintenance";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ACCEPTED_QR_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_QR_BYTES = 2 * 1024 * 1024;

function toText(value: FormDataEntryValue | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQrPublicUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("annual-maintenance/")) return `/${trimmed}`;
  return `/${trimmed.replace(/^\/+/, "")}`;
}

async function saveQrImage(file: File | null, existingQrUrl?: string | null) {
  if (!file || !(file instanceof File)) {
    return normalizeQrPublicUrl(existingQrUrl) ?? null;
  }

  const fileType = file.type?.toLowerCase();
  if (!ACCEPTED_QR_TYPES.has(fileType)) {
    throw new Error("QR code must be a PNG, JPG, JPEG, or WebP image.");
  }

  if (file.size > MAX_QR_BYTES) {
    throw new Error("QR code is too large. Maximum size is 2MB.");
  }

  const uploadDir = path.join(process.cwd(), "public", "annual-maintenance");
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const cleanName = `${Date.now()}-${String(file.name || "qr-code").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const finalPath = path.join(uploadDir, cleanName);
  await fs.promises.writeFile(finalPath, Buffer.from(await file.arrayBuffer()));

  const normalizedExistingUrl = normalizeQrPublicUrl(existingQrUrl);
  if (normalizedExistingUrl && normalizedExistingUrl.startsWith("/annual-maintenance/")) {
    const oldFilePath = path.join(process.cwd(), "public", normalizedExistingUrl.replace(/^\/+/, ""));
    try {
      await fs.promises.unlink(oldFilePath);
    } catch {
      // ignore stale file cleanup
    }
  }

  return `/annual-maintenance/${cleanName}`;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!canManageAnnualMaintenance(auth.session.user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await getAnnualMaintenanceSettings();
  if (error) {
    return NextResponse.json({ success: false, message: "Failed to load settings", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, settings: data ?? null });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!canManageAnnualMaintenance(auth.session.user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  let formData: FormData | null = null;
  let payload: Record<string, any> = {};

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      formData = await request.formData();
      payload = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, value]));
    } else {
      payload = await request.json().catch(() => ({}));
    }
  } catch {
    payload = {};
  }

  const file = formData?.get("qr_code") as File | null;
  const remainingPayload = {
    fee_amount: formData ? toText(formData.get("fee_amount")) : payload.fee_amount,
    qr_code_url: formData ? toText(formData.get("qr_code_url")) : payload.qr_code_url,
    upi_id: formData ? toText(formData.get("upi_id")) : payload.upi_id,
    account_holder_name: formData ? toText(formData.get("account_holder_name")) : payload.account_holder_name,
    bank_name: formData ? toText(formData.get("bank_name")) : payload.bank_name,
    account_number: formData ? toText(formData.get("account_number")) : payload.account_number,
    ifsc_code: formData ? toText(formData.get("ifsc_code")) : payload.ifsc_code,
    branch_name: formData ? toText(formData.get("branch_name")) : payload.branch_name,
    notes: formData ? toText(formData.get("notes")) : payload.notes,
    is_active: formData ? String(formData.get("is_active") ?? "true") === "true" : Boolean(payload.is_active ?? true),
  };

  const validationMessage = validateAnnualMaintenanceSettings(remainingPayload);
  if (validationMessage) {
    return NextResponse.json({ success: false, message: validationMessage }, { status: 400 });
  }

  try {
    const qrCodeUrl = await saveQrImage(file, remainingPayload.qr_code_url || null);
    const normalizedPayload = {
      ...remainingPayload,
      fee_amount: remainingPayload.fee_amount === "" || remainingPayload.fee_amount === null || remainingPayload.fee_amount === undefined ? null : Number(remainingPayload.fee_amount),
      qr_code_url: qrCodeUrl,
      account_number: remainingPayload.account_number || null,
      ifsc_code: remainingPayload.ifsc_code ? remainingPayload.ifsc_code.toUpperCase() : null,
      upi_id: remainingPayload.upi_id || null,
    };

    const { data, error } = await upsertAnnualMaintenanceSettings(auth.session.user.id, normalizedPayload);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to save settings" }, { status: 400 });
  }
}
