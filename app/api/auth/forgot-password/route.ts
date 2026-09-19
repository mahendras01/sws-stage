import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createPasswordResetToken, getUserByEmail } from "@/lib/db";

const GENERIC_MESSAGE = "If an account exists for this email, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    const { data: user } = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error } = await createPasswordResetToken(user.id, tokenHash, expiresAt);
    if (error) {
      console.error("Password reset token creation failed:", error);
      return NextResponse.json({ success: false, message: "Unable to process your request. Please try again later." }, { status: 500 });
    }

    console.info("Password reset request processed for a registered account.");

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, message: "Unable to process your request. Please try again later." }, { status: 500 });
  }
}
