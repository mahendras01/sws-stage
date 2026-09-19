import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getApprovedUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const district = request.nextUrl.searchParams.get("district")?.trim() || null;
    const adminContext = getAdminContext(auth.session);
    const { data, error } = await getApprovedUsers(adminContext.role, adminContext.district, district);

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch users" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, users: data ?? [] });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
