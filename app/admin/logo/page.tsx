"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type LogoMeta = {
  file_name: string;
  mime_type: string;
  size_bytes: number;
  updated_at: string;
  version: number;
};

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function LogoManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [logo, setLogo] = useState<LogoMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSuperAdmin = session?.user?.role === "super_admin";

  const loadLogo = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logo", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load logo.");
        return;
      }
      setLogo(json.logo ?? null);
    } catch {
      setError("Failed to load logo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/admin");
      return;
    }
    void loadLogo();
  }, [status, session, isSuperAdmin, router, loadLogo]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      clearSelection();
      return;
    }
    if (!ACCEPTED.includes(selected.type)) {
      setError("Logo must be a PNG, JPG or WebP image.");
      clearSelection();
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("Logo is too large. Maximum size is 2 MB.");
      clearSelection();
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("logo", file);
      const res = await fetch("/api/admin/logo", { method: "PUT", body });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save logo.");
        return;
      }
      setLogo(json.logo ?? null);
      clearSelection();
      flash(logo ? "Logo replaced." : "Logo uploaded.");
      router.refresh();
    } catch {
      setError("Failed to save logo.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete the current logo? The default SWS badge will be shown instead.")) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/logo", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to delete logo.");
        return;
      }
      setLogo(null);
      clearSelection();
      flash("Logo deleted.");
      router.refresh();
    } catch {
      setError("Failed to delete logo.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || !isSuperAdmin) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logo Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload, replace or delete the website logo. It is shown in the site header and on generated receipts.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900">Current Logo</h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading...</p>
          ) : logo ? (
            <>
              <div className="mt-4 flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/logo?v=${logo.version}`}
                  alt="Current logo"
                  className="max-h-32 w-auto max-w-full object-contain"
                />
              </div>
              <dl className="mt-4 space-y-1 text-sm text-gray-700">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">File</dt>
                  <dd className="break-all text-right">{logo.file_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Size</dt>
                  <dd>{formatSize(logo.size_bytes)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Updated</dt>
                  <dd>{new Date(logo.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
              <button type="button" className="btn-danger mt-4" onClick={handleDelete} disabled={busy}>
                Delete Logo
              </button>
            </>
          ) : (
            <div className="mt-4 flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-[0.78rem] font-extrabold tracking-[0.14em] text-primary">
                SWS
              </div>
              <p className="text-sm text-gray-600">No logo uploaded. The default SWS badge is being shown.</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900">{logo ? "Replace Logo" : "Upload Logo"}</h2>
          <p className="mt-1 text-sm text-gray-600">PNG, JPG or WebP, up to 2 MB. A transparent PNG with a wide or square shape works best.</p>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSelect}
            disabled={busy}
            className="mt-4 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-dark"
          />

          {previewUrl && file && (
            <div className="mt-4">
              <p className="label-text">Preview (header size)</p>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Selected logo preview" className="h-12 w-auto max-w-[180px] object-contain" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-gray-900">Self-Welfare Society</p>
                  <p className="truncate text-gray-500">
                    {file.name} ({formatSize(file.size)})
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="button" className="btn-primary" onClick={handleUpload} disabled={busy}>
                  {busy ? "Saving..." : logo ? "Replace Logo" : "Upload Logo"}
                </button>
                <button type="button" className="btn-secondary" onClick={clearSelection} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
