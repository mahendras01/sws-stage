"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ContributionCard from "@/components/ContributionCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Contribution, Death } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/validation";

export default function ContributionDetailsPage() {
  const params = useParams();
  const deathId = params.deathId as string;

  const [death, setDeath] = useState<Death | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/deaths/get-by-id?deathId=${deathId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDeath(data.death);
          setContributions(data.contributions);
        } else {
          setError(data.message || "Failed to load details");
        }
      })
      .catch(() => setError("Failed to load details"))
      .finally(() => setLoading(false));
  }, [deathId]);

  if (loading) return <LoadingSpinner />;

  if (error || !death) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-danger">{error || "Record not found"}</p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const targetAmount = 50000;
  const progressPercent = Math.min((death.amount_raised / targetAmount) * 100, 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        ← Back to Dashboard
      </Link>

      <div className="card mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{death.member_name}</h1>
        <p className="mt-1 text-neutral">Death Date: {formatDate(death.death_date)}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {death.age != null && (
            <div>
              <p className="text-xs font-medium uppercase text-neutral">Age at Death</p>
              <p className="font-medium text-gray-900">{death.age} years</p>
            </div>
          )}
          {death.cause_of_death && (
            <div>
              <p className="text-xs font-medium uppercase text-neutral">Cause of Death</p>
              <p className="font-medium text-gray-900">{death.cause_of_death}</p>
            </div>
          )}
          {death.family_info && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase text-neutral">Family Information</p>
              <p className="font-medium text-gray-900">{death.family_info}</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Total Amount Raised</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(death.amount_raised)}</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Contributions</h2>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-primary">
            {contributions.length} contributor{contributions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {contributions.length === 0 ? (
          <p className="py-8 text-center text-neutral">No contributions recorded yet.</p>
        ) : (
          <div>
            {contributions.map((contribution) => (
              <ContributionCard key={contribution.id} contribution={contribution} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
