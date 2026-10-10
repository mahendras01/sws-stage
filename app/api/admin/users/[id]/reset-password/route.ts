import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { updateUserPassword } from "@/lib/db";
import { queryRows } from "@/lib/postgres";
import { getRequestMeta, log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores bytes beyond 72

const NO_STORE = { "Cache-Control": "no-store" };

function generateTemporaryPassword() {
  // Ambiguous characters (0/O, 1/l/I) are left out so it can be read out over a call.
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$%&*!?";
  const all = upper + lower + digits + special;
  const pick = (set: string) => set[crypto.randomInt(set.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < 12) chars.push(pick(all));

  // Fisher-Yates shuffle with a CSPRNG so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const meta = getRequestMeta(request);

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const session = auth.session;
    const actorRows = await queryRows<{ role: string | null; is_admin: boolean | null }>(
      "SELECT role, is_admin FROM users WHERE id = $1 LIMIT 1",
      [session.user.id],
    );
    const actor = actorRows[0] ?? null;

    if (!actor?.is_admin || actor.role !== "super_admin") {
      log.warn("admin.user_password_reset.forbidden", { ...meta, adminId: session.user.id, role: session.user.role });
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403, headers: NO_STORE });
    }

    const targetId = params.id;
    if (!UUID_PATTERN.test(targetId)) {
      return NextResponse.json({ success: false, message: "Invalid user id." }, { status: 400, headers: NO_STORE });
    }

    if (targetId === session.user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot reset your own password from here." },
        { status: 403, headers: NO_STORE },
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === "generate" ? "generate" : body?.mode === "manual" ? "manual" : null;
    if (!mode) {
      return NextResponse.json({ success: false, message: "Choose a password option." }, { status: 400, headers: NO_STORE });
    }

    let target: { id: string; name: string; status: string } | null = null;
    let targetError: any = null;

    try {
      const rows = await queryRows<{ id: string; name: string; status: string }>(
        "SELECT id, name, status FROM users WHERE id = $1 LIMIT 1",
        [targetId],
      );
      target = rows[0] ?? null;
    } catch (error) {
      targetError = error;
    }

    if (targetError) {
      log.error("admin.user_password_reset.lookup_failed", { ...meta, adminId: session.user.id, targetId, error: targetError });
      return NextResponse.json({ success: false, message: "Unable to update the password right now." }, { status: 500, headers: NO_STORE });
    }
    if (!target) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404, headers: NO_STORE });
    }
    if (target.status !== "approved") {
      return NextResponse.json(
        { success: false, message: "Password can only be changed for approved members." },
        { status: 400, headers: NO_STORE },
      );
    }

    let newPassword: string;
    if (mode === "generate") {
      newPassword = generateTemporaryPassword();
    } else {
      newPassword = String(body?.password ?? "");
      const confirmPassword = String(body?.confirmPassword ?? "");

      if (!newPassword || !confirmPassword) {
        return NextResponse.json({ success: false, message: "Please enter and confirm the new password." }, { status: 400, headers: NO_STORE });
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ success: false, message: "New password and confirm password do not match." }, { status: 400, headers: NO_STORE });
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            message: "Password must be at least 8 characters.",
          },
          { status: 400, headers: NO_STORE },
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await updateUserPassword(target.id, passwordHash);
    if (updateError) {
      log.error("admin.user_password_reset.failed", { ...meta, adminId: session.user.id, targetId, error: updateError });
      return NextResponse.json({ success: false, message: "Unable to update the password right now." }, { status: 500, headers: NO_STORE });
    }

    // The password itself is never logged.
    log.info("admin.user_password_reset.success", { ...meta, adminId: session.user.id, targetId, mode });

    return NextResponse.json(
      {
        success: true,
        message: `Password updated for ${target.name}.`,
        ...(mode === "generate" ? { temporaryPassword: newPassword } : {}),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    log.error("admin.user_password_reset.exception", { ...meta, error });
    return NextResponse.json({ success: false, message: "Unable to update the password right now." }, { status: 500, headers: NO_STORE });
  }
}
