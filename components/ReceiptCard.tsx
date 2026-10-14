import Link from "next/link";
import React from "react";

type Receipt = {
  id: string;
  receipt_number?: string;
  transaction_number?: string;
  transaction_id?: string;
  amount?: number;
  created_at?: string;
  sahyog_type?: string | null;
  district?: string | null;
  paid_by_name?: string | null;
  paid_by_district?: string | null;
  paid_to_name?: string | null;
  user_id?: string;
  status?: string | null;
  downloadUrl?: string;
};

export default function ReceiptCard({ receipt, downloadUrl }: { receipt: Receipt; downloadUrl?: string }) {
  const date = receipt.created_at ? new Date(String(receipt.created_at)).toLocaleString() : "-";
  const paidBy = receipt.paid_by_name ?? "-";
  const paidTo = receipt.paid_to_name ?? "-";
  const district = receipt.paid_by_district ?? receipt.district ?? "-";
  const transactionRef = receipt.transaction_id ?? receipt.transaction_number ?? "-";

  return (
    <div className="relative rounded-lg border bg-white p-4 shadow-sm">
      <a
        href={downloadUrl ?? `/api/receipts/download?receiptId=${receipt.id}`}
        className="absolute right-3 top-3 inline-flex items-center rounded bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700"
      >
        Download
      </a>

      <div className="text-sm text-slate-700">
        <div className="mb-1 font-semibold text-slate-900">{receipt.receipt_number ?? transactionRef}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-xs text-slate-500">Paid By</div>
            <div className="font-medium">{paidBy}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Paid To</div>
            <div className="font-medium">{paidTo}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Sahyog Type</div>
            <div className="font-medium">{receipt.sahyog_type ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Amount</div>
            <div className="font-medium">₹{receipt.amount ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Transaction #</div>
            <div className="font-medium">{transactionRef}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Date</div>
            <div className="font-medium">{date}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">District</div>
            <div className="font-medium">{district}</div>
          </div>
          {receipt.status && (
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className="font-medium">{receipt.status}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
