import { queryRows, toDbError } from "./postgres";

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
  try {
    const values: unknown[] = [];
    const whereClauses: string[] = [];

    if (type) {
      values.push(type);
      whereClauses.push(`type = $${values.length}`);
    }

    if (!includeInactive) {
      whereClauses.push("is_active = TRUE");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const data = await queryRows<GalleryItem>(
      `SELECT * FROM gallery_items ${whereSql} ORDER BY sort_order ASC, created_at DESC`,
      values,
    );

    return { data, error: null };
  } catch (error) {
    return { data: [], error: toDbError(error) };
  }
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

  try {
    const rows = await queryRows(
      `INSERT INTO gallery_items (type, title, description, media_url, external_link, sort_order, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        type,
        title,
        payload.description ? String(payload.description).trim() : null,
        mediaUrl,
        payload.external_link ? String(payload.external_link).trim() : null,
        Number(payload.sort_order ?? 0),
        payload.is_active ?? true,
        userId,
      ],
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
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

  try {
    const entries = Object.entries(payload);
    if (entries.length === 0) {
      return { data: null, error: new Error("Nothing to update") };
    }

    const setClause = entries.map(([key], index) => `"${key}" = $${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);
    const rows = await queryRows(
      `UPDATE gallery_items SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, itemId],
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function deleteGalleryItem(itemId: string) {
  try {
    await queryRows("DELETE FROM gallery_items WHERE id = $1 RETURNING id", [itemId]);
    return { error: null };
  } catch (error) {
    return { error: toDbError(error) };
  }
}
