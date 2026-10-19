import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAnnualMaintenancePayment, getAnnualMaintenanceSettings, updateAnnualMaintenancePayment, generateAnnualMaintenanceReceipt, buildAnnualMaintenanceReceiptNumber, findDuplicateTransactionNumber, getAnnualMaintenancePaymentByTransaction, ensureAnnualMaintenanceReceiptRecord, annualMaintenanceSupportsFileHashColumn } from "@/lib/annual-maintenance";
import { getUserProfileById } from "@/lib/db";
import { queryRows } from "@/lib/postgres";
import { computeFileHash, normalizeReferenceValue } from "@/lib/receipt-extraction";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DUPLICATE_PAYMENT_MESSAGE = "This UTR / Transaction Number has already been used. Please check your receipt.";

export async function GET() {
  const { data, error } = await getAnnualMaintenanceSettings();
  if (error) {
    return NextResponse.json({ success: false, message: "Failed to load annual maintenance details", details: error.message }, { status: 500 });
  }

  const settings = data && data.is_active ? data : null;
  return NextResponse.json({ success: true, settings });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let finalPath: string | null = null;

  try {
    const form = await request.formData();
    const transactionNumber = String(form.get("transactionNumber") ?? "").trim();
    const normalizedTransactionNumber = normalizeReferenceValue(transactionNumber);
    const amountValue = form.get("amount");
    const amount = amountValue !== null && amountValue !== "" ? Number(amountValue) : null;
    const paymentDate = String(form.get("paymentDate") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const file = form.get("receipt") as File | null;

    if (!normalizedTransactionNumber) {
      return NextResponse.json({ success: false, message: "Transaction Number is required" }, { status: 400 });
    }

    const existingPayment = await getAnnualMaintenancePaymentByTransaction(auth.session.user.id, normalizedTransactionNumber);
    if (existingPayment.data && (existingPayment.data.receipt_number || existingPayment.data.generated_receipt_path)) {
      const retryPayment = existingPayment.data;
      return NextResponse.json({
        success: true,
        item: {
          ...retryPayment,
          receipt_number: retryPayment.receipt_number ?? retryPayment.transaction_number,
          generated_receipt_path: retryPayment.generated_receipt_path,
        },
      }, { status: 200 });
    }

    if (existingPayment.data) {
      const retryPayment = existingPayment.data;
      const { data: profile } = await getUserProfileById(auth.session.user.id);
      const receiptNumber = retryPayment.receipt_number ?? buildAnnualMaintenanceReceiptNumber(retryPayment.id);
      let generatedReceipt;
      try {
        generatedReceipt = await generateAnnualMaintenanceReceipt(
          {
            id: retryPayment.id,
            user_id: retryPayment.user_id,
            transaction_number: retryPayment.transaction_number,
            amount: retryPayment.amount ?? amount,
            payment_date: retryPayment.payment_date ?? (paymentDate || null),
            created_at: retryPayment.created_at,
            receipt_number: receiptNumber,
          },
          {
            name: profile?.name ?? auth.session.user.name ?? null,
            email: profile?.email ?? auth.session.user.email ?? null,
            phone_number: profile?.phone_number ?? null,
            district: profile?.district ?? null,
            state: profile?.state ?? null,
            village_city: profile?.village_city ?? null,
            house_flat_no: profile?.house_flat_no ?? null,
            street_locality: profile?.street_locality ?? null,
            landmark: profile?.landmark ?? null,
            pincode: profile?.pincode ?? null,
            country: profile?.country ?? null,
          },
        );
      } catch (generationError) {
        console.error("[annual-maintenance] retry receipt generation failed", {
          paymentId: retryPayment.id,
          userId: auth.session.user.id,
          message: generationError instanceof Error ? generationError.message : String(generationError),
        });
        return NextResponse.json({ success: false, message: "Existing payment was found but the receipt could not be generated", details: generationError instanceof Error ? generationError.message : "Unknown receipt generation error" }, { status: 500 });
      }

      const { error: updateError } = await updateAnnualMaintenancePayment(retryPayment.id, {
        receipt_number: generatedReceipt.receipt_number,
        generated_receipt_path: generatedReceipt.generated_receipt_path,
        status: "pending",
        verification_status: "pending",
      });

      if (updateError) {
        console.error("[annual-maintenance] retry receipt metadata update failed", {
          paymentId: retryPayment.id,
          userId: auth.session.user.id,
          message: updateError.message,
          code: updateError.code,
        });
        return NextResponse.json({ success: false, message: "Existing payment was found but the receipt metadata could not be updated", details: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        item: {
          ...retryPayment,
          receipt_number: generatedReceipt.receipt_number,
          generated_receipt_path: generatedReceipt.generated_receipt_path,
        },
        generatedReceipt,
      }, { status: 200 });
    }

    const duplicateCheck = await findDuplicateTransactionNumber(normalizedTransactionNumber);
    if (duplicateCheck.exists) {
      return NextResponse.json({
        success: false,
        message: DUPLICATE_PAYMENT_MESSAGE,
        duplicate: true,
      }, { status: 409 });
    }

    if (amount === null || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Valid amount is required" }, { status: 400 });
    }

    if (!file || !(file instanceof File) || typeof file.size !== "number") {
      return NextResponse.json({ success: false, message: "Payment receipt is required" }, { status: 400 });
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: "Only PDF, JPG, JPEG, and PNG files are allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const storageDir = path.join(process.cwd(), "annual_maintenance_receipts");
    await fs.promises.mkdir(storageDir, { recursive: true });

    const safeName = `${Date.now()}-${String(file.name || "receipt").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    finalPath = path.join(storageDir, safeName);
    const arrayBuffer = await file.arrayBuffer();
    const fileHash = computeFileHash(Buffer.from(arrayBuffer));
    const hasFileHashColumn = await annualMaintenanceSupportsFileHashColumn();
    const existingFileHashMatch = hasFileHashColumn
      ? await queryRows<{ id: string }>(
        `SELECT id FROM receipts WHERE file_hash = $1
         UNION ALL
         SELECT id FROM annual_maintenance_payments WHERE file_hash = $1
         LIMIT 1`,
        [fileHash],
      )
      : [];
    if (hasFileHashColumn && existingFileHashMatch.length > 0) {
      return NextResponse.json({ success: false, message: "This receipt image has already been uploaded. Please check the file and try a different copy." }, { status: 409 });
    }

    await fs.promises.writeFile(finalPath, Buffer.from(arrayBuffer));

    const receiptPath = path.join("annual_maintenance_receipts", safeName);

    const { data, error } = await createAnnualMaintenancePayment({
      userId: auth.session.user.id,
      transactionNumber: normalizedTransactionNumber,
      transactionUtr: normalizedTransactionNumber,
      amount,
      paymentDate: paymentDate || null,
      receiptPath,
      receiptName: safeName,
      notes: notes || null,
      fileHash,
    });

    if (error) {
      const errorMessage = String(error.message || "");
      const isDuplicateConstraint =
        error.code === "23505" ||
        /duplicate key|unique constraint|already exists|already been submitted/i.test(errorMessage);

      if (isDuplicateConstraint) {
        return NextResponse.json({
          success: false,
          duplicate: true,
          message: DUPLICATE_PAYMENT_MESSAGE,
        }, { status: 409 });
      }

      return NextResponse.json({ success: false, message: "Failed to save payment submission", details: error.message }, { status: 500 });
    }

    const { data: profile } = await getUserProfileById(auth.session.user.id);
    const receiptNumber = buildAnnualMaintenanceReceiptNumber(data.id);
    let generatedReceipt;
    try {
      generatedReceipt = await generateAnnualMaintenanceReceipt(
        {
          id: data.id,
          user_id: auth.session.user.id,
          transaction_number: transactionNumber,
          amount,
          payment_date: paymentDate || null,
          created_at: data.created_at,
          receipt_number: receiptNumber,
        },
        {
          name: profile?.name ?? auth.session.user.name ?? null,
          email: profile?.email ?? auth.session.user.email ?? null,
          phone_number: profile?.phone_number ?? null,
          district: profile?.district ?? null,
          state: profile?.state ?? null,
          village_city: profile?.village_city ?? null,
          house_flat_no: profile?.house_flat_no ?? null,
          street_locality: profile?.street_locality ?? null,
          landmark: profile?.landmark ?? null,
          pincode: profile?.pincode ?? null,
          country: profile?.country ?? null,
        },
      );
    } catch (generationError) {
      console.error("[annual-maintenance] receipt generation failed", {
        paymentId: data.id,
        userId: auth.session.user.id,
        message: generationError instanceof Error ? generationError.message : String(generationError),
        stack: generationError instanceof Error ? generationError.stack : undefined,
      });
      return NextResponse.json({ success: false, message: "Payment was saved but the receipt could not be generated", details: generationError instanceof Error ? generationError.message : "Unknown receipt generation error" }, { status: 500 });
    }

    const { error: updateError } = await updateAnnualMaintenancePayment(data.id, {
      receipt_number: generatedReceipt.receipt_number,
      generated_receipt_path: generatedReceipt.generated_receipt_path,
      status: "pending",
      verification_status: "pending",
    });

    if (updateError) {
      console.error("[annual-maintenance] receipt metadata update failed", {
        paymentId: data.id,
        userId: auth.session.user.id,
        message: updateError.message,
        code: updateError.code,
      });
      return NextResponse.json({ success: false, message: "Payment was saved but the receipt could not be generated", details: updateError.message }, { status: 500 });
    }

    const existingRecord = await ensureAnnualMaintenanceReceiptRecord(data.id, generatedReceipt.receipt_number, generatedReceipt.generated_receipt_path);
    if (existingRecord.error) {
      console.error("[annual-maintenance] receipt record backfill failed", {
        paymentId: data.id,
        userId: auth.session.user.id,
        message: existingRecord.error.message,
        code: existingRecord.error.code,
      });
    }

    return NextResponse.json({ success: true, item: { ...data, receipt_number: generatedReceipt.receipt_number, generated_receipt_path: generatedReceipt.generated_receipt_path }, generatedReceipt }, { status: 201 });
  } catch (error) {
    if (finalPath) {
      try {
        await fs.promises.unlink(finalPath);
      } catch {
        // ignore cleanup errors
      }
    }

    const message = error instanceof Error ? error.message : "Failed to process annual maintenance payment";
    return NextResponse.json({ success: false, message, details: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}
