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

export default function AnnualMaintenancePage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/annual-maintenance")
      .then(async (res) => {
        const json = await readJsonResponse(res);
        setSettings(json?.settings ?? null);
      })
      .catch(() => setSettings(null));
  }, []);

  if (status === "loading") {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-slate-500">Loading payment details...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Annual Maintenance</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">व्यवस्था संचालन हेतु व्यवस्था शुल्क भुगतान</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          This payment is strictly for website maintenance and other related administrative/technical work. It is separate from all Sahyog payments.
        </p>
      </div>

      <div className="grid min-w-0 gap-6">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">व्यवस्था शुल्क भुगतान विवरण</h2>

          {!session ? (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              Please <a href="/login" className="font-semibold underline">login</a> to view the annual maintenance payment details.
            </div>
          ) : settings ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account Holder Name</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">{settings.account_holder_name || "Self-Welfare Society"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account No.</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">{settings.account_number || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">IFSC Code</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">{settings.ifsc_code || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bank Address</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">{settings.bank_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">{settings.branch_name || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">₹{Number(settings.fee_amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                {settings.qr_code_url ? (
                  <div className="flex max-w-[240px] justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 sm:max-w-[280px]">
                    <img src={settings.qr_code_url} alt="Annual Maintenance QR Code" className="h-48 w-48 rounded-lg object-contain bg-white sm:h-56 sm:w-56" />
                  </div>
                ) : (
                  <div className="w-full max-w-md rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    QR code will be available here once admin updates the settings.
                  </div>
                )}
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
      </div>
    </div>
  );
}
