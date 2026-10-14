import { getSession } from "@/lib/auth";
import { getReceiptsByUser } from "@/lib/db";
import ReceiptCard from "@/components/ReceiptCard";
import ReceiptTypeFilter from "@/components/ReceiptTypeFilter";
import React from "react";
import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";
import { queryRows } from "@/lib/postgres";

export default async function ViewSahyogReceiptsPage({
  searchParams,
}: {
  searchParams?: { receiptType?: string | string[] };
}) {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>Please login to view your receipts. <Link href="/login" className="text-blue-600">Login</Link></p>
      </div>
    );
  }

  const selectedType = String(Array.isArray(searchParams?.receiptType) ? searchParams.receiptType[0] : searchParams?.receiptType ?? "All");
  const { data: sahyogReceipts } = await getReceiptsByUser(session.user.id);
  const annualRows = await queryRows<any>(
    `SELECT ap.*,
            u.name AS user_name,
            u.district AS user_district
     FROM annual_maintenance_payments ap
     LEFT JOIN users u ON u.id = ap.user_id
     WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'
     ORDER BY ap.created_at DESC`,
    [session.user.id],
  );

  const annualReceipts = annualRows.map((item) => ({
    id: item.id,
    receipt_number: item.receipt_number ?? item.transaction_number,
    transaction_number: item.transaction_number,
    transaction_id: item.transaction_number,
    amount: item.amount,
    created_at: item.created_at,
    sahyog_type: "Annual Maintenance",
    district: item.user_district ?? session.user.district,
    paid_by_name: item.user_name ?? session.user.name,
    paid_by_district: item.user_district ?? session.user.district,
    paid_to_name: "SWS Bharat Annual Maintenance Fund",
    paid_to_district: item.user_district ?? session.user.district,
    status: item.status,
    downloadUrl: `/api/annual-maintenance/download?paymentId=${item.id}`,
  }));

  const allReceipts = [
    ...(sahyogReceipts ?? []).map((r: any) => ({ ...r, downloadUrl: undefined })),
    ...annualReceipts,
  ];

  const receiptTypes = Array.from(
    new Set(allReceipts.map((receipt) => String(receipt.sahyog_type || "General")).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const filteredReceipts =
    selectedType === "All"
      ? allReceipts
      : allReceipts.filter((receipt) => String(receipt.sahyog_type || "General") === selectedType);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <InfoPageShell
        title="View Sahyog Receipts"
        intro="Download or view your acknowledgement receipts."
        breadcrumb={[
          { href: "/upload-receipt", label: "Upload" },
          { href: "/view-sahyog-receipt", label: "View" },
        ]}
      >
        <ReceiptTypeFilter selectedType={selectedType} receiptTypes={receiptTypes} />

        {filteredReceipts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredReceipts.map((r: any) => (
              <ReceiptCard key={r.id} receipt={r} downloadUrl={r.downloadUrl} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
            No receipts found for the selected type.
          </div>
        )}
      </InfoPageShell>
    </div>
  );
}
