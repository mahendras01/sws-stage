"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";

type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  district?: string | null;
  district_id?: string | null;
  is_active?: boolean;
};

export default function ManageAdminsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = session?.user?.role === "super_admin";

  useEffect(() => {
    if (status !== "loading" && !isSuperAdmin) {
      router.push("/admin");
    }
  }, [status, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void fetchAdmins();
  }, [isSuperAdmin]);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (data.admins) setAdmins(data.admins);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(admin: Admin) {
    try {
      const validDistrictId = admin.district_id && /^[0-9a-fA-F-]{36}$/.test(admin.district_id) ? admin.district_id : "";

      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          district: admin.district ?? "",
          district_id: validDistrictId,
          is_active: !admin.is_active,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to update admin status");
      }
      await fetchAdmins();
    } catch (e) {
      console.error(e);
      alert("Failed to update admin status");
    }
  }

  if (status === "loading") return <LoadingSpinner />;
  if (!isSuperAdmin) return null;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Manage Admins</h1>

      <div className="mb-4 rounded border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-neutral">Existing admins created through the admin management flow.</p>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white shadow-sm">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">District</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2">{a.email}</td>
                  <td className="px-3 py-2">{a.role}</td>
                  <td className="px-3 py-2">{a.district ?? "-"}</td>
                  <td className="px-3 py-2">{a.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    <button type="button" className="btn btn-primary" onClick={() => handleToggleActive(a)}>
                      {a.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
