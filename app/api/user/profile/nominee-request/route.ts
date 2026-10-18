import fs from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createNomineeEditRequest, getUserPendingNomineeRequest } from "@/lib/db";

const MAX_NOTE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]);

function normalizeNomineeValue(value: FormDataEntryValue | null | undefined) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

function detectAllowedAttachment(file: File) {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
  const isImage = [".jpg", ".jpeg", ".png", ".webp"].some((ext) => fileName.endsWith(ext));
  const allowed = isPdf || isImage || ALLOWED_MIME_TYPES.has(mimeType);

  return allowed;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const reason = String(formData.get("reason") ?? "").trim();
  const noteFile = formData.get("handwritten_note");
  const nomineeName = normalizeNomineeValue(formData.get("nominee_name"));
  const nomineeRelationship = normalizeNomineeValue(formData.get("nominee_relationship"));
  const nomineeMobileNumber = normalizeNomineeValue(formData.get("nominee_mobile_number"));
  const nomineeAadharNumber = normalizeNomineeValue(formData.get("nominee_aadhar_number"));
  const nominee2Relationship = normalizeNomineeValue(formData.get("nominee2_relationship"));
  const nominee2MobileNumber = normalizeNomineeValue(formData.get("nominee2_mobile_number"));

  if (!reason) {
    return NextResponse.json({ success: false, message: "Reason for nominee change is required." }, { status: 400 });
  }

  if (!(noteFile instanceof File) || noteFile.size === 0) {
    return NextResponse.json({ success: false, message: "A handwritten note upload is required." }, { status: 400 });
  }

  if (noteFile.size > MAX_NOTE_BYTES) {
    return NextResponse.json({ success: false, message: "The supporting document is too large. Maximum size is 5 MB." }, { status: 400 });
  }

  if (!detectAllowedAttachment(noteFile)) {
    return NextResponse.json({ success: false, message: "Unsupported file type. Please upload a PDF, JPG, JPEG, PNG, or WebP file." }, { status: 400 });
  }

  const existingPendingRequest = await getUserPendingNomineeRequest(session.user.id);
  if (existingPendingRequest.data) {
    return NextResponse.json({ success: false, message: "A pending nominee change request already exists for this user." }, { status: 409 });
  }

  const hasNomineeProposedChanges = [nomineeName, nomineeRelationship, nomineeMobileNumber, nomineeAadharNumber, nominee2Relationship, nominee2MobileNumber].some((value) => value !== null);
  if (!hasNomineeProposedChanges) {
    return NextResponse.json({ success: false, message: "Please provide at least one nominee change to submit." }, { status: 400 });
  }

  const safeFileName = noteFile.name
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80) || `nominee-note-${Date.now()}.pdf`;

  const storageDir = path.join(process.cwd(), "private", "nominee-change-requests", session.user.id);
  await fs.mkdir(storageDir, { recursive: true });

  const filePath = path.join(storageDir, `${Date.now()}-${safeFileName}`);
  await fs.writeFile(filePath, Buffer.from(await noteFile.arrayBuffer()));

  const relativePath = path.relative(process.cwd(), filePath);
  const { data, error } = await createNomineeEditRequest(session.user.id, {
    reason,
    notePath: relativePath,
    noteFileName: safeFileName,
    noteMimeType: noteFile.type || "application/octet-stream",
    noteSizeBytes: noteFile.size,
    nomineeName,
    nomineeRelationship,
    nomineeMobileNumber,
    nomineeAadharNumber,
    nominee2Relationship,
    nominee2MobileNumber,
  });

  if (error || !data) {
    return NextResponse.json({ success: false, message: "Unable to save nominee change request." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Nominee change request submitted successfully. It is pending admin review.",
    request: data,
  });
}
