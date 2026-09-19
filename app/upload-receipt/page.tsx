"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

export default function UploadReceiptPage() {
  const { data: session } = useSession();
  const [transactionNumber, setTransactionNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!transactionNumber) {
      setError("Transaction Number is required");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than zero");
      return;
    }
    if (!file) {
      setError("Please attach a receipt file (PDF/JPG/PNG)");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("transactionNumber", transactionNumber.trim());
      form.append("amount", amount.toString());
      form.append("file", file);

      const resp = await fetch("/api/receipts/upload", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setError(json?.message || "Upload failed");
      } else {
        setSuccess(json);
        setTransactionNumber("");
        setAmount("");
        setFile(null);
        // reload the page so user can refresh view and upload additional receipts
        window.location.reload();
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h2 className="text-2xl font-semibold">Upload Receipt</h2>
      <p className="mt-2 text-sm text-slate-600">Upload your payment receipt to generate a receipt document.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label className="label-text">Registered User Name</label>
          <input readOnly value={session?.user?.name ?? ""} className="mt-1 w-full rounded border p-2" />
        </div>

        <div>
          <label className="label-text">Amount (₹)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border p-2" required />
        </div>

        <div>
          <label className="label-text">Transaction Number</label>
          <input value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} className="mt-1 w-full rounded border p-2" required />
        </div>

        <div>
          <label className="label-text">Upload Receipt Screenshot (PDF/JPG/PNG)</label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="mt-1 w-full"
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 p-3 text-green-800">
            <div className="font-semibold">Receipt uploaded successfully</div>
            <div className="mt-2">Transaction ID: {success?.receipt?.transaction_id ?? success?.receipt?.transaction_id}</div>
            {success.uploaded_file_url && (
              <div className="mt-2">
                <a href={success.uploaded_file_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  View uploaded file
                </a>
              </div>
            )}
          </div>
        )}

        <div>
          <button disabled={loading} className="btn-primary px-4 py-2">
            {loading ? "Uploading..." : "Upload Receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}
