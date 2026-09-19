"use client";

import { useState } from "react";

interface RejectModalProps {
  userName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function RejectModal({ userName, onConfirm, onCancel, loading }: RejectModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">Reject Application</h3>
        <p className="mt-1 text-sm text-neutral">
          Please provide a reason for rejecting <strong>{userName}</strong>&apos;s application.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input-field mt-4 min-h-[100px] resize-y"
          placeholder="Enter rejection reason..."
        />

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim()}
            className="btn-danger"
          >
            {loading ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
