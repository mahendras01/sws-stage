"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import RejectModal from "@/components/RejectModal";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/validation";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  aadhar_number: string;
  pan_number: string;
  role_number?: string | null;
  father_husband_name?: string | null;
  nominee_aadhar_number?: string | null;
  reference_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_holder_name?: string | null;
  phone_number: string;
  house_flat_no?: string | null;
  street_locality?: string | null;
  landmark?: string | null;
  village_city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  status?: string | null;
  created_at: string;
}

export default function ApproveMembersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectUser, setRejectUser] = useState<PendingUser | null>(null);
  const [adminRole, setAdminRole] = useState<string>("user");
  const [adminDistrict, setAdminDistrict] = useState<string | null>(null);

  const fetchUsers = () => {
    fetch("/api/admin/pending-users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
        if (data.role) setAdminRole(data.role);
        if (data.district) setAdminDistrict(data.district);
      })
      .catch(() => showToast("Failed to load pending users", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maskValue = (value?: string | null, visibleChars = 4) => {
    if (!value) return "—";
    const trimmed = value.toString().trim();
    if (trimmed.length <= visibleChars) return trimmed;
    const visible = trimmed.slice(-visibleChars);
    return `${"*".repeat(Math.max(0, trimmed.length - visibleChars))}${visible}`;
  };

  const formatAddress = (user: PendingUser) => {
    const addressParts = [
      user.house_flat_no,
      user.street_locality,
      user.landmark,
      user.village_city,
      user.district,
      user.state,
      user.pincode,
      user.country,
    ].filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(", ") : "—";
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      let approvalReason: string | undefined;
      if (adminRole === "super_admin" || adminRole === "country_co_admin") {
        approvalReason = window.prompt("Reason for Admin Approval", "")?.trim();
        if (!approvalReason) {
          showToast("Reason for Admin Approval is required", "error");
          setActionLoading(null);
          return;
        }
      }

      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approved: true, approvalReason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("User approved", "success");
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("Failed to approve user", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectUser) return;
    setActionLoading(rejectUser.id);
    try {
      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: rejectUser.id, approved: false, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("User rejected", "success");
        setUsers((prev) => prev.filter((u) => u.id !== rejectUser.id));
        setRejectUser(null);
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("Failed to reject user", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (adminRole !== "super_admin") {
    return (
      <div className="card mt-8 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="mt-3 text-neutral">Only the Super Admin can approve or reject new registrations.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
      <p className="mt-1 text-neutral">Review and approve new member registrations</p>

      {users.length === 0 ? (
        <div className="card mt-8 py-12 text-center">
          <p className="text-neutral">No pending approvals</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {users.map((user) => (
            <div key={user.id} className="card space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Full Name</p>
                      <p className="font-medium text-gray-900">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Email</p>
                      <p className="font-medium text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Phone Number</p>
                      <p className="font-medium text-gray-900">{user.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Aadhar Number</p>
                      <p className="font-medium text-gray-900">{maskValue(user.aadhar_number, 4)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">PAN Number</p>
                      <p className="font-medium text-gray-900">{maskValue(user.pan_number, 2)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Role Number</p>
                      <p className="font-medium text-gray-900">{user.role_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Father&apos;s Name</p>
                      <p className="font-medium text-gray-900">{user.father_husband_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Nominee Aadhaar</p>
                      <p className="font-medium text-gray-900">{maskValue(user.nominee_aadhar_number, 4)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Reference Name</p>
                      <p className="font-medium text-gray-900">{user.reference_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Bank Account</p>
                      <p className="font-medium text-gray-900">{maskValue(user.bank_account_number, 4)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Bank IFSC</p>
                      <p className="font-medium text-gray-900">{user.bank_ifsc_code || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Bank Holder</p>
                      <p className="font-medium text-gray-900">{user.bank_holder_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Registration Date</p>
                      <p className="font-medium text-gray-900">{formatDate(user.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-neutral">Account Status</p>
                      <p className="font-medium text-gray-900">{user.status || "Pending"}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase text-neutral">Full Address</p>
                    <p className="mt-2 text-sm text-gray-700">{formatAddress(user)}</p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-3">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={actionLoading === user.id}
                    className="btn-primary"
                  >
                    {actionLoading === user.id ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejectUser(user)}
                    disabled={actionLoading === user.id}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectUser && (
        <RejectModal
          userName={rejectUser.name}
          onConfirm={handleReject}
          onCancel={() => setRejectUser(null)}
          loading={actionLoading === rejectUser.id}
        />
      )}
    </div>
  );
}
