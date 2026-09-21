"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const galleryTypes = [
  { value: "achievement", label: "Achievement" },
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
] as const;

type GalleryItem = {
  id: string;
  type: "achievement" | "photo" | "video";
  title: string;
  description?: string | null;
  media_url?: string | null;
  external_link?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

const emptyForm = {
  id: "",
  type: "achievement" as GalleryItem["type"],
  title: "",
  description: "",
  media_url: "",
  external_link: "",
  sort_order: "0",
  is_active: true,
};

export default function AdminGalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGalleryManager = useMemo(
    () => ["super_admin", "country_co_admin", "district_admin", "district_co_admin"].includes(session?.user?.role ?? ""),
    [session?.user?.role],
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }

    if (!isGalleryManager) {
      router.push("/");
      return;
    }

    void fetchGallery();
  }, [status, session, isGalleryManager, router]);

  const fetchGallery = async () => {
    const res = await fetch("/api/gallery?includeInactive=true");
    const json = await res.json();
    setItems(json.items ?? []);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        id: form.id || undefined,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        media_url: form.media_url.trim(),
        external_link: form.external_link.trim(),
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active,
      };

      if (!payload.title) {
        throw new Error("Title is required");
      }

      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/gallery", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Unable to save gallery item");
      }

      setForm(emptyForm);
      await fetchGallery();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save gallery item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setForm({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description ?? "",
      media_url: item.media_url ?? "",
      external_link: item.external_link ?? "",
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active ?? true,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gallery item?")) return;

    const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Delete failed");
      return;
    }

    setError("");
    await fetchGallery();
  };

  if (status === "loading" || !session?.user) {
    return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  }

  if (!isGalleryManager) {
    return <div className="p-8 text-sm text-slate-500">You do not have access to this page.</div>;
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Gallery Management</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as GalleryItem["type"] }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              {galleryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span>Sort Order</span>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="e.g. Health camp success"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Short description"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>Media URL</span>
            <input
              value={form.media_url}
              onChange={(e) => setForm((prev) => ({ ...prev, media_url: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="https://example.com/image.jpg or video URL"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>External Link</span>
            <input
              value={form.external_link}
              onChange={(e) => setForm((prev) => ({ ...prev, external_link: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Optional link"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            Active
          </label>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="mt-4 flex gap-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Saving..." : form.id ? "Update Item" : "Add Item"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                    {item.type}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-800">{item.title}</h2>
                {item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}
                {item.media_url && <p className="mt-1 break-all text-xs text-sky-700">{item.media_url}</p>}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => handleEdit(item)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                  Edit
                </button>
                <button type="button" onClick={() => void handleDelete(item.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
