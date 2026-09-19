import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminContext } from "@/lib/auth";
import { getDistrictAdminMappings, assignDistrictAdmin, getUserById, logAdminAssignment } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // Only super admins (country-level) can view mappings and manage
    const adminContext = getAdminContext(auth.session);
    if (adminContext.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await getDistrictAdminMappings();
    if (error) {
      console.error("Failed to fetch district admin mappings:", error);
      return NextResponse.json({ success: false, mappings: [] });
    }

    return NextResponse.json({ success: true, mappings: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);
    if (adminContext.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { adminUserId, district, role } = body;
    if (!adminUserId || !district || !role) {
      return NextResponse.json({ success: false, message: "adminUserId, district and role are required" }, { status: 400 });
    }

    // Ensure target user exists and is_admin flag set
    const target = await getUserById(adminUserId);
    if (target.error || !target.data) {
      return NextResponse.json({ success: false, message: "Target user not found" }, { status: 404 });
    }

    const { data, error } = await assignDistrictAdmin(adminUserId, district, role);
    if (error) {
      console.error("Failed to assign district admin:", error);
      return NextResponse.json({ success: false, message: "Failed to assign district admin" }, { status: 500 });
    }

    // Log assignment to the existing audit table. We intentionally use the canonical schema columns.
    try {
      const actedBy = (auth.session && auth.session.user && (auth.session.user as any).id) || null;
      await logAdminAssignment({
        admin_user_id: adminUserId,
        acted_by: actedBy,
        action: "assign_district_admin",
        mapping_role: role,
        district,
        note: `Assigned ${role} for district ${district}`,
      });
    } catch (logErr) {
      console.error("Failed to log admin assignment:", logErr);
    }

    return NextResponse.json({ success: true, mapping: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
