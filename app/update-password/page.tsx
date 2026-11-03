import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import UpdatePasswordForm from "@/components/UpdatePasswordForm";
import { authOptions } from "@/lib/auth-options";

export default async function UpdatePasswordPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <UpdatePasswordForm />
    </div>
  );
}