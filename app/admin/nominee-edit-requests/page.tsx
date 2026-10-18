"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type NomineeRequestItem = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  ehrms_code: string | null;
  role_number: string | null;
  reason: string;
  note_path: string;
  note_file_name: string | null;
  note_mime_type: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  admin_note: string | null;
};

export default function NomineeEditRequestsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<NomineeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAllowed = session?.user?.role === "super_admin" || session?.user?.role === "country_co_admin";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!isAllowed) {
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/admin/nominee-edit-requests", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load requests.");
        }
        setRequests(data.requests ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load requests.");
      } finally {
        setLoading(false);
      }
    };

    void fetchRequests();
  }, [isAllowed, status]);

  const handleDecision = async (requestId: string, action: "approve" | "reject") => {
    setError(null);
    setSuccess(null);
    setSavingId(requestId);

    try {
      const response = await fetch("/api/admin/nominee-edit-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, adminNote: "Reviewed by admin" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to update request.");
      }

      setSuccess(data.message || "Request updated successfully.");
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unable to update request.");
    } finally {
      setSavingId(null);
    }
  };

  const getAttachmentUrl = (requestId: string) => `/api/admin/nominee-edit-requests/attachment?requestId=${encodeURIComponent(requestId)}`;

  if (status === "loading" || loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading nominee change requests...</div>;
  }

  if (!isAllowed) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Access restricted to country-level admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nominee Change Requests</h1>
        <p className="mt-1 text-sm text-slate-600">Review handwritten nominee change requests and approve or reject access to update nominee details.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No pending nominee change requests.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{request.user_name ?? "Unknown user"}</span>
                    <span>•</span>
                    <span>{request.user_email ?? "No email"}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>EHRMS: {request.ehrms_code ?? "N/A"}</div>
                    <div>Role Number: {request.role_number ?? "N/A"}</div>
                  </div>
                  <div className="text-sm text-slate-700">
                    <span className="font-medium">Reason:</span> {request.reason || "No reason provided"}
                  </div>
                  <div className="text-xs text-slate-500">Submitted: {new Date(request.created_at).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Stored note file: {request.note_file_name ?? request.note_path}</div>

                  {(request.note_file_name || request.note_path) && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attachment preview</div>
                      {request.note_mime_type?.startsWith("image/") ? (
                        <Image src={getAttachmentUrl(request.id)} alt="Nominee change request attachment" width={800} height={600} unoptimized className="max-h-72 w-auto rounded-lg border border-slate-200 bg-white object-contain" />
                      ) : (
                        <iframe src={getAttachmentUrl(request.id)} title="Nominee change request attachment preview" className="h-72 w-full rounded-lg border border-slate-200 bg-white" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision(request.id, "approve")}
                    disabled={savingId === request.id}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingId === request.id ? "Processing..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(request.id, "reject")}
                    disabled={savingId === request.id}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingId === request.id ? "Processing..." : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
