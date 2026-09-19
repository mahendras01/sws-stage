import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import SignupForm from "@/components/SignupForm";

export default async function SignupPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect(session.user.is_admin ? "/dashboard" : "/");

  return (
    <div className="px-4 py-12">
      <SignupForm />
    </div>
  );
}
