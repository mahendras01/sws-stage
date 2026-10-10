"use client";

import { useEffect, useState } from "react";

type Props = {
  user: { id: string; name: string; email: string };
  onClose: () => void;
};

type Mode = "manual" | "generate";

export default function ResetPasswordModal({ user, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("generate");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Held only in component state: it disappears when this modal closes (shown to the Super Admin once).
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const done = Boolean(successMessage);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "manual") {
      if (!password || !confirmPassword) {
        setError("Please enter and confirm the new password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("New password and confirm password do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "manual" ? { mode, password, confirmPassword } : { mode }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setError(json.message || "Unable to update the password right now.");
        return;
      }

      setSuccessMessage(json.message || "Password updated.");
      setTemporaryPassword(json.temporaryPassword ?? "");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to update the password right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Please select and copy the password manually.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-title"
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 id="reset-password-title" className="text-lg font-semibold text-gray-900">
          Reset Password
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {user.name} <span className="text-gray-400">({user.email})</span>
        </p>

        {done ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{successMessage}</p>

            {temporaryPassword && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Temporary password (shown only once)</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 select-all break-all rounded bg-white px-3 py-2 font-mono text-base tracking-wide text-gray-900">
                    {temporaryPassword}
                  </code>
                  <button type="button" className="btn-secondary shrink-0" onClick={copyPassword}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-800">
                  Share it with the member securely and ask them to change it after logging in. It cannot be viewed again once you close this window.
                </p>
              </div>
            )}

            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <fieldset className="space-y-2">
              <legend className="label-text">Password option</legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="mode" className="mt-1" checked={mode === "generate"} onChange={() => setMode("generate")} />
                <span>
                  <span className="font-medium text-gray-900">Generate temporary password</span>
                  <span className="block text-xs text-gray-500">A strong random password is created and shown to you once.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="mode" className="mt-1" checked={mode === "manual"} onChange={() => setMode("manual")} />
                <span>
                  <span className="font-medium text-gray-900">Set a new password manually</span>
                </span>
              </label>
            </fieldset>

            {mode === "manual" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="rp-password" className="label-text">
                    New Password
                  </label>
                  <input
                    id="rp-password"
                    className="input-field"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="rp-confirm" className="label-text">
                    Confirm Password
                  </label>
                  <input
                    id="rp-confirm"
                    className="input-field"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                  Show password
                </label>
                <p className="text-xs text-gray-500">
                  Minimum 8 characters.
                </p>
              </div>
            )}

            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : mode === "generate" ? "Generate & Save" : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
