import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAuth } from "@/lib/auth";
import { canAccessReceiptForUser } from "@/lib/receipt-access";
import { getReceiptById, updateReceipt } from "@/lib/db";
import { getCanonicalReceiptPdfRelativePath, isPdfPath, regenerateStoredReceiptPdf } from "@/lib/pdf";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;

  const url = new URL(request.url);
  const receiptId = url.searchParams.get("receiptId");
  if (!receiptId) return NextResponse.json({ success: false, message: "Missing receiptId" }, { status: 400 });

  const { data: receipt, error } = await getReceiptById(receiptId);
  if (error) return NextResponse.json({ success: false, message: "Failed to fetch receipt" }, { status: 500 });
  if (!receipt) return NextResponse.json({ success: false, message: "Receipt not found" }, { status: 404 });

  if (!canAccessReceiptForUser({ id: session.user.id, role: session.user.role }, receipt.user_id)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const currentPdfPath = receipt.receipt_file_path && isPdfPath(receipt.receipt_file_path)
    ? receipt.receipt_file_path
    : getCanonicalReceiptPdfRelativePath(receipt);

  const effectiveUser = {
    name: receipt.paid_by_name ?? session.user.name ?? null,
    phone_number: receipt.phone_number ?? null,
    email: receipt.email ?? session.user.email ?? null,
    paid_by_name: receipt.paid_by_name ?? null,
    paid_to_name: receipt.paid_to_name_display ?? receipt.paid_to_name ?? null,
  };

  const refreshedPdfPath = await regenerateStoredReceiptPdf(receipt, effectiveUser, currentPdfPath);
  const finalPdfPath = refreshedPdfPath ?? currentPdfPath;

  if (receipt.id && receipt.receipt_file_path !== finalPdfPath) {
    await updateReceipt(receipt.id, { receipt_file_path: finalPdfPath });
  }

  const abs = path.resolve(process.cwd(), finalPdfPath);
  const allowedDirs = [
    path.resolve(process.cwd(), "private", "receipts"),
    path.resolve(process.cwd(), "new_payment_recipt"),
  ];
  const isWithinAllowedDir = allowedDirs.some((allowedDir) => abs.startsWith(allowedDir + path.sep) || abs === allowedDir);
  if (!isWithinAllowedDir) {
    return NextResponse.json({ success: false, message: "Invalid file path" }, { status: 400 });
  }

  try {
    const dataBuf = await fs.promises.readFile(abs);
    const fileName = `${path.basename(finalPdfPath, ".pdf") || "receipt"}.pdf`;
    return new Response(dataBuf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, message: "Failed to read file" }, { status: 500 });
  }
}
