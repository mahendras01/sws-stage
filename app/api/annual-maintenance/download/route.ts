import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { canAccessReceiptForUser } from "@/lib/receipt-access";
import { getAnnualMaintenancePaymentById, normalizeAnnualMaintenancePaidToName, updateAnnualMaintenancePayment } from "@/lib/annual-maintenance";
import { getCanonicalReceiptPdfRelativePath, isPdfPath, regenerateStoredReceiptPdf } from "@/lib/pdf";

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
  if (!canAccessReceiptForUser({ id: auth.session.user.id, role: auth.session.user.role }, payment.user_id)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const currentPdfPath = payment.generated_receipt_path && isPdfPath(payment.generated_receipt_path)
    ? payment.generated_receipt_path
    : getCanonicalReceiptPdfRelativePath({
        receipt_number: payment.receipt_number,
        transaction_number: payment.transaction_number,
        transaction_id: payment.transaction_number,
        amount: payment.amount,
        created_at: payment.created_at,
        id: payment.id,
        user_id: payment.user_id,
        transaction_date: payment.payment_date ?? payment.created_at,
        sahyog_type: "Annual Maintenance",
        paid_by_name: payment.user_name ?? auth.session.user.name ?? null,
        paid_to_name: normalizeAnnualMaintenancePaidToName(payment.paid_to_name),
      });

  const refreshedPdfPath = await regenerateStoredReceiptPdf({
    receipt_number: payment.receipt_number,
    transaction_number: payment.transaction_number,
    transaction_id: payment.transaction_number,
    amount: payment.amount,
    created_at: payment.created_at,
    id: payment.id,
    user_id: payment.user_id,
    transaction_date: payment.payment_date ?? payment.created_at,
    sahyog_type: "Annual Maintenance",
    paid_by_name: payment.user_name ?? auth.session.user.name ?? null,
    paid_to_name: normalizeAnnualMaintenancePaidToName(payment.paid_to_name),
  }, {
    name: payment.user_name ?? auth.session.user.name ?? null,
    phone_number: payment.user_phone ?? null,
    email: payment.user_email ?? auth.session.user.email ?? null,
    paid_by_name: payment.user_name ?? auth.session.user.name ?? null,
    paid_to_name: normalizeAnnualMaintenancePaidToName(payment.paid_to_name),
  }, currentPdfPath);

  const finalPdfPath = refreshedPdfPath ?? currentPdfPath;
  if (payment.id && payment.generated_receipt_path !== finalPdfPath) {
    await updateAnnualMaintenancePayment(payment.id, { generated_receipt_path: finalPdfPath });
  }

  const abs = path.resolve(process.cwd(), finalPdfPath);
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
    const fileName = `${path.basename(finalPdfPath, ".pdf") || "annual-maintenance-receipt"}.pdf`;
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
