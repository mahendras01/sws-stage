import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { createApprovalHistory, getUserById, updateUserStatus, resolveNotificationsForRegistration } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { userId, approved, rejectionReason, approvalReason } = body;
    const adminContext = getAdminContext(auth.session);
    const adminRole = adminContext.role;

    if (!userId || typeof approved !== "boolean") {
      return NextResponse.json(
        { success: false, message: "userId and approved are required" },
        { status: 400 },
      );
    }

    if (!approved && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return NextResponse.json(
        { success: false, message: "Rejection reason is required" },
        { status: 400 },
      );
    }

    if ((approved && (adminRole === "super_admin" || adminRole === "country_co_admin")) && (!approvalReason || approvalReason.trim().length === 0)) {
      return NextResponse.json(
        { success: false, message: "Reason for Admin Approval is required" },
        { status: 400 },
      );
    }

    const targetUser = await getUserById(userId);
    if (targetUser.error || !targetUser.data) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (targetUser.data.status !== "pending") {
      return NextResponse.json({ success: false, message: "User is no longer pending" }, { status: 409 });
    }

    if (adminRole === "district_admin" || adminRole === "district_co_admin") {
      if (!adminContext.district || !targetUser.data.district || targetUser.data.district !== adminContext.district) {
        return NextResponse.json(
          { success: false, message: "You can only manage users from your assigned district" },
          { status: 403 },
        );
      }
    }

    const status = approved ? "approved" : "rejected";
    const { data: updatedUser, error } = await updateUserStatus(
      userId,
      status,
      approved ? undefined : rejectionReason.trim(),
    );

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update user status" },
        { status: 500 },
      );
    }

    // If no row was updated, it means the user was not pending anymore (race or already processed)
    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User is no longer pending" }, { status: 409 });
    }

    const historyReason = approved
      ? adminRole === "super_admin" || adminRole === "country_co_admin"
        ? approvalReason?.trim() ?? null
        : null
      : rejectionReason?.trim() ?? null;

    await createApprovalHistory({
      user_id: userId,
      approved_by: auth.session.user.id,
      approved_by_role: adminRole === "district_admin" || adminRole === "district_co_admin" ? adminRole : "super_admin",
      approval_status: status,
      approval_reason: historyReason,
    });

    // Resolve any pending notifications for this registration so it disappears from approvers' lists.
    try {
      await resolveNotificationsForRegistration(userId);
    } catch (e) {
      console.error("Failed to resolve notifications for approved user", e);
    }

    return NextResponse.json({
      success: true,
      message: approved ? "User approved successfully" : "User rejected",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
