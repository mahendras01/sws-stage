import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      title="Privacy Policy"
      intro="This privacy policy explains how the Self-Welfare Society handles personal and financial information submitted through the platform."
      breadcrumb={[{ label: "Privacy Policy", href: "/privacy-policy" }]}
    >
      <div className="grid gap-6">
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">1. Information Collected</h2>
          <p className="text-sm leading-7 text-slate-700">
            We collect information necessary to process registration, verify identity, maintain welfare records, and support service delivery. This may include personal details, address information, contact information, KYC details, bank details, and account usage data relevant to the society’s operations.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">2. Use of Information</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>Verify eligibility and approve member registration.</li>
            <li>Process welfare claims, support requests, and contributions.</li>
            <li>Maintain accurate membership and financial records.</li>
            <li>Communicate service updates, approvals, and relevant operational notices.</li>
          </ul>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">3. Security and Access</h2>
          <p className="text-sm leading-7 text-slate-700">
            We use reasonable technical and administrative safeguards to protect data from unauthorized access, misuse, alteration, disclosure, or loss. Access is limited to authorized administrators and processes required for approved society operations.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">4. Data Retention</h2>
          <p className="text-sm leading-7 text-slate-700">
            Information is retained only as long as needed for member support, compliance, audit, recordkeeping, and ongoing service delivery. Records may be removed or archived according to the Society&apos;s governance and legal requirements.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">5. Rights and Consent</h2>
          <p className="text-sm leading-7 text-slate-700">
            By registering, you consent to the collection and use of your personal information in line with this policy and the Society&apos;s operational requirements. You may contact the administrators to ask for clarification or update relevant information when required.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary inline-block">
            Back to Registration
          </Link>
          <Link href="/terms" className="btn-secondary inline-block">
            Read Terms
          </Link>
        </div>
      </div>
    </InfoPageShell>
  );
}
