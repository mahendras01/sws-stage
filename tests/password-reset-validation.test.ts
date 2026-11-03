import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";

import { validatePasswordResetInput } from "../lib/password-reset.ts";

test("validatePasswordResetInput accepts matching 8+ character passwords and rejects mismatched or short values", () => {
  assert.deepEqual(validatePasswordResetInput("StrongPass123", "StrongPass123"), { ok: true });

  const mismatch = validatePasswordResetInput("StrongPass123", "StrongPass124");
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.message, "New password and confirm password do not match.");

  const shortPassword = validatePasswordResetInput("short", "short");
  assert.equal(shortPassword.ok, false);
  assert.equal(shortPassword.message, "Password must be at least 8 characters.");
});

test("bcrypt-based password checks allow newly set passwords while rejecting the previous one", async () => {
  const oldPassword = "OldPass123";
  const newPassword = "NewPass456";
  const hash = await bcrypt.hash(newPassword, 12);

  assert.equal(await bcrypt.compare(newPassword, hash), true);
  assert.equal(await bcrypt.compare(oldPassword, hash), false);
});
