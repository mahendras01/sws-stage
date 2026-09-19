import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import {
  getPasswordResetTokenByHash,
  invalidatePasswordResetTokensForUser,
  markPasswordResetTokenUsed,
  updateUserPassword,
} from "@/lib/db";
import { supabase } from "@/lib/supabase";

const INVALID_RESET_MESSAGE = "This reset link is invalid, expired, or has already been used.";
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!token) {
      return NextResponse.json({ success: false, message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    if (!password || !confirmPassword) {
      return NextResponse.json({ success: false, message: "Please enter and confirm your new password." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: "New password and confirm password do not match." }, { status: 400 });
    }

    if (!PASSWORD_POLICY.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        },
        { status: 400 },
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { data: resetRecord, error: resetError } = await getPasswordResetTokenByHash(tokenHash);

    if (resetError || !resetRecord) {
      return NextResponse.json({ success: false, message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    const expiresAt = new Date(resetRecord.expires_at);
    const now = new Date();

    if (expiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ success: false, message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    if (resetRecord.used_at) {
      return NextResponse.json({ success: false, message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", resetRecord.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: false, message: INVALID_RESET_MESSAGE }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: passwordUpdateError } = await updateUserPassword(user.id, passwordHash);
    if (passwordUpdateError) {
      console.error("Password update failed:", passwordUpdateError);
      return NextResponse.json({ success: false, message: "Unable to reset your password right now." }, { status: 500 });
    }

    const usedAt = new Date();
    const { error: markUsedError } = await markPasswordResetTokenUsed(resetRecord.id, usedAt);
    if (markUsedError) {
      console.error("Mark reset token used failed:", markUsedError);
    }

    const { error: invalidateOtherTokensError } = await invalidatePasswordResetTokensForUser(user.id, usedAt);
    if (invalidateOtherTokensError) {
      console.error("Invalidate other reset tokens failed:", invalidateOtherTokensError);
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, message: "Unable to reset your password right now." }, { status: 500 });
  }
}
