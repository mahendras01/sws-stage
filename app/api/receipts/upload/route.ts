import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { createReceipt, getReceiptByTransactionNumber, updateReceipt, deleteReceipt, getReceiptById } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/pdf";
import { getLogoFile } from "@/lib/site-logo";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    console.log("[receipts.upload] Request received");
    const auth = await requireAuth();
    if (auth.error) {
      console.log("[receipts.upload] Auth check failed");
      return auth.error;
    }
    const session = auth.session;
    console.log("[receipts.upload] Authenticated user:", session?.user?.id);

    const form = await request.formData();
    console.log("[receipts.upload] FormData parsed. Keys:", Array.from(form.keys()));
    const file = form.get("file") as any;
    const transactionNumber = String(form.get("transactionNumber") ?? "").trim();
    const amountRaw = form.get("amount");
    const amount = amountRaw ? Number(amountRaw) : null;
    const sahyogType = String(form.get("sahyogType") ?? "").trim();

    if (!transactionNumber) {
      console.log("[receipts.upload] Missing transactionNumber");
      return NextResponse.json({ success: false, message: "Transaction Number is required" }, { status: 400 });
    }

    if (!file || typeof file.size !== "number") {
      console.log("[receipts.upload] Missing or invalid file field");
      return NextResponse.json({ success: false, message: "Receipt file is required" }, { status: 400 });
    }

    console.log("[receipts.upload] File info:", { name: (file as any).name, size: file.size, type: file.type });

    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log("[receipts.upload] Unsupported file type:", file.type);
      return NextResponse.json({ success: false, message: "Unsupported file type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      console.log("[receipts.upload] File too large:", file.size);
      return NextResponse.json({ success: false, message: "File too large. Maximum allowed size is 5MB." }, { status: 400 });
    }

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      console.log("[receipts.upload] Invalid amount:", amount);
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    if (!sahyogType) {
      console.log("[receipts.upload] Missing sahyogType");
      return NextResponse.json({ success: false, message: "Sahyog Type is required" }, { status: 400 });
    }

    // Server-side uniqueness check
    console.log("[receipts.upload] Checking existing transaction number:", transactionNumber);
    const { data: existing } = await getReceiptByTransactionNumber(transactionNumber);
    if (existing) {
      console.log("[receipts.upload] Existing transaction found for:", transactionNumber);
      return NextResponse.json({ success: false, message: "Transaction Number already exists. Please enter a valid and unused Transaction Number." }, { status: 409 });
    }

    // Generate server-side unique receipt number via DB RPC
    console.log("[receipts.upload] Requesting new receipt number from DB RPC");
    const { data: rnData, error: rnError } = await supabase.rpc("receipts_get_next_receipt_number");
    if (rnError) {
      console.error("[receipts.upload] Failed to obtain receipt number from DB RPC:", rnError);
      return NextResponse.json({ success: false, message: "Failed to generate receipt number", details: rnError.message ?? null }, { status: 500 });
    }
    const receiptNumber = (rnData as any) ?? String(Date.now());
    console.log("[receipts.upload] Generated receipt number:", receiptNumber);

    // Save file locally under project root 'payment_receipt' directory
    const projectRoot = process.cwd();
    const storageDir = path.join(projectRoot, "payment_receipt");
    try {
      await fs.promises.mkdir(storageDir, { recursive: true });
    } catch (mkErr) {
      console.error("[receipts.upload] Failed to create storage directory:", mkErr);
      return NextResponse.json({ success: false, message: "Server error while preparing storage", details: String(mkErr) }, { status: 500 });
    }

    const originalName = String((file as any).name ?? "receipt").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(originalName) || (file.type === "application/pdf" ? ".pdf" : "");
    const safeFileName = `${receiptNumber}${ext}`;
    const savedPath = path.join(storageDir, safeFileName);

    // Prevent path traversal by ensuring resolved path starts with storageDir
    const resolved = path.resolve(savedPath);
    if (!resolved.startsWith(path.resolve(storageDir))) {
      console.error("[receipts.upload] Unsafe file path resolved:", resolved);
      return NextResponse.json({ success: false, message: "Invalid file name" }, { status: 400 });
    }

    // write file
    try {
      const arrayBuffer = await (file as any).arrayBuffer();
      await fs.promises.writeFile(resolved, Buffer.from(arrayBuffer), { flag: "wx" });
    } catch (writeErr) {
      console.error("[receipts.upload] Failed to write file locally:", writeErr);
      return NextResponse.json({ success: false, message: "Failed to save file", details: String(writeErr) }, { status: 500 });
    }

    // Insert receipt record. transaction_id will be generated by DB trigger/sequence
    const relativeFilePath = path.join("payment_receipt", safeFileName);
    const insertPayload = {
      receipt_number: receiptNumber,
      transaction_number: transactionNumber,
      user_id: session.user.id,
      amount: Number(amount),
      sahyog_type: sahyogType,
      file_name: safeFileName,
      file_path: relativeFilePath,
      uploaded_file_path: relativeFilePath,
      file_type: file.type,
      status: "uploaded",
    } as Record<string, unknown>;

    console.log("[receipts.upload] Inserting receipt record to DB, payload keys:", Object.keys(insertPayload));
    const { data, error } = await createReceipt(insertPayload);
    if (error) {
      console.error("[receipts.upload] DB insert error for receipt:", error);
      // attempt to clean up uploaded file to avoid orphaned files
      try {
        await fs.promises.unlink(resolved);
      } catch (rmErr) {
        console.error("[receipts.upload] Failed to remove uploaded file after DB error:", rmErr);
      }
      // handle unique constraint race
      if ((error as any)?.code === "23505" || /unique/.test(String((error as any)?.message ?? ""))) {
        return NextResponse.json({ success: false, message: "Transaction Number or Receipt Number already exists. Please retry with a new Transaction Number." }, { status: 409 });
      }
      return NextResponse.json({ success: false, message: "Failed to save receipt", details: (error as any)?.message ?? null }, { status: 500 });
    }

    console.log("[receipts.upload] Success, receipt inserted with id:", data?.id);

    // Generate acknowledgement PDF and update receipt record with generated path
    try {
      // fetch user details for PDF
      const userId = session.user.id;
      const { data: userData } = await getReceiptById(String(data.id));
      // build minimal user object from session where possible
      const user = {
        name: session.user.name ?? null,
        phone_number: (session.user as any).phone_number ?? null,
        email: session.user.email ?? null,
      };

      const logoPath = path.join(process.cwd(), "public", "images", "Self_Welfare_Society_Registration.jpg");
      // PDFKit only supports PNG/JPEG; WebP logos (or no logo) fall back to the default image.
      const { file: managedLogo } = await getLogoFile();
      const logoBuffer = managedLogo && managedLogo.mimeType !== "image/webp" ? managedLogo.buffer : undefined;
      const pdfRelPath = await generateReceiptPdf(data as any, user as any, { logoPath, logoBuffer });

      // update receipt record with generated PDF path in `receipt_file_path`
      const { data: updated, error: updErr } = await updateReceipt(String((data as any).id), { receipt_file_path: pdfRelPath });
      if (updErr) {
        console.error("[receipts.upload] Failed to update receipt with pdf path:", updErr);
        // cleanup: delete created PDF and DB record
        try {
          await fs.promises.unlink(path.join(process.cwd(), pdfRelPath));
        } catch (e) {
          console.error("[receipts.upload] Failed to remove generated pdf after update failure:", e);
        }
        await deleteReceipt(String((data as any).id));
        return NextResponse.json({ success: false, message: "Failed to finalize receipt", details: (updErr as any)?.message ?? null }, { status: 500 });
      }

      console.log("[receipts.upload] PDF generated and receipt updated:", pdfRelPath);
      return NextResponse.json({ success: true, message: "Receipt uploaded", receipt: updated ?? data, file_path: relativeFilePath, receipt_pdf: pdfRelPath });
    } catch (pdfErr) {
      console.error("[receipts.upload] PDF generation failed:", pdfErr);
      // Attempt cleanup: delete DB record and the uploaded file
      try {
        await deleteReceipt(String((data as any).id));
      } catch (e) {
        console.error("[receipts.upload] Failed to delete receipt after PDF failure:", e);
      }
      try {
        await fs.promises.unlink(resolved);
      } catch (e) {
        console.error("[receipts.upload] Failed to remove uploaded file after PDF failure:", e);
      }
      return NextResponse.json({ success: false, message: "Failed to generate acknowledgement PDF", details: (pdfErr as any)?.message ?? null }, { status: 500 });
    }
  } catch (err) {
    // Log and return error details for debugging (adjust in production)
    console.error("[receipts.upload] Unhandled exception in receipts upload:", err);
    return NextResponse.json({ success: false, message: "Internal server error", details: (err as any)?.message ?? null }, { status: 500 });
  }
}
