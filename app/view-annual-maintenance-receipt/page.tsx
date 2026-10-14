import { getSession } from "@/lib/auth";
import { queryRows } from "@/lib/postgres";
import ReceiptCard from "@/components/ReceiptCard";
import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";

export default async function ViewAnnualMaintenanceReceiptsPage() {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>Please login to view your annual maintenance receipts. <Link href="/login" className="text-blue-600">Login</Link></p>
      </div>
    );
  }

  const rows = await queryRows<any>(
    `SELECT ap.*,
            u.name AS user_name,
            u.district AS user_district
     FROM annual_maintenance_payments ap
     LEFT JOIN users u ON u.id = ap.user_id
     WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'
     ORDER BY ap.created_at DESC`,
    [session.user.id],
  );

  const receipts = rows.map((item) => ({
    ...item,
    id: item.id,
    receipt_number: item.receipt_number ?? item.transaction_number,
    transaction_number: item.transaction_number,
    transaction_id: item.transaction_number,
    amount: item.amount,
    created_at: item.created_at,
    paid_by_name: item.user_name ?? session.user.name,
    paid_by_district: item.user_district ?? session.user.district,
    paid_to_name: "SWS Bharat Annual Maintenance Fund",
    paid_to_district: item.user_district ?? session.user.district,
    sahyog_type: "Annual Maintenance",
    district: item.user_district ?? session.user.district,
    downloadUrl: `/api/annual-maintenance/download?paymentId=${item.id}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <InfoPageShell title="View Annual Maintenance Receipts" intro="Download or view your annual maintenance payment receipts." breadcrumb={[{ href: "/annual-maintenance", label: "Annual Maintenance" }, { href: "/view-annual-maintenance-receipt", label: "View" }]}> 
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {receipts.length > 0 ? (
            receipts.map((r: any) => <ReceiptCard key={r.id} receipt={r} downloadUrl={r.downloadUrl} />)
          ) : (
            <div className="col-span-full rounded border bg-white p-6 text-center">No annual maintenance receipts found.</div>
          )}
        </div>
      </InfoPageShell>
    </div>
  );
}
