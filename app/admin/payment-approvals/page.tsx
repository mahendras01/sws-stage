"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/components/Toast";

type PaymentItem = {
  id: string;
  itemId: string;
  source: "receipt" | "annual_maintenance";
  itemType: string;
  paymentType: string;
  user_id?: string;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  user_district?: string | null;
  amount?: number | string | null;
  created_at?: string | null;
  transaction_number?: string | null;
  transaction_id?: string | null;
  transaction_utr?: string | null;
  status?: string | null;
  review_status?: string | null;
  verification_status?: string | null;
  paid_by_name?: string | null;
  paid_to_name?: string | null;
  receipt_number?: string | null;
};

export default function PaymentApprovalsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/payment-approvals");
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || "Failed to load pending payment approvals", "error");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setSelectedItem((current) => current ?? (data.items ?? [])[0] ?? null);
    } catch {
      showToast("Failed to load pending payment approvals", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDetails = useMemo(() => {
    if (!selectedItem) {
      return [] as Array<[string, string]>;
    }

    return [
      ["Customer", selectedItem.user_name || "Unknown"],
      ["District", selectedItem.user_district || "—"],
      ["Phone", selectedItem.user_phone || "—"],
      ["Email", selectedItem.user_email || "—"],
      ["Amount", selectedItem.amount ? `₹${Number(selectedItem.amount).toLocaleString("en-IN")}` : "—"],
      ["Reference", selectedItem.transaction_number || selectedItem.transaction_id || selectedItem.transaction_utr || selectedItem.receipt_number || "—"],
      ["Created", selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : "—"],
      ["Status", selectedItem.status || "pending"],
    ];
  }, [selectedItem]);

  const handleDecision = async (item: PaymentItem, decision: "approved" | "rejected") => {
    setActionLoading(`${item.source}:${item.itemId}`);

    try {
      const note = window.prompt(
        decision === "approved" ? "Add an approval note (optional)" : "Add a rejection note (required)",
        "",
      );

      if (decision === "rejected" && (!note || !note.trim())) {
        showToast("A rejection reason is required for rejected payments.", "error");
        setActionLoading(null);
        return;
      }

      const res = await fetch("/api/admin/payment-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: item.source,
          itemId: item.itemId,
          decision,
          note: note?.trim() ?? null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.message || "Failed to process payment approval", "error");
        setActionLoading(null);
        return;
      }

      showToast(data.message || "Payment update processed", "success");
      setItems((current) => current.filter((entry) => entry.itemId !== item.itemId || entry.source !== item.source));
      setSelectedItem((current) => (current && current.itemId === item.itemId && current.source === item.source ? null : current));
      setActionLoading(null);
      if (items.length <= 1) {
        fetchItems();
      }
    } catch {
      showToast("Unable to update the payment approval", "error");
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Approvals</h1>
        <p className="mt-1 text-neutral">Review Sahyog and annual maintenance payments waiting for Super Admin approval.</p>
      </div>

      {items.length === 0 ? (
        <div className="card py-12 text-center text-neutral">No pending payment approvals.</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.source}:${item.itemId}`} className={`card p-4 ${selectedItem?.source === item.source && selectedItem?.itemId === item.itemId ? "border-primary" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase text-neutral">{item.itemType}</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{item.user_name || "Unknown member"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View details
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-neutral">Amount</div>
                    <div className="font-medium">₹{item.amount ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral">Reference</div>
                    <div className="font-medium">{item.transaction_number || item.receipt_number || item.transaction_id || "—"}</div>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={actionLoading === `${item.source}:${item.itemId}`}
                    onClick={() => handleDecision(item, "approved")}
                    className="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === `${item.source}:${item.itemId}` ? "Processing..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === `${item.source}:${item.itemId}`}
                    onClick={() => handleDecision(item, "rejected")}
                    className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            {selectedItem ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900">Selected payment</h2>
                <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-xs font-medium uppercase text-neutral">{selectedItem.itemType}</div>
                  <div className="space-y-3">
                    {selectedDetails.map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                        <span className="text-sm text-neutral">{label}</span>
                        <span className="text-right text-sm font-medium text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-neutral">Select a payment to view details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
