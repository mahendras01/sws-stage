import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "About Us | Self-Welfare Society",
  description: "Learn about the mission and values of the Self-Welfare Society.",
};

export default function AboutUsPage() {
  return (
    <InfoPageShell
      title="About Us"
      intro="We work to strengthen community welfare through compassion, practical support, and trusted service."
      breadcrumb={[{ label: "About Us", href: undefined }]}
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Our Mission</h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            The Self-Welfare Society is focused on helping families and individuals during difficult circumstances
            by providing guidance, support, and coordinated community service.
          </p>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Our work is grounded in transparency, respect, and a commitment to building a stronger support network.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-sky-50 p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">What We Focus On</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>• Community welfare and assistance</li>
            <li>• Transparent member support services</li>
            <li>• Timely coordination for emergencies</li>
            <li>• A trusted network of volunteers and families</li>
          </ul>
        </div>
      </div>
    </InfoPageShell>
  );
}
