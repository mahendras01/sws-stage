import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Kanyadan List | Self-Welfare Society",
  description: "Browse the society's community support and family welfare activities.",
};

export default function KanyadanListPage() {
  return (
    <InfoPageShell
      title="Kanyadan List"
      intro="This page outlines community support initiatives focused on care, responsibility, and long-term welfare."
      breadcrumb={[{ label: "Kanyadan List", href: undefined }]}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Support Highlights</h2>
        <p className="mt-4 text-base leading-8 text-slate-600">
          The Society continues to build meaningful support systems that reinforce family welfare and strengthen community ties.
        </p>
        <div className="mt-6 space-y-3 text-sm text-slate-700">
          <div className="rounded-xl border border-slate-200 p-4">Community-led welfare planning</div>
          <div className="rounded-xl border border-slate-200 p-4">Support for individual and family needs</div>
          <div className="rounded-xl border border-slate-200 p-4">Structured outreach and coordination</div>
        </div>
      </div>
    </InfoPageShell>
  );
}
