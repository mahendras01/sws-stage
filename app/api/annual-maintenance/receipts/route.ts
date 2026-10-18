import { NextResponse } from "next/server";
import { requireAuth, canViewAllSahyogReceipts } from "@/lib/auth";
import { normalizeAnnualMaintenancePaidToName } from "@/lib/annual-maintenance";
import { queryRows } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const isSuperAdmin = canViewAllSahyogReceipts(auth.session.user.role);
    const annualWhereClause = isSuperAdmin
      ? "WHERE ap.payment_category = 'ANNUAL_MAINTENANCE'"
      : "WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'";

    const rows = await queryRows<any>(
      `SELECT ap.*,
              u.name AS user_name,
              u.district AS user_district,
              u.email AS user_email,
              u.phone_number AS user_phone
       FROM annual_maintenance_payments ap
       LEFT JOIN users u ON u.id = ap.user_id
       ${annualWhereClause}
       ORDER BY ap.created_at DESC`,
      isSuperAdmin ? [] : [auth.session.user.id],
    );

    return NextResponse.json({
      success: true,
      items: rows.map((item) => ({
        ...item,
        receipt_number: item.receipt_number ?? item.transaction_number,
        paid_by_name: item.user_name ?? auth.session.user.name,
        paid_by_district: item.user_district ?? auth.session.user.district,
        paid_to_name: normalizeAnnualMaintenancePaidToName(item.paid_to_name),
        paid_to_district: item.user_district ?? auth.session.user.district,
        sahyog_type: "Annual Maintenance",
        district: item.user_district ?? auth.session.user.district,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Failed to load annual maintenance receipts", details: error?.message ?? null }, { status: 500 });
  }
}
