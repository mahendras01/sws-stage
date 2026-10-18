import { getSession, canViewAllSahyogReceipts } from "@/lib/auth";
import { normalizeAnnualMaintenancePaidToName } from "@/lib/annual-maintenance";
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
  const isSuperAdmin = canViewAllSahyogReceipts(session.user.role);
  const { data: sahyogReceipts } = await getReceiptsByUser(session.user.id, {
    role: session.user.role,
    includeAll: isSuperAdmin,
  });

  const annualWhereClause = isSuperAdmin
    ? "WHERE ap.payment_category = 'ANNUAL_MAINTENANCE'"
    : "WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'";

  const annualRows = await queryRows<any>(
    `SELECT ap.*,
            u.name AS user_name,
            u.district AS user_district
     FROM annual_maintenance_payments ap
     LEFT JOIN users u ON u.id = ap.user_id
     ${annualWhereClause}
     ORDER BY ap.created_at DESC`,
    isSuperAdmin ? [] : [session.user.id],
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
    paid_to_name: normalizeAnnualMaintenancePaidToName(item.paid_to_name),
    paid_to_district: item.user_district ?? session.user.district,
    status: item.status,
    downloadUrl: `/api/annual-maintenance/download?paymentId=${item.id}`,
  }));

  const uniqueReceipts = new Map<string, any>();
  const allReceiptRows = [
    ...(sahyogReceipts ?? []).map((r: any) => ({ ...r, downloadUrl: undefined })),
    ...annualReceipts,
  ];

  for (let index = 0; index < allReceiptRows.length; index += 1) {
    const receipt = allReceiptRows[index];
    const key = `${receipt.source ?? "receipt"}:${receipt.id ?? receipt.transaction_number ?? receipt.receipt_number ?? `index-${index}`}`;
    if (!uniqueReceipts.has(key)) {
      uniqueReceipts.set(key, receipt);
    }
  }

  const allReceipts = Array.from(uniqueReceipts.values());

  const receiptTypes = Array.from(
    new Set(allReceipts.map((receipt) => String(receipt.sahyog_type || "General")).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const effectiveSelectedType =
    selectedType === "All" || receiptTypes.includes(selectedType) ? selectedType : "All";

  const filteredReceipts =
    effectiveSelectedType === "All"
      ? allReceipts
      : allReceipts.filter((receipt) => String(receipt.sahyog_type || "General") === effectiveSelectedType);

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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {filteredReceipts.length} matching receipt{filteredReceipts.length === 1 ? "" : "s"}
          </div>
          <ReceiptTypeFilter selectedType={effectiveSelectedType} receiptTypes={receiptTypes} />
        </div>

        {filteredReceipts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredReceipts.map((r: any) => (
              <ReceiptCard key={`${r.source ?? "receipt"}:${r.id}`} receipt={r} downloadUrl={r.downloadUrl} />
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
