"use client";

import { FormEvent, useState } from "react";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, validatePasswordResetInput } from "@/lib/password-reset";

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const nextPassword = password.trim();
    const nextConfirmPassword = confirmPassword.trim();
    const validation = validatePasswordResetInput(nextPassword, nextConfirmPassword);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nextPassword, confirmPassword: nextConfirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update the password right now.");
      }

      setSuccess(data.message || "Password updated successfully.");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update the password right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">UPDATE PASSWORD</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your new password to sign in after a successful update. Password must be {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters.
        </p>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="update-password" className="mb-1 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              id="update-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="update-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <input
              id="update-confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
            Show password
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}