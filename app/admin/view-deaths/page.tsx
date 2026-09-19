"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/components/Toast";
import type { Death } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/validation";

interface ApprovedUser {
  id: string;
  name: string;
}

export default function ViewDeathsPage() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const [deaths, setDeaths] = useState<Death[]>([]);
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");
  const [showContribForm, setShowContribForm] = useState<string | null>(null);
  const [contribForm, setContribForm] = useState({ contributorId: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeaths = () => {
    const statusParam = filter === "all" ? "" : `?status=${filter}`;
    fetch(`/api/deaths/get-all${statusParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.deaths) setDeaths(data.deaths);
      })
      .catch(() => showToast("Failed to load deaths", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session?.user?.role !== "super_admin") {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchDeaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, session]);

  useEffect(() => {
    if (session?.user?.role !== "super_admin") {
      return;
    }

    fetch("/api/admin/approved-users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => {});
  }, [session]);

  const handleCloseDeath = async (deathId: string) => {
    setActionLoading(deathId);
    try {
      const res = await fetch("/api/admin/close-death", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deathId, status: "closed" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Death record closed", "success");
        fetchDeaths();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("Failed to close record", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddContribution = async (deathId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/contributions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deathId,
          contributorId: contribForm.contributorId,
          amount: Number(contribForm.amount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Contribution added", "success");
        setShowContribForm(null);
        setContribForm({ contributorId: "", amount: "" });
        fetchDeaths();
      } else {
        showToast(data.message, "error");
      }
    } catch {
      showToast("Failed to add contribution", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (session?.user?.role !== "super_admin") {
    return (
      <div className="card py-12 text-center">
        <p className="text-lg font-semibold text-gray-900">Access restricted</p>
        <p className="mt-2 text-neutral">Only Super Admin can manage death records.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View Deaths</h1>
          <p className="mt-1 text-neutral">Manage death records and contributions</p>
        </div>

        <div className="flex gap-2">
          {(["all", "active", "closed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === status
                  ? "bg-primary text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {deaths.length === 0 ? (
        <div className="card mt-8 py-12 text-center">
          <p className="text-neutral">No death records found</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {deaths.map((death) => (
            <div key={death.id} className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{death.member_name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        death.status === "active"
                          ? "bg-green-100 text-primary"
                          : "bg-gray-100 text-neutral"
                      }`}
                    >
                      {death.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral">
                    {formatDate(death.death_date)} · Raised:{" "}
                    <span className="font-semibold text-primary">
                      {formatCurrency(death.amount_raised)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/contribution-details/${death.id}`}
                    className="btn-secondary text-sm"
                  >
                    View Contributions
                  </Link>
                  {death.status === "active" && (
                    <>
                      <button
                        onClick={() =>
                          setShowContribForm(showContribForm === death.id ? null : death.id)
                        }
                        className="btn-primary text-sm"
                      >
                        Add Contribution
                      </button>
                      <button
                        onClick={() => handleCloseDeath(death.id)}
                        disabled={actionLoading === death.id}
                        className="btn-danger text-sm"
                      >
                        {actionLoading === death.id ? "..." : "Close"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showContribForm === death.id && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="label-text">Contributor</label>
                      <select
                        value={contribForm.contributorId}
                        onChange={(e) =>
                          setContribForm((prev) => ({ ...prev, contributorId: e.target.value }))
                        }
                        className="input-field"
                      >
                        <option value="">Select member</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Amount (₹)</label>
                      <input
                        type="number"
                        value={contribForm.amount}
                        onChange={(e) =>
                          setContribForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        className="input-field"
                        placeholder="Enter amount"
                        min="1"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => handleAddContribution(death.id)}
                        disabled={
                          submitting || !contribForm.contributorId || !contribForm.amount
                        }
                        className="btn-primary w-full"
                      >
                        {submitting ? "Adding..." : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
