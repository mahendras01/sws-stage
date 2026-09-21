import Image from "next/image";
import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";
import { getGalleryItems, type GalleryType } from "@/lib/gallery";

const galleryTypes = [
  { key: "achievement", label: "Achievements" },
  { key: "photo", label: "Photos" },
  { key: "video", label: "Videos" },
] as const;

function formatDate(dateString?: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function GalleryPage({ searchParams }: { searchParams?: { section?: string } }) {
  const requestedSection = (searchParams?.section ?? "achievement").toLowerCase();
  const section = galleryTypes.some((item) => item.key === requestedSection)
    ? (requestedSection as GalleryType)
    : "achievement";

  const { data: items } = await getGalleryItems(section);

  return (
    <InfoPageShell
      title="Gallery"
      intro="Achievements, photos, and videos from the society."
      breadcrumb={[{ label: "Gallery", href: undefined }]}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {galleryTypes.map((item) => {
          const isActive = item.key === section;
          return (
            <Link
              key={item.key}
              href={`/gallery?section=${item.key}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.length > 0 ? (
          items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {item.media_url ? (
                item.type === "video" ? (
                  <video controls className="h-52 w-full object-cover bg-slate-100">
                    <source src={item.media_url} />
                  </video>
                ) : (
                  <Image
                    src={item.media_url}
                    alt={item.title}
                    width={800}
                    height={520}
                    unoptimized
                    className="h-52 w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-52 items-center justify-center bg-slate-100 text-sm font-medium uppercase tracking-wide text-slate-500">
                  {item.type}
                </div>
              )}

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-800">{item.title}</h2>
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                    {item.type}
                  </span>
                </div>

                {item.description && <p className="text-sm text-slate-600">{item.description}</p>}

                {item.external_link && (
                  <a href={item.external_link} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800">
                    Open link
                  </a>
                )}

                <div className="text-xs text-slate-500">{formatDate(item.created_at)}</div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">
            No {section === "achievement" ? "achievements" : section === "photo" ? "photos" : "videos"} available yet.
          </div>
        )}
      </div>
    </InfoPageShell>
  );
}
