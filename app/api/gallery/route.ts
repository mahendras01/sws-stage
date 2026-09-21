import { NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { canManageGallery, createGalleryItem, deleteGalleryItem, getGalleryItems, updateGalleryItem } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "").toLowerCase();
  const includeInactive = searchParams.get("includeInactive") === "true";

  const validTypes = ["achievement", "photo", "video"] as const;
  const galleryType = validTypes.includes(type as any) ? (type as (typeof validTypes)[number]) : undefined;

  const { data, error } = await getGalleryItems(galleryType, includeInactive);
  if (error) {
    return NextResponse.json({ success: false, message: "Failed to load gallery", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, items: data });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  if (!canManageGallery(session.user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const { data, error } = await createGalleryItem(payload, session.user.id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, item: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  if (!canManageGallery(session.user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const itemId = String(payload.id ?? "").trim();

  if (!itemId) {
    return NextResponse.json({ success: false, message: "Item id is required" }, { status: 400 });
  }

  const { data, error } = await updateGalleryItem(itemId, payload);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, item: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = auth.session;
  if (!canManageGallery(session.user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("id") || "";

  if (!itemId) {
    return NextResponse.json({ success: false, message: "Item id is required" }, { status: 400 });
  }

  const { error } = await deleteGalleryItem(itemId);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
