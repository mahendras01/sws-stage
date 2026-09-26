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

      <div className="bg-gray-50 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Self-Welfare Society
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral">
              A mutual aid platform where members contribute to help families during emergencies and
              difficult times. Together, we support each other.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup" className="btn-primary px-8 py-3 text-base">
                Join the Society
              </Link>
              <Link href="/login" className="btn-secondary px-8 py-3 text-base">
                Member Login
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Register & Verify",
                desc: "Sign up with KYC details. Admin verifies and approves your membership.",
              },
              {
                title: "Stay Informed",
                desc: "View death records and contribution history of fellow society members.",
              },
              {
                title: "Mutual Support",
                desc: "Contribute via bank transfer to help families in their time of need.",
              },
            ].map((item) => (
              <div key={item.title} className="card text-center">
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-neutral">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
