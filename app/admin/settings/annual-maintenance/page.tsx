/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MAX_QR_BYTES, validateQrImageFile } from "@/lib/image-file-validation";

type Settings = {
  id?: string;
  fee_amount?: number | string | null;
  qr_code_url?: string | null;
  upi_id?: string | null;
  account_holder_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

function toQrImageSrc(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("annual-maintenance/")) return `/${trimmed}`;
  return `/annual-maintenance/${trimmed.replace(/^\/+/, "")}`;
}

const emptySettings: Settings = {
  fee_amount: "",
  qr_code_url: "",
  upi_id: "",
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  notes: "",
  is_active: true,
};

export default function AnnualMaintenanceSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<Settings>(emptySettings);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = ["super_admin", "country_co_admin"].includes(session?.user?.role ?? "");

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/annual-maintenance-settings", { cache: "no-store" });
      const json = await res.json();
      if (json.settings) {
        setForm({
          ...emptySettings,
          ...json.settings,
        });
      }
    } catch {
      // Ignore fetch errors here; the form can still be edited and saved.
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (!canManage) {
      router.push("/");
      return;
    }

    void loadSettings();
  }, [status, session, canManage, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetQrSelection = () => {
    setQrFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const handleQrSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      resetQrSelection();
      return;
    }

    const validation = await validateQrImageFile(selected);
    if (!validation.valid) {
      setError(validation.error ?? "QR code image could not be loaded. Please upload a valid PNG, JPG, JPEG, or WebP file.");
      resetQrSelection();
      event.target.value = "";
      return;
    }

    setQrFile(selected);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(selected);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSaving(true);
    setError("");
    setSuccess("");

    const feeAmount = Number(form.fee_amount ?? 0);
    const accountNumber = String(form.account_number ?? "").trim();
    const ifscCode = String(form.ifsc_code ?? "").trim();
    const upiId = String(form.upi_id ?? "").trim();

    if (!form.fee_amount || !Number.isFinite(feeAmount) || feeAmount <= 0) {
      setError("Annual maintenance fee amount must be greater than zero.");
      setSaving(false);
      return;
    }

    if (accountNumber && !/^[0-9A-Za-z\-\s]{8,25}$/.test(accountNumber)) {
      setError("Account number must contain 8 to 25 digits or alphanumeric characters.");
      setSaving(false);
      return;
    }

    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) {
      setError("IFSC code must be in the format ABCD0123456.");
      setSaving(false);
      return;
    }

    if (upiId && !/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(upiId)) {
      setError("UPI ID must be in the format name@upi.");
      setSaving(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("fee_amount", String(form.fee_amount));
      fd.append("upi_id", String(form.upi_id ?? ""));
      fd.append("account_holder_name", String(form.account_holder_name ?? ""));
      fd.append("bank_name", String(form.bank_name ?? ""));
      fd.append("account_number", String(form.account_number ?? ""));
      fd.append("ifsc_code", String(form.ifsc_code ?? ""));
      fd.append("branch_name", String(form.branch_name ?? ""));
      fd.append("notes", String(form.notes ?? ""));
      fd.append("is_active", String(form.is_active ?? true));
      if (form.qr_code_url) fd.append("qr_code_url", form.qr_code_url);
      if (qrFile) fd.append("qr_code", qrFile);

      const res = await fetch("/api/admin/annual-maintenance-settings", {
        method: "PUT",
        body: fd,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save settings");
      }

      const savedQrUrl = json.settings?.qr_code_url ?? form.qr_code_url ?? null;
      setForm((prev) => ({
        ...prev,
        ...json.settings,
        qr_code_url: savedQrUrl,
      }));
      setSuccess("Annual Maintenance payment settings updated successfully.");
      setQrFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }

  if (!canManage) {
    return <div className="p-8 text-slate-500">You do not have permission to access this page.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Admin Settings</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Annual Maintenance Payment Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Annual Maintenance Fee Amount</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.fee_amount ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, fee_amount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="2999"
              required
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>Active Status</span>
            <select
              value={form.is_active === false ? "inactive" : "active"}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "active" }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>QR Code Image Upload</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleQrSelection}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            />
            {(previewUrl || form.qr_code_url) && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={previewUrl || toQrImageSrc(form.qr_code_url)}
                  alt="Current QR Code"
                  className="h-20 w-20 rounded-lg border bg-slate-50 object-contain"
                  onError={() => setError("QR code image could not be loaded. Please upload a valid PNG, JPG, JPEG, or WebP file.")}
                />
                <span className="text-xs text-slate-500">{previewUrl ? "New QR code preview" : "Current QR code on file"}</span>
              </div>
            )}
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>UPI ID</span>
            <input
              value={form.upi_id ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, upi_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="yourupi@upi"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>Account Holder Name</span>
            <input
              value={form.account_holder_name ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Account holder name"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>Bank Name</span>
            <input
              value={form.bank_name ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Bank name"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>Branch Name</span>
            <input
              value={form.branch_name ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Branch name"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>IFSC Code</span>
            <input
              value={form.ifsc_code ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, ifsc_code: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="SBIN0001234"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>Account Number</span>
            <input
              value={form.account_number ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Account number"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>Notes</span>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Optional payment instructions or restrictions"
            />
          </label>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
