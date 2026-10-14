"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import Link from "next/link";

type EligibleRecipient = {
  id: string;
  name: string;
  district: string | null;
  village_city: string | null;
};

export default function UploadReceiptPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [transactionNumber, setTransactionNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [utr, setUtr] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [transactionTime, setTransactionTime] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [sahyogType, setSahyogType] = useState("Jivandan");
  const [file, setFile] = useState<File | null>(null);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [paidToOptions, setPaidToOptions] = useState<EligibleRecipient[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedPaidToId, setSelectedPaidToId] = useState("");
  const [paidToSearch, setPaidToSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const [extractedPreview, setExtractedPreview] = useState<any>(null);

  useEffect(() => {
    void fetchEligibleRecipients();
  }, []);

  const filteredPaidToOptions = useMemo(() => {
    const query = paidToSearch.trim().toLowerCase();
    if (!query) return paidToOptions;
    return paidToOptions.filter((user) => user.name.toLowerCase().includes(query));
  }, [paidToOptions, paidToSearch]);

  const fetchEligibleRecipients = async (districtValue?: string, locationValue?: string) => {
    const params = new URLSearchParams();
    if (districtValue) params.set("district", districtValue);
    if (locationValue) params.set("location", locationValue);

    const response = await fetch(`/api/receipts/eligible-recipients${params.toString() ? `?${params.toString()}` : ""}`);
    const json = await response.json();
    if (!response.ok || !json?.success) {
      setDistrictOptions([]);
      setLocationOptions([]);
      setPaidToOptions([]);
      return;
    }

    setDistrictOptions(json.districts ?? []);
    setLocationOptions(json.locations ?? []);
    setPaidToOptions(json.users ?? []);
  };

  const applyExtractedPreview = (result: any) => {
    if (!result?.extracted) return;
    const extracted = result.extracted;
    setPaymentProvider(extracted.paymentProvider ?? paymentProvider);
    setTransactionId(extracted.transactionId ?? transactionId);
    setUtr(extracted.utr ?? utr);
    setTransactionDate(extracted.transactionDate ?? transactionDate);
    setTransactionTime(extracted.transactionTime ?? transactionTime);
    setPayerName(extracted.payerName ?? payerName);
    setPayeeName(extracted.payeeName ?? payeeName);
    if (extracted.amount && !amount) setAmount(String(extracted.amount));
    setExtractedPreview(extracted);
  };

  const handleDistrictChange = async (value: string) => {
    setSelectedDistrict(value);
    setSelectedLocation("");
    setSelectedPaidToId("");
    setPaidToSearch("");
    if (value) {
      await fetchEligibleRecipients(value, "");
    } else {
      setLocationOptions([]);
      setPaidToOptions([]);
    }
  };

  const handleLocationChange = async (value: string) => {
    setSelectedLocation(value);
    setSelectedPaidToId("");
    setPaidToSearch("");
    if (selectedDistrict && value) {
      await fetchEligibleRecipients(selectedDistrict, value);
    } else {
      setPaidToOptions([]);
    }
  };

  const handleFileSelection = async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setExtracting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const resp = await fetch("/api/receipts/extract", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        setExtractedPreview(null);
        setError(json?.message || "Unable to read the receipt automatically. You can still enter the details manually.");
        return;
      }
      applyExtractedPreview(json);
    } catch {
      setError("Unable to analyze the uploaded receipt. Please verify details manually before submitting.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!transactionNumber && !transactionId && !utr) {
      setError("Please provide a transaction reference, transaction ID, or UTR.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than zero");
      return;
    }
    if (!sahyogType) {
      setError("Please select a Sahyog Type");
      return;
    }
    if (!selectedDistrict || !selectedLocation || !selectedPaidToId) {
      setError("Please select District, Block/Village/City, and Paid To before submitting.");
      return;
    }
    if (!file) {
      setError("Please attach a receipt file (PDF/JPG/PNG/WebP)");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("transactionNumber", transactionNumber.trim());
      form.append("transactionId", transactionId.trim());
      form.append("utr", utr.trim());
      form.append("paymentProvider", paymentProvider.trim());
      form.append("transactionDate", transactionDate.trim());
      form.append("transactionTime", transactionTime.trim());
      form.append("payerName", payerName.trim());
      form.append("payeeName", payeeName.trim());
      form.append("amount", amount.toString());
      form.append("sahyogType", sahyogType);
      form.append("district", selectedDistrict);
      form.append("location", selectedLocation);
      form.append("paidToUserId", selectedPaidToId);
      form.append("file", file);

      const resp = await fetch("/api/receipts/upload", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setError(json?.message || "Upload failed");
      } else {
        setSuccess(json);
        setTransactionNumber("");
        setTransactionId("");
        setUtr("");
        setPaymentProvider("");
        setTransactionDate("");
        setTransactionTime("");
        setPayerName("");
        setPayeeName("");
        setAmount("");
        setFile(null);
        setSelectedDistrict("");
        setSelectedLocation("");
        setSelectedPaidToId("");
        setPaidToSearch("");
        setExtractedPreview(null);
        await fetchEligibleRecipients();
        try {
          showToast("Your receipt has been successfully uploaded. You can now view it on the View Sahyog Receipt page.", "success");
        } catch (e) {}
        router.refresh();
        router.push("/view-sahyog-receipt");
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
      <p className="mt-2 text-sm text-slate-600">Upload a UPI, bank, or payment app receipt and confirm the extracted details before submission.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label className="label-text">Registered User Name</label>
          <input readOnly value={session?.user?.name ?? ""} className="mt-1 w-full rounded border bg-slate-50 p-2" />
        </div>

        <div>
          <label className="label-text">Amount (₹)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded border p-2" required />
        </div>

        <div>
          <label className="label-text">Sahyog Type</label>
          <select value={sahyogType} onChange={(e) => setSahyogType(e.target.value)} className="mt-1 w-full rounded border p-2" required>
            <option value="Jivandan">Jivandan</option>
            <option value="Kanyadan">Kanyadan</option>
            <option value="Gatiman Sahyog">Gatiman Sahyog</option>
            <option value="Present Maintenance Sahyog">Present Maintenance Sahyog</option>
            <option value="Future Sahyog Type">Future Sahyog Type</option>
          </select>
        </div>

        <div>
          <label className="label-text">Transaction ID</label>
          <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="mt-1 w-full rounded border p-2" placeholder="Enter your transaction ID" required />
        </div>

        <div>
          <label className="label-text">Select District</label>
          <select value={selectedDistrict} onChange={(e) => void handleDistrictChange(e.target.value)} className="mt-1 w-full rounded border p-2" required>
            <option value="">Select district</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">Block / Village / City</label>
          <select
            value={selectedLocation}
            onChange={(e) => void handleLocationChange(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            disabled={!selectedDistrict || locationOptions.length === 0}
            required
          >
            <option value="">{selectedDistrict ? "Select block / village / city" : "Select district first"}</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">Paid To</label>
          <input
            type="text"
            value={paidToSearch}
            onChange={(e) => setPaidToSearch(e.target.value)}
            placeholder={selectedLocation ? "Search recipient name" : "Select location first"}
            className="mt-1 w-full rounded border p-2"
            disabled={!selectedLocation || paidToOptions.length === 0}
          />
          <select
            value={selectedPaidToId}
            onChange={(e) => setSelectedPaidToId(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            disabled={!selectedLocation || paidToOptions.length === 0}
            required
          >
            <option value="">Select Paid To recipient</option>
            {filteredPaidToOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">Upload Receipt Screenshot or PDF</label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => handleFileSelection(e.target.files ? e.target.files[0] : null)}
            className="mt-1 w-full"
            required
          />
          {extracting && <div className="mt-2 text-sm text-slate-600">Extracting payment details from the uploaded receipt…</div>}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 p-3 text-green-800">
            <div className="font-semibold">Receipt uploaded successfully</div>
            <div className="mt-2">Receipt Number: {success?.receipt?.receipt_number ?? "-"}</div>
            <div className="mt-2">Transaction ID: {success?.receipt?.transaction_id ?? "-"}</div>
            <div className="mt-3 flex gap-2">
              <Link href="/view-sahyog-receipt" className="rounded bg-sky-600 px-3 py-1 text-white">
                View Sahyog Receipts
              </Link>
            </div>
          </div>
        )}

        <div>
          <button disabled={loading || extracting} className="btn-primary px-4 py-2">
            {loading ? "Uploading..." : "Upload Receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}
