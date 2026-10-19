import { NextResponse } from "next/server";
import { queryRows } from "@/lib/postgres";
import { requireAuth } from "@/lib/auth";
import { createReceipt, getReceiptById, getReceiptByTransactionReference, getUserProfileById, getReceiptRecipientFilterOptions, getUserById, updateReceipt, deleteReceipt } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/pdf";
import { getLogoFile } from "@/lib/site-logo";
import { buildProfileAddress, computeFileHash, extractPaymentDocumentData, normalizeReceiptReference, normalizeReferenceValue, validateReceiptFile } from "@/lib/receipt-extraction";
import { findDuplicateTransactionNumber } from "@/lib/annual-maintenance";
import * as fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

export const dynamic = "force-dynamic";

async function generateReceiptNumber() {
  try {
    const rows = await queryRows<{ receipt_number: string }>("SELECT receipts_get_next_receipt_number()::text AS receipt_number");
    if (rows[0]?.receipt_number) {
      return rows[0].receipt_number;
    }
  } catch {
    // Fall through to the compatibility fallback below for older schemas.
  }

  try {
    const rows = await queryRows<{ nextval: string }>("SELECT nextval('receipts_txn_seq') AS nextval");
    const nextValue = rows[0]?.nextval ?? String(Date.now());
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `SWS-REC-${dateStamp}-${String(nextValue).padStart(6, "0")}`;
  } catch {
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `SWS-REC-${dateStamp}-${String(Date.now()).slice(-6).padStart(6, "0")}`;
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const session = auth.session;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "Receipt file is required." }, { status: 400 });
    }

    const transactionNumber = String(form.get("transactionNumber") ?? "").trim();
    const transactionId = String(form.get("transactionId") ?? "").trim();
    const utr = String(form.get("utr") ?? "").trim();
    const paymentProvider = String(form.get("paymentProvider") ?? "").trim();
    const transactionDate = String(form.get("transactionDate") ?? "").trim();
    const transactionTime = String(form.get("transactionTime") ?? "").trim();
    const payerName = String(form.get("payerName") ?? "").trim();
    const payeeName = String(form.get("payeeName") ?? "").trim();
    const amountRaw = form.get("amount");
    const amount = amountRaw !== null && amountRaw !== undefined ? Number(String(amountRaw).trim()) : NaN;
    const sahyogType = String(form.get("sahyogType") ?? "").trim() || "General";
    const district = String(form.get("district") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const paidToUserId = String(form.get("paidToUserId") ?? "").trim();

    const fileValidation = await validateReceiptFile(file, file.name || "receipt");
    if (!fileValidation.valid) {
      return NextResponse.json({ success: false, message: fileValidation.error || "Unsupported receipt file." }, { status: 400 });
    }

    const extracted = await extractPaymentDocumentData(file);
    const resolvedAmount = Number.isFinite(amount) && amount > 0 ? amount : extracted.amount ?? null;
    const resolvedTransactionId = normalizeReceiptReference(transactionId, extracted.transactionId) || null;
    const resolvedUtr = normalizeReceiptReference(utr, extracted.utr) || null;
    const resolvedReference = normalizeReceiptReference(transactionNumber, resolvedTransactionId, resolvedUtr) || null;
    const normalizedReference = normalizeReferenceValue(resolvedReference);
    const normalizedUtr = normalizeReferenceValue(resolvedUtr);
    const normalizedTransactionId = normalizeReferenceValue(resolvedTransactionId);
    const hasAmountConflict = extracted.amount !== null && Number.isFinite(resolvedAmount) && Math.abs(Number(extracted.amount) - Number(resolvedAmount)) > 0.01;
    const hasTransactionConflict = Boolean(extracted.transactionId && resolvedTransactionId && extracted.transactionId !== resolvedTransactionId);
    const needsManualReview = hasAmountConflict || hasTransactionConflict;
    const resolvedProvider = paymentProvider || extracted.paymentProvider || null;
    const resolvedDate = transactionDate || extracted.transactionDate || null;
    const resolvedTime = transactionTime || extracted.transactionTime || null;
    const resolvedPayerName = payerName || extracted.payerName || null;
    const resolvedPayeeName = payeeName || extracted.payeeName || null;

    if (!district || !location || !paidToUserId) {
      return NextResponse.json({ success: false, message: "Please select a district, location, and valid Paid To recipient." }, { status: 400 });
    }

    const { data: recipientOptions, error: recipientOptionsError } = await getReceiptRecipientFilterOptions({ district, location });
    if (recipientOptionsError) {
      return NextResponse.json({ success: false, message: "Unable to validate the selected Paid To recipient.", details: recipientOptionsError.message }, { status: 500 });
    }
    const selectedRecipient = recipientOptions?.users.find((user) => user.id === paidToUserId) ?? null;
    if (!selectedRecipient) {
      return NextResponse.json({ success: false, message: "The selected Paid To recipient is not eligible for the chosen district and location." }, { status: 400 });
    }

    const { data: recipientProfile, error: recipientProfileError } = await getUserById(paidToUserId);
    if (recipientProfileError || !recipientProfile) {
      return NextResponse.json({ success: false, message: "Selected Paid To recipient could not be verified." }, { status: 400 });
    }
    if (recipientProfile.status !== "approved" || recipientProfile.is_active === false || recipientProfile.district !== district || recipientProfile.village_city !== location) {
      return NextResponse.json({ success: false, message: "The selected Paid To recipient is not active or does not match the district and location selection." }, { status: 400 });
    }

    if (!resolvedReference) {
      return NextResponse.json({ success: false, message: "A transaction reference or transaction ID is required. Please upload a valid payment receipt or enter the reference manually." }, { status: 400 });
    }

    if (!resolvedAmount || resolvedAmount <= 0 || Number.isNaN(resolvedAmount)) {
      return NextResponse.json({ success: false, message: "Amount must be a valid positive INR value." }, { status: 400 });
    }

    if (resolvedDate && Number.isNaN(new Date(resolvedDate).getTime())) {
      return NextResponse.json({ success: false, message: "Transaction date is invalid." }, { status: 400 });
    }

    const duplicateValues = [normalizedReference, normalizedUtr, normalizedTransactionId].filter((value): value is string => Boolean(value));
    if (duplicateValues.length > 0) {
      const duplicateResult = await getReceiptByTransactionReference(duplicateValues[0]);
      if (duplicateResult.data) {
        return NextResponse.json({ success: false, message: "This UTR / Transaction Number has already been used. Please check your receipt." }, { status: 409 });
      }

      const globalDuplicate = await findDuplicateTransactionNumber(duplicateValues[0]);
      if (globalDuplicate.exists) {
        return NextResponse.json({ success: false, message: "This UTR / Transaction Number has already been used. Please check your receipt." }, { status: 409 });
      }
    }

    let receiptNumber: string;
    try {
      receiptNumber = await generateReceiptNumber();
    } catch (rnError: any) {
      return NextResponse.json({ success: false, message: "Failed to generate receipt number.", details: rnError?.message ?? null }, { status: 500 });
    }

    const safeFileName = `${crypto.randomUUID()}${path.extname(file.name || ".pdf") || ".pdf"}`;
    const evidenceDir = path.join(process.cwd(), "private", "receipts", "evidence");
    await fs.promises.mkdir(evidenceDir, { recursive: true });

    const evidencePath = path.join(evidenceDir, safeFileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileHash = computeFileHash(fileBuffer);

    const existingFileHashMatch = await queryRows<{ id: string }>(
      `SELECT id FROM receipts WHERE file_hash = $1
       UNION ALL
       SELECT id FROM annual_maintenance_payments WHERE file_hash = $1
       LIMIT 1`,
      [fileHash],
    );
    if (existingFileHashMatch.length > 0) {
      return NextResponse.json({ success: false, message: "This receipt image has already been uploaded. Please check the file and try a different copy." }, { status: 409 });
    }

    await fs.promises.writeFile(evidencePath, fileBuffer, { flag: "wx" });

    const relativeEvidencePath = path.relative(process.cwd(), evidencePath).split(path.sep).join("/");
    const uploaderProfile = await getUserProfileById(session.user.id);
    const paidByName = uploaderProfile.data?.name ?? session.user.name ?? null;
    const paidByDistrict = uploaderProfile.data?.district ?? session.user.district ?? null;

    const insertPayload: Record<string, unknown> = {
      receipt_number: receiptNumber,
      transaction_number: resolvedReference,
      user_id: session.user.id,
      paid_to_user_id: paidToUserId,
      paid_by_name: paidByName,
      paid_by_district: paidByDistrict,
      paid_to_name: recipientProfile.name,
      paid_to_district: recipientProfile.district ?? district,
      amount: Number(resolvedAmount),
      sahyog_type: sahyogType,
      uploaded_file_path: relativeEvidencePath,
      file_name: file.name || safeFileName,
      file_path: relativeEvidencePath,
      file_type: fileValidation.mimeType || file.type || "application/octet-stream",
      file_size_bytes: file.size,
      file_hash: fileHash,
      status: "uploaded",
      payment_provider: resolvedProvider,
      transaction_date: resolvedDate || null,
      transaction_time: resolvedTime || null,
      transaction_utr: resolvedUtr || null,
      extraction_status: extracted.extractionStatus,
      review_status: needsManualReview ? "needs_review" : extracted.extractionStatus === "complete" ? "reviewed" : "pending",
      extracted_metadata: {
        paymentProvider: resolvedProvider,
        transactionDate: resolvedDate,
        transactionTime: resolvedTime,
        amount: Number(resolvedAmount),
        transactionId: resolvedTransactionId,
        utr: resolvedUtr,
        payerName: resolvedPayerName,
        payeeName: resolvedPayeeName,
        warnings: extracted.warnings,
      },
      extracted_text: extracted.rawText.slice(0, 20000),
    };

    if (resolvedTransactionId) {
      insertPayload.transaction_id = resolvedTransactionId;
    }

    const { data, error } = await createReceipt(insertPayload);
    if (error) {
      try {
        await fs.promises.unlink(evidencePath);
      } catch {
        // ignore cleanup failures
      }

      if ((error as any)?.code === "23505" || /unique/.test(String((error as any)?.message ?? ""))) {
        return NextResponse.json({ success: false, message: "This UTR / Transaction Number has already been used. Please check your receipt." }, { status: 409 });
      }
      return NextResponse.json({ success: false, message: "Failed to save the receipt record.", details: (error as any)?.message ?? null }, { status: 500 });
    }

    const { data: profile } = await getUserProfileById(session.user.id);
    const profileAddress = buildProfileAddress({
      house_flat_no: profile?.house_flat_no ?? null,
      street_locality: profile?.street_locality ?? null,
      landmark: profile?.landmark ?? null,
      village_city: profile?.village_city ?? null,
      district: profile?.district ?? null,
      state: profile?.state ?? null,
      pincode: profile?.pincode ?? null,
      country: profile?.country ?? null,
    });

    const user = {
      name: profile?.name ?? session.user.name ?? null,
      phone_number: profile?.phone_number ?? null,
      email: profile?.email ?? session.user.email ?? null,
      address: profileAddress,
      paid_by_name: paidByName,
      paid_by_district: paidByDistrict,
      paid_to_name: recipientProfile.name,
      paid_to_district: recipientProfile.district ?? district,
    };

    const preferredLogoNames = [
      "Self Welfare Society Announcement Banner.png",
      "Self_Welfare_Society_Registration.jpg",
    ];
    const logoPath = preferredLogoNames
      .map((name) => path.join(process.cwd(), "public", "images", name))
      .find((candidate) => fs.existsSync(candidate)) ?? path.join(process.cwd(), "public", "images", "Self Welfare Society Announcement Banner.png");
    const { file: managedLogo } = await getLogoFile();
    const logoBuffer = managedLogo && managedLogo.mimeType !== "image/webp" ? managedLogo.buffer : undefined;

    try {
      const pdfRelativePath = await generateReceiptPdf({
        ...(data as any),
        receipt_number: receiptNumber,
        transaction_number: resolvedReference,
        transaction_id: resolvedTransactionId || (data as any)?.transaction_id,
        amount: Number(resolvedAmount),
        created_at: (data as any)?.created_at,
        id: (data as any)?.id,
        user_id: session.user.id,
        paid_by_name: paidByName,
        paid_by_district: paidByDistrict,
        paid_to_name: recipientProfile.name,
        paid_to_district: recipientProfile.district ?? district,
        sahyog_type: sahyogType,
      }, user as any, { logoPath, logoBuffer });

      const { data: updated, error: updateError } = await updateReceipt(String((data as any).id), { receipt_file_path: pdfRelativePath });
      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: "Receipt uploaded successfully.",
        receipt: updated ?? data,
        extracted,
        receipt_pdf: pdfRelativePath,
      });
    } catch (pdfError: any) {
      try {
        await deleteReceipt(String((data as any).id));
      } catch {
        // ignore cleanup errors
      }
      try {
        await fs.promises.unlink(evidencePath);
      } catch {
        // ignore cleanup errors
      }
      return NextResponse.json({ success: false, message: "Failed to generate the acknowledgement PDF.", details: pdfError?.message ?? null }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Internal server error.", details: error?.message ?? null }, { status: 500 });
  }
}
