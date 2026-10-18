import assert from "node:assert/strict";
import test from "node:test";

import { canAccessReceiptForUser, canViewAllSahyogReceipts } from "../lib/receipt-access.ts";

test("super admin can view all sahyog receipts but regular users stay scoped to their own account", () => {
  assert.equal(canViewAllSahyogReceipts("super_admin"), true);
  assert.equal(canViewAllSahyogReceipts("user"), false);

  assert.equal(canAccessReceiptForUser({ id: "viewer-1", role: "super_admin" }, "owner-2"), true);
  assert.equal(canAccessReceiptForUser({ id: "viewer-1", role: "user" }, "owner-2"), false);
  assert.equal(canAccessReceiptForUser({ id: "viewer-1", role: "user" }, "viewer-1"), true);
});
