import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import ProfileForm from "@/components/ProfileForm";
import { authOptions } from "@/lib/auth-options";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <ProfileForm />
    </div>
  );
}
