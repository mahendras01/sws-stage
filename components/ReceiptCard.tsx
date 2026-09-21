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
  user_id?: string;
};

export default function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const date = receipt.created_at ? new Date(String(receipt.created_at)).toLocaleString() : "-";
  return (
    <div className="relative rounded-lg border bg-white p-4 shadow-sm">
      <a
        href={`/api/receipts/download?receiptId=${receipt.id}`}
        className="absolute right-3 top-3 inline-flex items-center rounded bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700"
      >
        Download
      </a>

      <div className="text-sm text-slate-700">
        <div className="mb-1 font-semibold text-slate-900">{receipt.receipt_number ?? receipt.transaction_id}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-xs text-slate-500">Paid By</div>
            <div className="font-medium">—</div>
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
            <div className="font-medium">{receipt.transaction_number ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Date</div>
            <div className="font-medium">{date}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">District</div>
            <div className="font-medium">{receipt.district ?? "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
