import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ANNUAL_MAINTENANCE_VERIFICATION_STATUS,
  calculateAnnualMaintenanceMembershipExpiryDate,
  isAnnualMaintenanceVerificationComplete,
  isMembershipAuthorizationRequired,
  isMembershipAuthorized,
  resolveMembershipExpiryDateFromAnnualMaintenanceRecords,
} from "../lib/annual-maintenance.ts";

test("annual maintenance payments remain unverified until a Super Admin validates them", () => {
  assert.equal(DEFAULT_ANNUAL_MAINTENANCE_VERIFICATION_STATUS, "pending");
  assert.equal(isAnnualMaintenanceVerificationComplete("pending"), false);
  assert.equal(isAnnualMaintenanceVerificationComplete("verified"), true);
  assert.equal(isAnnualMaintenanceVerificationComplete("rejected"), false);
});

test("annual maintenance verification blocks membership activation until an authorized payment is confirmed", () => {
  assert.equal(isMembershipAuthorizationRequired({ is_active: true, userStatus: "approved", paymentVerificationStatus: "pending" }), true);
  assert.equal(isMembershipAuthorizationRequired({ is_active: true, userStatus: "approved", paymentVerificationStatus: "verified" }), false);
  assert.equal(isMembershipAuthorizationRequired({ is_active: false, userStatus: "approved", paymentVerificationStatus: "pending" }), false);
  assert.equal(isMembershipAuthorizationRequired({ is_active: true, userStatus: "pending", paymentVerificationStatus: "verified" }), true);

  assert.equal(isMembershipAuthorized({
    is_active: true,
    userStatus: "approved",
    paymentVerificationStatus: "verified",
    verifiedByRole: "super_admin",
  }), true);
  assert.equal(isMembershipAuthorized({
    is_active: true,
    userStatus: "approved",
    paymentVerificationStatus: "pending",
    verifiedByRole: "super_admin",
  }), false);
  assert.equal(isMembershipAuthorized({
    is_active: true,
    userStatus: "approved",
    paymentVerificationStatus: "verified",
    verifiedByRole: "country_co_admin",
  }), false);
});

test("annual maintenance payment date drives membership expiry instead of registration date", () => {
  assert.equal(calculateAnnualMaintenanceMembershipExpiryDate("2026-10-26"), "2027-10-26");
  assert.equal(calculateAnnualMaintenanceMembershipExpiryDate(null), null);

  const expiryFromPaymentHistory = resolveMembershipExpiryDateFromAnnualMaintenanceRecords([
    { payment_date: "2025-10-01", verification_status: "verified" },
    { payment_date: "2026-10-26", verification_status: "verified" },
    { payment_date: "2026-11-01", verification_status: "rejected" },
  ]);

  assert.equal(expiryFromPaymentHistory, "2027-10-26");
});

test("users without a verified annual maintenance payment do not get a fresh membership expiry from registration data", () => {
  const expiry = resolveMembershipExpiryDateFromAnnualMaintenanceRecords([
    { payment_date: "2026-10-26", verification_status: "pending" },
    { payment_date: "2026-11-02", verification_status: "rejected" },
  ]);

  assert.equal(expiry, null);
});
