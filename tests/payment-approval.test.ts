import assert from "node:assert/strict";
import test from "node:test";

import { getPaymentApprovalStatus, isPendingPaymentApproval } from "../lib/payment-approvals.ts";

test("pending payment approvals normalize uploaded and pending statuses", () => {
  assert.equal(getPaymentApprovalStatus({ status: "uploaded", review_status: "pending" }), "pending");
  assert.equal(getPaymentApprovalStatus({ status: "pending", verification_status: "pending" }), "pending");
  assert.equal(getPaymentApprovalStatus({ status: "approved", verification_status: "verified" }), "approved");
  assert.equal(getPaymentApprovalStatus({ status: "rejected", verification_status: "rejected" }), "rejected");
});

test("pending payment approvals exclude already approved and rejected rows", () => {
  assert.equal(isPendingPaymentApproval({ status: "uploaded" }), true);
  assert.equal(isPendingPaymentApproval({ status: "approved" }), false);
  assert.equal(isPendingPaymentApproval({ verification_status: "rejected", status: "rejected" }), false);
});
