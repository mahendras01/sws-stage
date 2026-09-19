import { Suspense } from "react";

import InfoPageShell from "@/components/InfoPageShell";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <InfoPageShell
      title="Reset Password"
      intro="Set a new password for your account. Choose a strong password that matches the security requirements."
      breadcrumb={[{ label: "Login", href: "/login" }, { label: "Reset Password" }]}
    >
      <Suspense fallback={<div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center text-slate-600">Loading reset form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </InfoPageShell>
  );
}
