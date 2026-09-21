import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAuth } from "@/lib/auth";
import { getReceiptById } from "@/lib/db";

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

  // ensure the current user owns the receipt (or is service role — not implemented here)
  if (String(receipt.user_id) !== String(session.user.id)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const relPath = receipt.receipt_file_path ?? receipt.uploaded_file_path;
  if (!relPath) return NextResponse.json({ success: false, message: "No generated PDF available" }, { status: 404 });

  const abs = path.join(process.cwd(), relPath);
  // ensure path is inside new_payment_recipt directory to avoid path traversal
  const allowedDir = path.join(process.cwd(), "new_payment_recipt");
  if (!abs.startsWith(allowedDir)) {
    return NextResponse.json({ success: false, message: "Invalid file path" }, { status: 400 });
  }

  try {
    const dataBuf = await fs.promises.readFile(abs);
    const fileName = path.basename(abs);
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
