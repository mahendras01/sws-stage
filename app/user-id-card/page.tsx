import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCurrentUserIdCardData } from "@/lib/user-id-card";

const fieldLabels = [
  { key: "ehrms_code", label: "EHRMS Code" },
  { key: "swsId", label: "SWS ID" },
  { key: "email", label: "Email" },
  { key: "gender", label: "Gender" },
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "phone_number", label: "Mobile" },
  { key: "phone_home", label: "Mobile (Home)" },
  { key: "blood_group", label: "Blood Group" },
] as const;

function formatFieldValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return "—";
  }

  if (key === "date_of_birth" && typeof value === "string") {
    const [year, month, day] = value.split("-");
    if (year && month && day) {
      const date = new Date(`${year}-${month}-${day}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }

    return value;
  }

  return String(value);
}

export default async function UserIdCardPage() {
  const session = await getSession();

  if (!session?.user || session.user.status !== "approved") {
    redirect("/login");
  }

  const { user, swsId, error } = await getCurrentUserIdCardData(session.user.id);

  if (error || !user) {
    redirect("/profile");
  }

  const profile = {
    ehrms_code: user.ehrms_code ?? "—",
    swsId: swsId ?? "—",
    email: user.email ?? "—",
    gender: user.gender ?? "—",
    date_of_birth: user.date_of_birth ?? "—",
    phone_number: user.phone_number ?? "—",
    phone_home: user.phone_home ?? "—",
    blood_group: user.blood_group ?? "—",
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Member</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">User ID Card</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/user/id-card"
            download="user-id-card.pdf"
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
          >
            Download ID Card (PDF)
          </a>
          <Link
            href="/profile"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to Profile
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-700 px-6 py-5 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-200">SELF WELFARE SOCIETY</p>
              <h2 className="mt-2 text-2xl font-bold">{user.name || "Member"}</h2>
            </div>
            <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100">
              {profile.swsId}
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
          {fieldLabels.map(({ key, label }) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 break-words text-base font-semibold text-slate-900">
                {formatFieldValue(key, (profile as Record<string, unknown>)[key])}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
