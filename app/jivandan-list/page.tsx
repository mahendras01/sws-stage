import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";
import { getSahyogList } from "@/lib/db";

export const metadata: Metadata = {
  title: "Jivandan List | Self-Welfare Society",
  description: "View the society's life-support and welfare list for members.",
};

export default async function JivandanListPage({ searchParams }: { searchParams?: { q?: string; page?: string } }) {
  const q = searchParams?.q ?? "";
  const page = parseInt(searchParams?.page ?? "1", 10) || 1;
  const pageSize = 20;

  const { data: items = [], count = 0 } = await getSahyogList({ q, page, pageSize, sahyogType: "Jivandan" });
  const rows = items ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return (
    <InfoPageShell title="Jivandan List" intro="Sahyog contributions recorded under Jivandan." breadcrumb={[{ label: "Jivandan List", href: undefined }]}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <form method="get" className="flex w-full max-w-2xl items-center gap-2">
          <input name="q" defaultValue={q} placeholder="Search by name, EHRMS or mobile" className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          <button type="submit" className="btn-primary px-3">Search</button>
        </form>
        <div className="text-sm text-slate-500">Total: {count ?? 0}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="text-left text-sm text-slate-700">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">EHRMS</th>
              <th className="px-3 py-2">User Name</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Block</th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Late User Name</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((row: any, idx: number) => (
              <tr key={row.id} className="border-t bg-white text-sm text-slate-700">
                <td className="px-3 py-2">{(page - 1) * pageSize + idx + 1}</td>
                <td className="px-3 py-2">{row.ehrms_code ?? "-"}</td>
                <td className="px-3 py-2">{row.user_name ?? "-"}</td>
                <td className="px-3 py-2">{row.department ?? "-"}</td>
                <td className="px-3 py-2">{row.block ?? "-"}</td>
                <td className="px-3 py-2">{row.district ?? "-"}</td>
                <td className="px-3 py-2">{row.late_user_name ?? "-"}</td>
                <td className="px-3 py-2">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">No Jivandan records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-slate-600">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          {page > 1 && (<a href={`?q=${encodeURIComponent(q)}&page=${page - 1}`} className="rounded border px-3 py-1 text-sm">Previous</a>)}
          {page < totalPages && (<a href={`?q=${encodeURIComponent(q)}&page=${page + 1}`} className="rounded border px-3 py-1 text-sm">Next</a>)}
        </div>
      </div>
    </InfoPageShell>
  );
}
