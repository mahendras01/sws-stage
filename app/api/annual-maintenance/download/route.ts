import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { getAnnualMaintenancePaymentById } from "@/lib/annual-maintenance";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ success: false, message: "Missing paymentId" }, { status: 400 });
  }

  const { data: payment, error } = await getAnnualMaintenancePaymentById(paymentId);
  if (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch annual maintenance payment" }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json({ success: false, message: "Annual maintenance payment not found" }, { status: 404 });
  }
  if (String(payment.user_id) !== String(auth.session.user.id)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const relPath = payment.generated_receipt_path ?? payment.payment_receipt_path;
  if (!relPath) {
    return NextResponse.json({ success: false, message: "No generated receipt available" }, { status: 404 });
  }

  const abs = path.resolve(process.cwd(), relPath);
  const allowedDirs = [
    path.resolve(process.cwd(), "private", "receipts", "pdf"),
    path.resolve(process.cwd(), "annual_maintenance_receipts"),
  ];
  const isWithinAllowedDir = allowedDirs.some((allowedDir) => abs.startsWith(allowedDir + path.sep) || abs === allowedDir);
  if (!isWithinAllowedDir) {
    return NextResponse.json({ success: false, message: "Invalid file path" }, { status: 400 });
  }

  try {
    const dataBuf = await fs.promises.readFile(abs);
    const fileName = path.basename(abs) || "annual-maintenance-receipt.pdf";
    return new Response(dataBuf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to read annual maintenance receipt" }, { status: 500 });
  }
}
