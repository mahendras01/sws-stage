import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canManageContacts, parseContactInput } from "@/lib/contact-persons";
import { supabase } from "@/lib/supabase";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireSuperAdmin() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!canManageContacts(auth.session.user.role)) {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { session: auth.session };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ success: false, message: "Invalid contact id" }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = parseContactInput(payload, { partial: true });
  if ("error" in parsed) {
    return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
  }
  if (Object.keys(parsed.values).length === 0) {
    return NextResponse.json({ success: false, message: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("contact_persons")
    .update(parsed.values)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (error) {
    log.error("admin.contacts.update_failed", { ...getRequestMeta(request), contactId: params.id, error });
    return NextResponse.json({ success: false, message: "Failed to update contact" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ success: false, message: "Contact not found" }, { status: 404 });
  }

  log.info("admin.contacts.updated", { ...getRequestMeta(request), adminId: auth.session.user.id, contactId: params.id });
  return NextResponse.json({ success: true, contact: data });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ success: false, message: "Invalid contact id" }, { status: 400 });
  }

  const { data, error } = await supabase.from("contact_persons").delete().eq("id", params.id);
  if (error) {
    log.error("admin.contacts.delete_failed", { ...getRequestMeta(request), contactId: params.id, error });
    return NextResponse.json({ success: false, message: "Failed to delete contact" }, { status: 500 });
  }
  if (Array.isArray(data) && data.length === 0) {
    return NextResponse.json({ success: false, message: "Contact not found" }, { status: 404 });
  }

  log.info("admin.contacts.deleted", { ...getRequestMeta(request), adminId: auth.session.user.id, contactId: params.id });
  return NextResponse.json({ success: true });
}
