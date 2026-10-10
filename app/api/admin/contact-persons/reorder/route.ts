import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canManageContacts } from "@/lib/contact-persons";
import { supabase } from "@/lib/supabase";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Body: { ids: string[] } - contact ids in the desired display order. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!canManageContacts(auth.session.user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const ids: unknown = payload.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 50 ||
    !ids.every((id) => typeof id === "string" && UUID_PATTERN.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return NextResponse.json({ success: false, message: "Invalid order" }, { status: 400 });
  }

  for (let index = 0; index < ids.length; index += 1) {
    const { error } = await supabase
      .from("contact_persons")
      .update({ sort_order: index + 1 })
      .eq("id", ids[index]);

    if (error) {
      log.error("admin.contacts.reorder_failed", { ...getRequestMeta(request), error });
      return NextResponse.json({ success: false, message: "Failed to save order" }, { status: 500 });
    }
  }

  log.info("admin.contacts.reordered", { ...getRequestMeta(request), adminId: auth.session.user.id, count: ids.length });
  return NextResponse.json({ success: true });
}
