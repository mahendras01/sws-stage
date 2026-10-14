import { NextResponse } from "next/server";
import { getReceiptRecipientFilterOptions } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const district = url.searchParams.get("district")?.trim() ?? "";
  const location = url.searchParams.get("location")?.trim() ?? "";

  const { data, error } = await getReceiptRecipientFilterOptions({ district, location });
  if (error) {
    return NextResponse.json({ success: false, message: "Unable to load eligible recipients.", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    districts: data?.districts ?? [],
    locations: data?.locations ?? [],
    users: data?.users ?? [],
  });
}
