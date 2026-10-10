import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/auth";
import { createApprovalHistory, getUserById, updateUserStatus, resolveNotificationsForRegistration } from "@/lib/db";
import { getRequestMeta, log, summarizeUser } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);
  let targetId: unknown;
  let adminActor: Record<string, unknown> = {};

  try {
    const auth = await requireAdmin();
    if (auth.error) {
      log.warn("admin.approve_user.unauthorized", meta);
      return auth.error;
    }

    const body = await request.json();
    const { userId, approved, rejectionReason, approvalReason } = body;
    targetId = userId;
    const adminContext = getAdminContext(auth.session);
    const adminRole = adminContext.role;
    adminActor = { adminId: auth.session.user.id, adminEmail: auth.session.user.email, adminRole };

    if (adminRole !== "super_admin") {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, targetUserId: userId, reason: "not_super_admin" });
      return NextResponse.json(
        { success: false, message: "Only the Super Admin can approve or reject new users" },
        { status: 403 },
      );
    }

    if (!userId || typeof approved !== "boolean") {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, targetUserId: userId, reason: "missing_fields" });
      return NextResponse.json(
        { success: false, message: "userId and approved are required" },
        { status: 400 },
      );
    }

    if (!approved && (!rejectionReason || rejectionReason.trim().length === 0)) {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, targetUserId: userId, reason: "missing_rejection_reason" });
      return NextResponse.json(
        { success: false, message: "Rejection reason is required" },
        { status: 400 },
      );
    }

    if (approved && (!approvalReason || approvalReason.trim().length === 0)) {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, targetUserId: userId, reason: "missing_approval_reason" });
      return NextResponse.json(
        { success: false, message: "Reason for Admin Approval is required" },
        { status: 400 },
      );
    }

    const targetUser = await getUserById(userId);
    if (targetUser.error || !targetUser.data) {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, targetUserId: userId, reason: "user_not_found", error: targetUser.error });
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const targetSummary = summarizeUser(targetUser.data);

    if (targetUser.data.status !== "pending") {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, reason: "not_pending", user: targetSummary });
      return NextResponse.json({ success: false, message: "User is no longer pending" }, { status: 409 });
    }

    const status = approved ? "approved" : "rejected";
    const { data: updatedUser, error } = await updateUserStatus(
      userId,
      status,
      approved ? undefined : rejectionReason.trim(),
    );

    if (error) {
      log.error("admin.approve_user.failed", { ...meta, ...adminActor, decision: status, user: targetSummary, error });
      return NextResponse.json(
        { success: false, message: "Failed to update user status" },
        { status: 500 },
      );
    }

    // If no row was updated, it means the user was not pending anymore (race or already processed)
    if (!updatedUser) {
      log.warn("admin.approve_user.rejected", { ...meta, ...adminActor, reason: "not_pending_race", user: targetSummary });
      return NextResponse.json({ success: false, message: "User is no longer pending" }, { status: 409 });
    }

    const historyReason = approved ? approvalReason?.trim() ?? null : rejectionReason?.trim() ?? null;

    await createApprovalHistory({
      user_id: userId,
      approved_by: auth.session.user.id,
      approved_by_role: "super_admin",
      approval_status: status,
      approval_reason: historyReason,
    });

    log.info("admin.approve_user.success", { ...meta, ...adminActor, decision: status, reason: historyReason, user: { ...targetSummary, status } });

    // Resolve any pending notifications for this registration so it disappears from approvers' lists.
    try {
      await resolveNotificationsForRegistration(userId);
    } catch (e) {
      log.error("admin.approve_user.notification_cleanup_failed", { ...meta, targetUserId: userId, error: e });
    }

    return NextResponse.json({
      success: true,
      message: approved ? "User approved successfully" : "User rejected",
    });
  } catch (error) {
    log.error("admin.approve_user.exception", { ...meta, ...adminActor, targetUserId: targetId, error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
