/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Settings = {
  fee_amount?: number | string | null;
  qr_code_url?: string | null;
  upi_id?: string | null;
  account_holder_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
  notes?: string | null;
};

export default function AnnualMaintenancePage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    transactionNumber: "",
    amount: "",
    paymentDate: "",
    notes: "",
    receipt: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/annual-maintenance")
      .then((res) => res.json())
      .then((json) => setSettings(json.settings ?? null))
      .catch(() => setSettings(null));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      setMessage({ type: "error", text: "Please log in to submit annual maintenance payment details." });
      return;
    }

    if (!form.transactionNumber || !form.amount || !form.receipt) {
      setMessage({ type: "error", text: "Transaction Number, amount, and payment receipt are required." });
      return;
    }

    const fd = new FormData();
    fd.append("transactionNumber", form.transactionNumber);
    fd.append("amount", form.amount);
    if (form.paymentDate) fd.append("paymentDate", form.paymentDate);
    if (form.notes) fd.append("notes", form.notes);
    fd.append("receipt", form.receipt);

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/annual-maintenance", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to submit payment details");
      }

      setMessage({ type: "success", text: "Annual maintenance payment submitted successfully." });
      setForm({ transactionNumber: "", amount: "", paymentDate: "", notes: "", receipt: null });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to submit payment details.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-slate-500">Loading payment details...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Annual Maintenance</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Annual Maintenance Payment</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          This payment is strictly for website maintenance and other related administrative/technical work. It is separate from all Sahyog payments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-800">Payment Details</h2>

          {!session ? (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              Please <a href="/login" className="font-semibold underline">login</a> to view the annual maintenance payment details.
            </div>
          ) : settings ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                <span className="font-semibold">Annual Maintenance Fee:</span> ₹{Number(settings.fee_amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>

              {settings.qr_code_url ? (
                <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <img src={settings.qr_code_url} alt="Annual Maintenance QR Code" className="h-56 w-56 rounded-lg object-contain bg-white" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  QR code will be available here once admin updates the settings.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">UPI ID</p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-800">{settings.upi_id || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Holder</p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-800">{settings.account_holder_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Name</p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-800">{settings.bank_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-800">{settings.branch_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account Number</p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-800">{settings.account_number || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">IFSC</p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-800">{settings.ifsc_code || "—"}</p>
                </div>
              </div>

              {settings.notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <span className="font-semibold">Payment Instructions:</span> {settings.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
              Annual maintenance payment details are not configured yet.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-800">Submit Payment</h2>

          {!session ? (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              Please <a href="/login" className="font-semibold underline">login</a> or <a href="/signup" className="font-semibold underline">register</a> to submit your payment information.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">UTR / Transaction Number</span>
                <input
                  type="text"
                  value={form.transactionNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, transactionNumber: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-0 transition focus:border-sky-500"
                  placeholder="e.g. UPI123456789"
                  required
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Amount</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-sky-500"
                  placeholder="e.g. 2999"
                  required
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Payment Date</span>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-sky-500"
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Payment Receipt</span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => setForm((prev) => ({ ...prev, receipt: e.target.files?.[0] ?? null }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  required
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Notes (Optional)</span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-sky-500"
                  placeholder="Any additional note"
                />
              </label>

              {message && (
                <div className={`rounded-lg border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Submit Annual Maintenance Payment"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
