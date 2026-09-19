import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Jivandan List | Self-Welfare Society",
  description: "View the society's life-support and welfare list for members.",
};

export default function JivandanListPage() {
  return (
    <InfoPageShell
      title="Jivandan List"
      intro="This section highlights initiatives aligned with compassionate support and member care."
      breadcrumb={[{ label: "Jivandan List", href: undefined }]}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Planned Support Areas</h2>
        <p className="mt-4 text-base leading-8 text-slate-600">
          The Jivandan List includes planned support and welfare activities focused on uplifting members and their families
          with dignity and care.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            "Member welfare coordination",
            "Family support planning",
            "Community outreach",
            "Trusted follow-up support",
          ].map((item) => (
            <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>
    </InfoPageShell>
  );
}
