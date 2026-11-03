import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { updateUserPassword } from "@/lib/db";
import { getRequestMeta, log } from "@/lib/logger";
import { validatePasswordResetInput } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const session = auth.session;
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    const validation = validatePasswordResetInput(password, confirmPassword);
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400, headers: NO_STORE });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await updateUserPassword(session.user.id, passwordHash);

    if (updateError) {
      log.error("user.password_reset.failed", { ...meta, userId: session.user.id, error: updateError });
      return NextResponse.json({ success: false, message: "Unable to update the password right now." }, { status: 500, headers: NO_STORE });
    }

    log.info("user.password_reset.success", { ...meta, userId: session.user.id });
    return NextResponse.json({ success: true, message: "Password updated successfully." }, { headers: NO_STORE });
  } catch (error) {
    log.error("user.password_reset.exception", { ...meta, error });
    return NextResponse.json({ success: false, message: "Unable to update the password right now." }, { status: 500, headers: NO_STORE });
  }
}
