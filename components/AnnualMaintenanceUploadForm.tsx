"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

async function readJsonResponse(res: Response) {
  const rawText = await res.text();
  if (!rawText) {
    return { success: false, message: `Request failed with status ${res.status}.` };
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error("Invalid JSON response from annual-maintenance API", {
      status: res.status,
      contentType: res.headers.get("content-type"),
      bodyPreview: rawText.slice(0, 200),
      error,
    });

    return {
      success: false,
      message: "The server returned an invalid response. Please refresh and try again.",
    };
  }
}

export default function AnnualMaintenanceUploadForm() {
  const router = useRouter();
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
      .then(async (res) => {
        const json = await readJsonResponse(res);
        setSettings(json?.settings ?? null);
      })
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (!settings) return;
    const configuredFee = settings.fee_amount !== null && settings.fee_amount !== undefined && String(settings.fee_amount).trim() !== "" ? String(settings.fee_amount) : "";
    setForm((prev) => ({
      ...prev,
      amount: prev.amount || configuredFee,
    }));
  }, [settings]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      setMessage({ type: "error", text: "Please log in to submit annual maintenance payment details." });
      return;
    }

    const transactionNumber = form.transactionNumber.trim();
    if (!transactionNumber || !form.amount || !form.receipt) {
      setMessage({ type: "error", text: "Transaction Number, amount, and payment receipt are required." });
      return;
    }

    try {
      const duplicateCheck = await fetch(`/api/annual-maintenance/check-duplicate?transactionNumber=${encodeURIComponent(transactionNumber)}`);
      const duplicateJson = await readJsonResponse(duplicateCheck);
      if (!duplicateCheck.ok || duplicateJson?.duplicate) {
        setMessage({
          type: "error",
          text: duplicateJson?.message || "This UTR / Transaction Number has already been used. Please check your receipt.",
        });
        return;
      }
    } catch {
      setMessage({ type: "error", text: "Unable to validate transaction number. Please try again." });
      return;
    }

    const fd = new FormData();
    fd.append("transactionNumber", transactionNumber);
    fd.append("amount", form.amount.trim());
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
      const json = await readJsonResponse(res);

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to submit payment details");
      }

      setMessage({ type: "success", text: "Annual maintenance payment submitted successfully." });
      setForm({ transactionNumber: "", amount: settings?.fee_amount ? String(settings.fee_amount) : "", paymentDate: "", notes: "", receipt: null });
      router.refresh();
      router.push("/view-annual-maintenance-receipt");
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
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">अपलोड भुगतान रसीद फॉर्म</h2>

      {!session ? (
        <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          Please <a href="/login" className="font-semibold underline">login</a> or <a href="/signup" className="font-semibold underline">register</a> to submit your payment information.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">ट्रांजैक्शन आईडी नंबर (Transaction ID No.)</span>
            <input
              type="text"
              value={form.transactionNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, transactionNumber: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="e.g. UPI123456789"
              required
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">राशि (Amount)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder={settings?.fee_amount ? `₹${Number(settings.fee_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "₹50"}
              required
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">दिनांक (Date)</span>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">भुगतान की इमेज अपलोड करें (Please Upload Image)</span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg"
              onChange={(e) => setForm((prev) => ({ ...prev, receipt: e.target.files?.[0] ?? null }))}
              className="block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              required
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">नोट (Optional)</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
            {submitting ? "जमा हो रहा है..." : "जमा करें"}
          </button>
        </form>
      )}
    </section>
  );
}
