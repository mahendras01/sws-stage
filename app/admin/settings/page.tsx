import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const canManage = ["super_admin", "country_co_admin"].includes(session.user.role ?? "");
  if (!canManage) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
      <p className="mt-2 text-slate-600">Manage platform configuration and maintenance settings.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Link
          href="/admin/settings/annual-maintenance"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
        >
          <div className="text-sm font-semibold uppercase tracking-wide text-sky-700">Payments</div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Annual Maintenance Settings</h2>
          <p className="mt-2 text-sm text-slate-600">Update QR code, UPI, bank account, and payment details.</p>
        </Link>
      </div>
    </div>
  );
}
