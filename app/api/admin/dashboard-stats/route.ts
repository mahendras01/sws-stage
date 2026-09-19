import { NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getAdminDashboardStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);
    const { data, error } = await getAdminDashboardStats(adminContext.role, adminContext.district);

    if (error) {
      console.error("Failed to fetch dashboard stats:", error);
      return NextResponse.json({ success: false, message: "Failed to fetch dashboard statistics" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: data,
      role: adminContext.role,
      district: adminContext.district,
    });
  } catch (error) {
    console.error("Dashboard stats route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
