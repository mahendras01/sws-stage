import assert from "node:assert/strict";
import test from "node:test";

import { formatPaymentStatusLabel, getPaymentApprovalDecisionMessage, getPaymentApprovalStatus, isPendingPaymentApproval } from "../lib/payment-approvals.ts";

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

test("payment approval decision messages stay consistent for approved and rejected results", () => {
  assert.equal(getPaymentApprovalDecisionMessage("approved", "receipt"), "Receipt approved.");
  assert.equal(getPaymentApprovalDecisionMessage("rejected", "annual_maintenance"), "Annual maintenance payment rejected.");
  assert.equal(getPaymentApprovalDecisionMessage("approved", "unknown"), "Payment approved.");
});

test("receipt uploads are treated as auto-approved in the UI and saved status labels", () => {
  assert.equal(formatPaymentStatusLabel("uploaded"), "Approved");
  assert.equal(formatPaymentStatusLabel("approved"), "Approved");
  assert.equal(formatPaymentStatusLabel("pending"), "Approved");
  assert.equal(formatPaymentStatusLabel("rejected"), "Rejected");
});
