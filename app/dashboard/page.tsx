"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DeathCard from "@/components/DeathCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Death } from "@/lib/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deaths, setDeaths] = useState<Death[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!session.user.is_admin) {
      router.replace("/");
      return;
    }

    fetch("/api/deaths/get-all?status=active")
      .then((res) => res.json())
      .then((data) => {
        if (data.deaths) setDeaths(data.deaths);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, session, status]);

  if (status === "loading" || loading) return <LoadingSpinner />;

  if (!session || !session.user.is_admin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-neutral">You do not have permission to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Member Dashboard</h1>
        <p className="mt-1 text-neutral">Active death records requiring society support</p>
      </div>

      {deaths.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-lg text-neutral">No active death records at this time.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deaths.map((death) => (
            <DeathCard key={death.id} death={death} />
          ))}
        </div>
      )}
    </div>
  );
}
