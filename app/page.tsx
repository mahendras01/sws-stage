"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HeroSlider from "@/components/HeroSlider";

type PublicLabharthiRow = {
  id: string;
  serial_number: number | null;
  ehrms_code: string | null;
  labharthi_name: string;
  role_number: string | null;
  amount_sender_name: string;
  district: string | null;
  village_city: string | null;
};

const PAGE_SIZE = 10;

export default function HomePage() {
  const [rows, setRows] = useState<PublicLabharthiRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/deaths/public?page=${page}&pageSize=${PAGE_SIZE}`);
        const data = await res.json();
        setRows(data.records ?? []);
        setTotalPages(data.totalPages ?? 1);
      } catch {
        setRows([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    void loadRecords();
  }, [page]);

  return (
    <div>
      <HeroSlider />

      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Community Support</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">View Labharthi Records</h2>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Serial Number</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">EHRMS</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Labharthi Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Role Number</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Amount Sender Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">District</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Block / Village / City</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral">
                        Loading records...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral">
                        No labharthi records found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-800">{row.serial_number ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-800">{row.ehrms_code || "-"}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.labharthi_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-800">{row.role_number || "-"}</td>
                        <td className="px-4 py-3 text-slate-800">{row.amount_sender_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-800">{row.district || "-"}</td>
                        <td className="px-4 py-3 text-slate-800">{row.village_city || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && rows.length > 0 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </p>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Registration Guidance
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
              New User Registration – Important Validation Details
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Aadhaar number must be exactly 12 digits.",
              "PAN number must follow the valid PAN format.",
              "Date of birth is mandatory and must be based on Aadhaar.",
              "Registration is allowed only for members aged 18 to 55 years.",
              "Membership expires automatically when the member reaches 60 years of age.",
              "Password must be at least 8 characters long.",
              "Phone number and nominee mobile number must be exactly 10 digits.",
              "Nominee Aadhaar number must be exactly 12 digits.",
              "PIN code must be exactly 6 digits and match the address details.",
              "All required address, department, and post selections must be completed before registration.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    ✓
                  </span>
                  <p className="text-sm leading-6 text-slate-700 sm:text-base">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
