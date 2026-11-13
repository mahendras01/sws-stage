import test from "node:test";
import assert from "node:assert/strict";

import {
  canManagePendingUsers,
  canViewPendingUsers,
  isCountryLevelAdminRole,
  isDistrictScopedAdminRole,
} from "../lib/admin-rbac.ts";

test("pending users view permissions include read-only and country-level roles", () => {
  assert.equal(canViewPendingUsers("super_admin"), true);
  assert.equal(canViewPendingUsers("country_co_admin"), true);
  assert.equal(canViewPendingUsers("admin_read_only"), true);
  assert.equal(canViewPendingUsers("district_admin"), false);
  assert.equal(canViewPendingUsers("district_co_admin"), false);
  assert.equal(canViewPendingUsers("user"), false);
});

test("pending users manage permissions remain super-admin only", () => {
  assert.equal(canManagePendingUsers("super_admin"), true);
  assert.equal(canManagePendingUsers("country_co_admin"), false);
  assert.equal(canManagePendingUsers("admin_read_only"), false);
});

test("country-level and district-level role helpers remain unchanged", () => {
  assert.equal(isCountryLevelAdminRole("super_admin"), true);
  assert.equal(isCountryLevelAdminRole("country_co_admin"), true);
  assert.equal(isCountryLevelAdminRole("admin_read_only"), false);

  assert.equal(isDistrictScopedAdminRole("district_admin"), true);
  assert.equal(isDistrictScopedAdminRole("district_co_admin"), true);
  assert.equal(isDistrictScopedAdminRole("admin_read_only"), false);
});
