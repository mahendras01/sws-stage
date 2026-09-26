import { NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getPendingUsersForAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);

    if (adminContext.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Only the Super Admin can view pending approvals" },
        { status: 403 },
      );
    }

    const { data, error } = await getPendingUsersForAdmin(adminContext.role, adminContext.district);

    if (error) {
      console.error("Failed to fetch pending users:", error);
      return NextResponse.json({ success: true, users: [] });
    }

    return NextResponse.json({
      success: true,
      users: data ?? [],
      role: adminContext.role,
      district: adminContext.district,
    });
  } catch (error) {
    console.error("Pending users route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
