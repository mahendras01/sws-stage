import { getSession } from "@/lib/auth";
import { getReceiptsByUser } from "@/lib/db";
import ReceiptCard from "@/components/ReceiptCard";
import React from "react";
import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";

export default async function ViewSahyogReceiptsPage() {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>Please login to view your receipts. <Link href="/login" className="text-blue-600">Login</Link></p>
      </div>
    );
  }

  const { data: receipts } = await getReceiptsByUser(session.user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <InfoPageShell title="View Sahyog Receipts" intro="Download or view your acknowledgement receipts." breadcrumb={[{ href: "/upload-receipt", label: "Upload" }, { href: "/view-sahyog-receipt", label: "View" }]}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {receipts && receipts.length > 0 ? (
            receipts.map((r: any) => <ReceiptCard key={r.id} receipt={r} />)
          ) : (
            <div className="col-span-full rounded border bg-white p-6 text-center">No receipts found.</div>
          )}
        </div>
      </InfoPageShell>
    </div>
  );
}
