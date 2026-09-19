import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Contact | Self-Welfare Society",
  description: "Get in touch with the Self-Welfare Society for support and inquiries.",
};

export default function ContactPage() {
  return (
    <InfoPageShell
      title="Contact"
      intro="Reach out to us for inquiries, support coordination, or general information about our welfare activities."
      breadcrumb={[{ label: "Contact", href: undefined }]}
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Get in Touch</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Phone</p>
              <p className="mt-1">+91 12345 67890</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Email</p>
              <p className="mt-1">support@example.org</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Office</p>
              <p className="mt-1">Community Centre, Local District</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-sky-50 p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">What to Expect</h3>
          <p className="mt-4 text-base leading-8 text-slate-600">
            We will review your message and connect you with the appropriate support path as quickly as possible.
          </p>
          <div className="mt-6 rounded-xl border border-sky-200 bg-white p-4 text-sm text-slate-700">
            Please note that this page is a placeholder for contact information and can be expanded with a real form or office details later.
          </div>
        </div>
      </div>
    </InfoPageShell>
  );
}
