import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Sahyog List | Self-Welfare Society",
  description: "Explore the support categories offered through the society's sahyog initiatives.",
};

export default function SahyogListPage() {
  return (
    <InfoPageShell
      title="Sahyog List"
      intro="A curated list of support services and welfare initiatives created to help members when they need it most."
      breadcrumb={[{ label: "Sahyog List", href: undefined }]}
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Emergency Support", text: "Immediate assistance for urgent and critical situations." },
          { title: "Medical Aid", text: "Support guidance and coordination during healthcare emergencies." },
          { title: "Family Assistance", text: "Help directed toward affected households and dependents." },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
          </div>
        ))}
      </div>
    </InfoPageShell>
  );
}
