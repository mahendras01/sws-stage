export type PaymentApprovalStatus = "pending" | "approved" | "rejected";

export type PaymentApprovalRecord = {
  status?: string | null;
  review_status?: string | null;
  verification_status?: string | null;
};

export function normalizePaymentApprovalStatus(value?: string | null): PaymentApprovalStatus {
  const normalized = (value ?? "").trim().toLowerCase();

  if (["approved", "verified", "paid"].includes(normalized)) {
    return "approved";
  }

  if (["rejected", "declined"].includes(normalized)) {
    return "rejected";
  }

  return "pending";
}

export function getPaymentApprovalStatus(record: PaymentApprovalRecord): PaymentApprovalStatus {
  const status = normalizePaymentApprovalStatus(record.status ?? null);
  const reviewStatus = normalizePaymentApprovalStatus(record.review_status ?? null);
  const verificationStatus = normalizePaymentApprovalStatus(record.verification_status ?? null);

  if (status === "approved" || reviewStatus === "approved" || verificationStatus === "approved") {
    return "approved";
  }

  if (status === "rejected" || reviewStatus === "rejected" || verificationStatus === "rejected") {
    return "rejected";
  }

  if (status === "pending" || reviewStatus === "pending" || verificationStatus === "pending") {
    return "pending";
  }

  if (record.status === "uploaded" || record.review_status === "needs_review" || record.verification_status === "pending") {
    return "pending";
  }

  return "pending";
}

export function isPendingPaymentApproval(record: PaymentApprovalRecord) {
  return getPaymentApprovalStatus(record) === "pending";
}
