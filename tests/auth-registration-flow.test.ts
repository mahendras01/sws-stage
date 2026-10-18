import assert from "node:assert/strict";
import test from "node:test";

import { canUserLogin, getDefaultNewUserStatus } from "../lib/auth-flow.ts";

test("new users are approved immediately while rejected users stay blocked", () => {
  assert.equal(getDefaultNewUserStatus(), "approved");
  assert.equal(canUserLogin("approved"), true);
  assert.equal(canUserLogin("pending"), true);
  assert.equal(canUserLogin("rejected"), false);
});
