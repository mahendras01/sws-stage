import { NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { getPendingUsersForAdmin } from "@/lib/db";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const meta = getRequestMeta(request);

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);

    if (adminContext.role !== "super_admin") {
      log.warn("admin.pending_users.rejected", { ...meta, adminId: auth.session.user.id, adminEmail: auth.session.user.email, adminRole: adminContext.role, reason: "not_super_admin" });
      return NextResponse.json(
        { success: false, message: "Only the Super Admin can view pending approvals" },
        { status: 403 },
      );
    }

    const { data, error } = await getPendingUsersForAdmin(adminContext.role, adminContext.district);

    if (error) {
      log.error("admin.pending_users.failed", { ...meta, adminId: auth.session.user.id, error });
      return NextResponse.json({ success: true, users: [] });
    }

    log.info("admin.pending_users.success", { ...meta, adminId: auth.session.user.id, adminEmail: auth.session.user.email, pendingCount: (data ?? []).length });

    return NextResponse.json({
      success: true,
      users: data ?? [],
      role: adminContext.role,
      district: adminContext.district,
    });
  } catch (error) {
    log.error("admin.pending_users.exception", { ...meta, error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
