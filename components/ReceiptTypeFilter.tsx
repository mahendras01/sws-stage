"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

export default function ReceiptTypeFilter({
  selectedType,
  receiptTypes,
}: {
  selectedType: string;
  receiptTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;
    const params = new URLSearchParams(searchParams.toString());

    params.delete("page");

    if (nextValue === "All") {
      params.delete("receiptType");
    } else {
      params.set("receiptType", nextValue);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl);
  };

  return (
    <div className="mb-4 flex justify-end">
      <div className="flex items-center gap-2">
        <label htmlFor="receiptType" className="text-sm font-medium text-slate-700">
          Receipt Type
        </label>
        <select
          id="receiptType"
          name="receiptType"
          value={selectedType}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          onChange={handleChange}
        >
          <option value="All">All</option>
          <option value="Annual Maintenance">Annual Maintenance</option>
          {receiptTypes
            .filter((type) => type !== "Annual Maintenance")
            .map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
