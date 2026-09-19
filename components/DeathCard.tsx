"use client";

import Link from "next/link";
import type { Death } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/validation";

interface DeathCardProps {
  death: Death;
}

export default function DeathCard({ death }: DeathCardProps) {
  return (
    <div className="card flex flex-col transition-shadow hover:shadow-md">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">{death.member_name}</h3>
        <p className="mt-1 text-sm text-neutral">{formatDate(death.death_date)}</p>
      </div>

      <div className="mb-4 flex-1 space-y-2 text-sm text-gray-600">
        {death.age != null && (
          <p>
            <span className="font-medium text-gray-700">Age:</span> {death.age} years
          </p>
        )}
        {death.cause_of_death && (
          <p>
            <span className="font-medium text-gray-700">Cause:</span> {death.cause_of_death}
          </p>
        )}
        {death.family_info && (
          <p>
            <span className="font-medium text-gray-700">Family:</span> {death.family_info}
          </p>
        )}
      </div>

      <div className="mb-4 rounded-lg bg-green-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Total Raised</p>
        <p className="text-2xl font-bold text-primary">{formatCurrency(death.amount_raised)}</p>
      </div>

      <Link
        href={`/contribution-details/${death.id}`}
        className="btn-primary w-full text-center"
      >
        सहयोग विवरण
      </Link>
    </div>
  );
}
