import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import InfoPageShell from "@/components/InfoPageShell";

export default function ForgotPasswordPage() {
  return (
    <InfoPageShell
      title="Forgot Password"
      intro="Enter your registered email address and we will send a secure link to reset your password."
      breadcrumb={[{ label: "Login", href: "/login" }, { label: "Forgot Password" }]}
    >
      <ForgotPasswordForm />
    </InfoPageShell>
  );
}
