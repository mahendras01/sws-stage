import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getAnnualMaintenancePaymentById, updateAnnualMaintenancePayment } from "@/lib/annual-maintenance";
import { queryRows } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }

  const adminContext = getAdminContext(auth.session);
  if (adminContext.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only the Super Admin can verify annual maintenance payments." }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Request body is required." }, { status: 400 });
  }

  const { paymentId, decision, note } = body;
  const normalizedDecision = typeof decision === "string" ? decision.trim().toLowerCase() : "";

  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ success: false, message: "paymentId is required." }, { status: 400 });
  }

  if (!['verified', 'rejected'].includes(normalizedDecision)) {
    return NextResponse.json({ success: false, message: "decision must be 'verified' or 'rejected'." }, { status: 400 });
  }

  const { data: payment } = await getAnnualMaintenancePaymentById(paymentId);
  if (!payment) {
    return NextResponse.json({ success: false, message: "Payment not found." }, { status: 404 });
  }

  const verificationStatus = normalizedDecision;
  const verificationNote = note && typeof note === "string" ? note.trim() : null;

  const { error } = await updateAnnualMaintenancePayment(paymentId, {
    verification_status: verificationStatus,
    verified_by: auth.session.user.id,
    verified_at: new Date().toISOString(),
    verification_note: verificationNote,
    status: verificationStatus === "verified" ? "approved" : "rejected",
  });

  if (error) {
    return NextResponse.json({ success: false, message: "Failed to update payment verification status.", details: error.message }, { status: 500 });
  }

  await queryRows(
    `INSERT INTO admin_assignment_audit (admin_user_id, acted_by, action, note, mapping_role, district, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [payment.user_id, auth.session.user.id, "annual_maintenance_payment_verification", verificationNote ?? `Annual maintenance payment ${verificationStatus} by Super Admin.`, adminContext.role, auth.session.user.district ?? null],
  );

  return NextResponse.json({
    success: true,
    message: verificationStatus === "verified" ? "Annual maintenance payment verified." : "Annual maintenance payment rejected.",
    payment: {
      ...payment,
      verification_status: verificationStatus,
      status: verificationStatus === "verified" ? "approved" : "rejected",
    },
  });
}
