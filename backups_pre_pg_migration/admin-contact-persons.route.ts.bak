import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  MAX_CONTACT_PERSONS,
  canManageContacts,
  countContactPersons,
  listContactPersons,
  parseContactInput,
} from "@/lib/contact-persons";
import { supabase } from "@/lib/supabase";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!canManageContacts(auth.session.user.role)) {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { session: auth.session };
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await listContactPersons(true);
  if (error) {
    log.error("admin.contacts.list_failed", { ...getRequestMeta(request), error });
    return NextResponse.json({ success: false, message: "Failed to load contacts" }, { status: 500 });
  }

  return NextResponse.json({ success: true, contacts: data, max: MAX_CONTACT_PERSONS });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const payload = await request.json().catch(() => ({}));
  const parsed = parseContactInput(payload);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
  }

  const { count, error: countError } = await countContactPersons();
  if (countError) {
    log.error("admin.contacts.count_failed", { ...getRequestMeta(request), error: countError });
    return NextResponse.json({ success: false, message: "Failed to save contact" }, { status: 500 });
  }
  if (count >= MAX_CONTACT_PERSONS) {
    return NextResponse.json(
      { success: false, message: `A maximum of ${MAX_CONTACT_PERSONS} contacts is allowed. Delete one to add another.` },
      { status: 400 },
    );
  }

  // New contacts go to the end of the list.
  const { data: existing } = await listContactPersons(true);
  const nextOrder = existing.reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0) + 1;

  const { data, error } = await supabase
    .from("contact_persons")
    .insert({
      ...parsed.values,
      is_active: parsed.values.is_active ?? true,
      sort_order: nextOrder,
      created_by: auth.session.user.id,
    })
    .select()
    .single();

  if (error) {
    log.error("admin.contacts.create_failed", { ...getRequestMeta(request), error });
    return NextResponse.json({ success: false, message: "Failed to save contact" }, { status: 500 });
  }

  log.info("admin.contacts.created", { ...getRequestMeta(request), adminId: auth.session.user.id, contactId: data?.id });
  return NextResponse.json({ success: true, contact: data }, { status: 201 });
}
