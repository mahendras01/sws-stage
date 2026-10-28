import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getAnnualMaintenancePaymentById, syncUserMembershipExpiryFromAnnualMaintenance, updateAnnualMaintenancePayment } from "@/lib/annual-maintenance";
import { getReceiptById, updateReceipt } from "@/lib/db";
import { log } from "@/lib/logger";
import { getPaymentApprovalStatus } from "@/lib/payment-approvals";
import { queryRows } from "@/lib/postgres";

export const dynamic = "force-dynamic";

function buildAuditNote(itemType: string, itemId: string, decision: "approved" | "rejected", note?: string | null) {
  const base = itemType === "annual_maintenance"
    ? `Annual maintenance payment ${decision} by Super Admin.`
    : `Sahyog payment ${decision} by Super Admin.`;

  return note && note.trim() ? `${base} ${note.trim()}` : base;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }

  const adminContext = getAdminContext(auth.session);
  if (adminContext.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only the Super Admin can review payment approvals." }, { status: 403 });
  }

  try {
    const receiptRows = await queryRows<any>(
      `SELECT r.*,
              uploader.name AS user_name,
              uploader.email AS user_email,
              uploader.phone_number AS user_phone,
              uploader.district AS user_district
       FROM receipts r
       LEFT JOIN users uploader ON uploader.id = r.user_id
       WHERE r.status IN ('uploaded', 'pending')
          OR r.review_status IN ('pending', 'needs_review')
       ORDER BY r.created_at DESC`,
    );

    const annualRows = await queryRows<any>(
      `SELECT ap.*,
              uploader.name AS user_name,
              uploader.email AS user_email,
              uploader.phone_number AS user_phone,
              uploader.district AS user_district
       FROM annual_maintenance_payments ap
       LEFT JOIN users uploader ON uploader.id = ap.user_id
       WHERE ap.verification_status = 'pending'
          OR ap.status = 'pending'
       ORDER BY ap.created_at DESC`,
    );

    const items = [
      ...receiptRows.map((row) => ({
        ...row,
        source: "receipt",
        itemType: "Sahyog Receipt",
        paymentType: "Sahyog",
        itemId: row.id,
        user_name: row.user_name ?? row.paid_by_name ?? "Unknown",
        user_email: row.user_email ?? null,
        user_phone: row.user_phone ?? null,
        user_district: row.user_district ?? row.paid_by_district ?? null,
        status: getPaymentApprovalStatus({
          status: row.status,
          review_status: row.review_status,
          verification_status: row.verification_status,
        }),
      })),
      ...annualRows.map((row) => ({
        ...row,
        source: "annual_maintenance",
        itemType: "Annual Maintenance",
        paymentType: "Annual Maintenance",
        itemId: row.id,
        user_name: row.user_name ?? "Unknown",
        user_email: row.user_email ?? null,
        user_phone: row.user_phone ?? null,
        user_district: row.user_district ?? null,
        status: getPaymentApprovalStatus({
          status: row.status,
          review_status: row.review_status,
          verification_status: row.verification_status,
        }),
      })),
    ].filter((item) => item.status === "pending");

    return NextResponse.json({ success: true, items });
  } catch (error) {
    log.error("admin.payment_approvals.list_failed", { error });
    return NextResponse.json({ success: false, message: "Failed to load pending payments." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }

  const adminContext = getAdminContext(auth.session);
  if (adminContext.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only the Super Admin can approve or reject payment uploads." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Request body is required." }, { status: 400 });
  }

  const itemType = typeof body.itemType === "string" ? body.itemType : "";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const rawDecision = typeof body.decision === "string" ? body.decision : "";
  const note = typeof body.note === "string" ? body.note.trim() : null;
  const decision = rawDecision.toLowerCase() === "approved" ? "approved" : rawDecision.toLowerCase() === "rejected" ? "rejected" : "";

  if (!itemId || !itemType || !decision) {
    return NextResponse.json({ success: false, message: "itemId, itemType and decision are required." }, { status: 400 });
  }

  try {
    if (itemType === "receipt") {
      const { data: receipt, error: receiptError } = await getReceiptById(itemId);
      if (receiptError || !receipt) {
        return NextResponse.json({ success: false, message: "Receipt not found." }, { status: 404 });
      }

      const result = await updateReceipt(itemId, {
        status: decision,
        review_status: decision === "approved" ? "reviewed" : "rejected",
        updated_at: new Date().toISOString(),
      });

      if (result.error) {
        return NextResponse.json({ success: false, message: "Failed to update receipt approval status.", details: result.error.message }, { status: 500 });
      }

      await queryRows(
        `INSERT INTO admin_assignment_audit (admin_user_id, acted_by, action, note, mapping_role, district, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [receipt.user_id, auth.session.user.id, "sahyog_payment_approval", buildAuditNote(itemType, itemId, decision, note), adminContext.role, auth.session.user.district ?? null],
      );

      return NextResponse.json({ success: true, message: decision === "approved" ? "Receipt approved." : "Receipt rejected." });
    }

    if (itemType === "annual_maintenance") {
      const { data: payment, error: paymentError } = await getAnnualMaintenancePaymentById(itemId);
      if (paymentError || !payment) {
        return NextResponse.json({ success: false, message: "Annual maintenance payment not found." }, { status: 404 });
      }

      const updateResult = await updateAnnualMaintenancePayment(itemId, {
        verification_status: decision === "approved" ? "verified" : "rejected",
        verified_by: auth.session.user.id,
        verified_at: new Date().toISOString(),
        verification_note: note,
        status: decision,
      });

      if (updateResult.error) {
        return NextResponse.json({ success: false, message: "Failed to update annual maintenance payment.", details: updateResult.error.message }, { status: 500 });
      }

      try {
        await syncUserMembershipExpiryFromAnnualMaintenance(payment.user_id);
      } catch (membershipError) {
        log.error("admin.payment_approvals.membership_expiry_sync_failed", {
          error: membershipError,
          userId: payment.user_id,
          itemId,
          decision,
        });
        return NextResponse.json({ success: false, message: "Annual maintenance payment was updated, but membership expiry could not be synced." }, { status: 500 });
      }

      await queryRows(
        `INSERT INTO admin_assignment_audit (admin_user_id, acted_by, action, note, mapping_role, district, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [payment.user_id, auth.session.user.id, "annual_maintenance_payment_approval", buildAuditNote(itemType, itemId, decision, note), adminContext.role, auth.session.user.district ?? null],
      );

      return NextResponse.json({ success: true, message: decision === "approved" ? "Annual maintenance payment approved." : "Annual maintenance payment rejected." });
    }

    return NextResponse.json({ success: false, message: "Unsupported payment type." }, { status: 400 });
  } catch (error) {
    log.error("admin.payment_approvals.action_failed", { error, itemType, itemId, decision });
    return NextResponse.json({ success: false, message: "Unable to process the payment approval action." }, { status: 500 });
  }
}
