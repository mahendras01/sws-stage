import { supabase } from "./supabase";

export type GalleryType = "achievement" | "photo" | "video";

export type GalleryItem = {
  id: string;
  type: GalleryType;
  title: string;
  description: string | null;
  media_url: string | null;
  external_link: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function canManageGallery(role?: string | null) {
  return ["super_admin", "country_co_admin", "district_admin", "district_co_admin"].includes(role ?? "");
}

export async function getGalleryItems(type?: GalleryType, includeInactive = false) {
  let query = supabase.from("gallery_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  return { data: (data as GalleryItem[] | null) ?? [], error };
}

export async function createGalleryItem(payload: Partial<GalleryItem>, userId: string) {
  const type = String(payload.type ?? "").toLowerCase();
  const title = String(payload.title ?? "").trim();
  const mediaUrl = payload.media_url ? String(payload.media_url).trim() : null;

  if (!type || !["achievement", "photo", "video"].includes(type)) {
    return { data: null, error: new Error("Gallery type is required") };
  }

  if (!title) {
    return { data: null, error: new Error("Gallery title is required") };
  }

  const { data, error } = await supabase
    .from("gallery_items")
    .insert({
      type,
      title,
      description: payload.description ? String(payload.description).trim() : null,
      media_url: mediaUrl,
      external_link: payload.external_link ? String(payload.external_link).trim() : null,
      sort_order: Number(payload.sort_order ?? 0),
      is_active: payload.is_active ?? true,
      created_by: userId,
    })
    .select()
    .single();

  return { data, error };
}

export async function updateGalleryItem(itemId: string, updates: Partial<GalleryItem>) {
  const payload: Record<string, unknown> = {};

  if (updates.type) payload.type = String(updates.type).toLowerCase();
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.description !== undefined) payload.description = updates.description ? String(updates.description).trim() : null;
  if (updates.media_url !== undefined) payload.media_url = updates.media_url ? String(updates.media_url).trim() : null;
  if (updates.external_link !== undefined) payload.external_link = updates.external_link ? String(updates.external_link).trim() : null;
  if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order ?? 0);
  if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);

  const { data, error } = await supabase.from("gallery_items").update(payload).eq("id", itemId).select().single();
  return { data, error };
}

export async function deleteGalleryItem(itemId: string) {
  const { error } = await supabase.from("gallery_items").delete().eq("id", itemId);
  return { error };
}
