import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getAnnualMaintenancePaymentById, syncUserMembershipExpiryFromAnnualMaintenance, updateAnnualMaintenancePayment } from "@/lib/annual-maintenance";
import { getReceiptById, updateReceipt } from "@/lib/db";
import { log } from "@/lib/logger";
import { getPaymentApprovalDecisionMessage, getPaymentApprovalStatus } from "@/lib/payment-approvals";
import { queryRows } from "@/lib/postgres";

export const dynamic = "force-dynamic";

function buildAuditNote(itemType: string, itemId: string, decision: "approved" | "rejected", note?: string | null) {
  const base = itemType === "annual_maintenance"
    ? `Annual maintenance payment ${decision} by Super Admin.`
    : `Sahyog payment ${decision} by Super Admin.`;

  return note && note.trim() ? `${base} ${note.trim()}` : base;
}

export async function GET() {
  return NextResponse.json({ success: true, items: [], message: "Manual payment approval is disabled." });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: false, message: "Manual payment approval is disabled. Sahyog receipts are approved automatically on upload." }, { status: 403 });
}
