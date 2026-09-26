"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  rejectedUsers: number;
  deaths: number;
  contributions: number;
  isDistrictAdmin: boolean;
  district: string | null;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const isDistrictAdmin = session?.user?.role === "district_admin" || session?.user?.role === "district_co_admin";
  const isCountryLevelAdmin = session?.user?.role === "super_admin" || session?.user?.role === "country_co_admin";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-1 text-neutral">
        {isDistrictAdmin && stats?.district
          ? `District-scoped overview for ${stats.district}`
          : "Manage members, deaths, and contributions"}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/approve-members" className="card transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-neutral">Pending Approvals</p>
          <p className="mt-2 text-3xl font-bold text-primary">{stats?.pendingUsers ?? 0}</p>
        </Link>

        <Link href="/admin/registered-members" className="card transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-neutral">Registered Members</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.approvedUsers ?? 0}</p>
        </Link>

        <div className="card transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-neutral">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.totalUsers ?? 0}</p>
        </div>

        <div className="card transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-neutral">Rejected Users</p>
          <p className="mt-2 text-3xl font-bold text-danger">{stats?.rejectedUsers ?? 0}</p>
        </div>

        <div className="card transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-neutral">Death Records</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.deaths ?? 0}</p>
        </div>

        <div className="card transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-neutral">Contributions</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.contributions ?? 0}</p>
        </div>

        {!isDistrictAdmin && (
          <Link href="/admin/add-death" className="card transition-shadow hover:shadow-md">
            <p className="text-sm font-medium text-neutral">Quick Action</p>
            <p className="mt-2 text-lg font-semibold text-primary">+ Add Labharthi Records</p>
          </Link>
        )}

        {isCountryLevelAdmin && (
          <>
            <Link href="/admin/create-admin" className="card transition-shadow hover:shadow-md">
              <p className="text-sm font-medium text-neutral">Admin Access</p>
              <p className="mt-2 text-lg font-semibold text-primary">Create Admin</p>
            </Link>

            <Link href="/admin/manage-admins" className="card transition-shadow hover:shadow-md">
              <p className="text-sm font-medium text-neutral">Admin Access</p>
              <p className="mt-2 text-lg font-semibold text-primary">Manage Admins</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
