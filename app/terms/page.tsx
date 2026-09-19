import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";

export default function TermsPage() {
  return (
    <InfoPageShell
      title="Terms and Conditions"
      intro="These terms govern how members interact with the Self-Welfare Society platform and how their information is used for registration, approval, and welfare administration."
      breadcrumb={[{ label: "Terms and Conditions", href: "/terms" }]}
    >
      <div className="grid gap-6">
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">1. Purpose of the Platform</h2>
          <p className="text-sm leading-7 text-slate-700">
            The platform is intended to help registered members request support, contribute to welfare initiatives,
            and participate in society-led activities. The platform is not a substitute for legal, financial, or medical advice.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">2. Member Responsibilities</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>Provide truthful and complete information during registration and updates.</li>
            <li>Use the platform only for legitimate welfare and society-related purposes.</li>
            <li>Maintain the confidentiality of account credentials and personal information.</li>
            <li>Comply with admin decisions, eligibility rules, and applicable local laws.</li>
          </ul>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">3. Approval and Access</h2>
          <p className="text-sm leading-7 text-slate-700">
            Membership access is subject to review and approval. The Society may reject, suspend, or restrict account access if the supplied information is inaccurate, incomplete, or contrary to the stated rules.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">4. Data Use</h2>
          <p className="text-sm leading-7 text-slate-700">
            The Society may use member data to verify identity, process welfare requests, maintain records, and communicate operational updates. This information is stored securely and used only for authorized society purposes.
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">5. Contact and Updates</h2>
          <p className="text-sm leading-7 text-slate-700">
            Members may contact the Society administrator for clarifications about eligibility, policy, or dispute resolution. The Society may update these terms from time to time and will publish revised notices as needed.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary inline-block">
            Back to Registration
          </Link>
          <Link href="/privacy-policy" className="btn-secondary inline-block">
            Read Privacy Policy
          </Link>
        </div>
      </div>
    </InfoPageShell>
  );
}
