import { queryRows, toDbError } from "./postgres.ts";
import { generateReceiptPdf } from "./pdf.ts";

export type AnnualMaintenanceRole = "super_admin" | "country_co_admin";

export type AnnualMaintenanceSettings = {
  id?: string;
  payment_category: string;
  fee_amount: number | string | null;
  qr_code_url: string | null;
  upi_id: string | null;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  notes: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function canManageAnnualMaintenance(role?: string | null) {
  return ["super_admin", "country_co_admin"].includes(role ?? "");
}

export function validateAnnualMaintenanceSettings(payload: Partial<AnnualMaintenanceSettings>) {
  const feeAmount = payload.fee_amount === null || payload.fee_amount === undefined || payload.fee_amount === "" ? null : Number(payload.fee_amount);
  if (feeAmount !== null && (!Number.isFinite(feeAmount) || feeAmount <= 0)) {
    return "Annual maintenance fee amount must be greater than zero.";
  }

  const accountNumber = payload.account_number?.trim();
  if (accountNumber && !/^[0-9A-Za-z\-\s]{8,25}$/.test(accountNumber)) {
    return "Account number must contain 8 to 25 digits or alphanumeric characters.";
  }

  const ifscCode = payload.ifsc_code?.trim();
  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) {
    return "IFSC code must be in the format ABCD0123456.";
  }

  const upiId = payload.upi_id?.trim();
  if (upiId && !/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(upiId)) {
    return "UPI ID must be in the format name@upi.";
  }

  return null;
}

export async function getAnnualMaintenanceSettings() {
  try {
    const rows = await queryRows<AnnualMaintenanceSettings>(
      `SELECT *
       FROM annual_maintenance_settings
       WHERE payment_category = 'ANNUAL_MAINTENANCE'
       ORDER BY updated_at DESC
       LIMIT 1`,
    );

    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function upsertAnnualMaintenanceSettings(userId: string, payload: Partial<AnnualMaintenanceSettings>) {
  const existing = await getAnnualMaintenanceSettings();
  const basePayload = {
    payment_category: "ANNUAL_MAINTENANCE",
    qr_code_url: payload.qr_code_url?.trim() || null,
    upi_id: payload.upi_id?.trim() || null,
    account_holder_name: payload.account_holder_name?.trim() || null,
    bank_name: payload.bank_name?.trim() || null,
    account_number: payload.account_number?.trim() || null,
    ifsc_code: payload.ifsc_code?.trim() || null,
    branch_name: payload.branch_name?.trim() || null,
    notes: payload.notes?.trim() || null,
    is_active: payload.is_active ?? true,
    updated_by: userId,
  };

  const nextPayload = {
    ...basePayload,
    fee_amount: payload.fee_amount === null || payload.fee_amount === undefined || payload.fee_amount === "" ? null : Number(payload.fee_amount),
  };

  const tryUpsert = async (withFeeAmount: boolean) => {
    const payloadToSave = withFeeAmount ? nextPayload : basePayload;

    if (existing.data) {
      try {
        const entries = Object.entries(payloadToSave);
        const setClause = entries.map(([key], index) => `"${key}" = $${index + 1}`).join(", ");
        const values = entries.map(([, value]) => value);
        const rows = await queryRows(
          `UPDATE annual_maintenance_settings
           SET ${setClause}
           WHERE id = $${values.length + 1}
           RETURNING *`,
          [...values, existing.data.id],
        );
        return { data: rows[0] ?? null, error: null };
      } catch (error) {
        return { data: null, error: toDbError(error) };
      }
    }

    try {
      const insertPayload = {
        ...payloadToSave,
        created_by: userId,
      };
      const entries = Object.entries(insertPayload);
      const columns = entries.map(([key]) => `"${key}"`).join(", ");
      const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
      const values = entries.map(([, value]) => value);
      const rows = await queryRows(
        `INSERT INTO annual_maintenance_settings (${columns}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      return { data: rows[0] ?? null, error: null };
    } catch (error) {
      return { data: null, error: toDbError(error) };
    }
  };

  const firstAttempt = await tryUpsert(true);
  if (!firstAttempt.error) return firstAttempt;

  const errorMessage = String(firstAttempt.error.message).toLowerCase();
  const isMissingFeeColumnError = errorMessage.includes("fee_amount") && (errorMessage.includes("schema cache") || errorMessage.includes("does not exist") || errorMessage.includes("column"));
  if (!isMissingFeeColumnError) {
    return firstAttempt;
  }

  return tryUpsert(false);
}

export async function annualMaintenanceSupportsFileHashColumn() {
  try {
    const rows = await queryRows<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'annual_maintenance_payments'
         AND column_name = 'file_hash'
       LIMIT 1`,
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function createAnnualMaintenancePayment(payload: {
  userId: string;
  transactionNumber: string;
  transactionUtr?: string | null;
  amount: number | null;
  paymentDate?: string | null;
  receiptPath?: string | null;
  receiptName?: string | null;
  notes?: string | null;
  fileHash?: string | null;
}) {
  const hasFileHashColumn = await annualMaintenanceSupportsFileHashColumn();
  const hasTransactionUtrColumn = await annualMaintenanceSupportsColumn("transaction_utr");
  const hasVerificationStatusColumn = await annualMaintenanceSupportsColumn("verification_status");

  try {
    const insertColumns = [
      "payment_category",
      "user_id",
      "transaction_number",
      ...(hasTransactionUtrColumn ? ["transaction_utr"] : []),
      "amount",
      "payment_date",
      "payment_receipt_path",
      "payment_receipt_name",
      "notes",
      ...(hasFileHashColumn ? ["file_hash"] : []),
      ...(hasVerificationStatusColumn ? ["verification_status"] : []),
      "status",
    ];

    const values = [
      "ANNUAL_MAINTENANCE",
      payload.userId,
      payload.transactionNumber.trim(),
      ...(hasTransactionUtrColumn ? [normalizeTransactionReference(payload.transactionUtr ?? payload.transactionNumber) ?? null] : []),
      payload.amount ?? null,
      payload.paymentDate ?? null,
      payload.receiptPath ?? null,
      payload.receiptName ?? null,
      payload.notes?.trim() || null,
      ...(hasFileHashColumn ? [payload.fileHash ?? null] : []),
      ...(hasVerificationStatusColumn ? [DEFAULT_ANNUAL_MAINTENANCE_VERIFICATION_STATUS] : []),
      "pending",
    ];

    const rows = await queryRows(
      `INSERT INTO annual_maintenance_payments (
        ${insertColumns.map((column) => `"${column}"`).join(", ")}
      )
      VALUES (${insertColumns.map((_, index) => `$${index + 1}`).join(", ")})
      RETURNING *`,
      values,
    );

    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes("file_hash") && String(error instanceof Error ? error.message : error).includes("does not exist")) {
      try {
        const rows = await queryRows(
          `INSERT INTO annual_maintenance_payments (
            payment_category,
            user_id,
            transaction_number,
            amount,
            payment_date,
            payment_receipt_path,
            payment_receipt_name,
            notes,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            "ANNUAL_MAINTENANCE",
            payload.userId,
            payload.transactionNumber.trim(),
            payload.amount ?? null,
            payload.paymentDate ?? null,
            payload.receiptPath ?? null,
            payload.receiptName ?? null,
            payload.notes?.trim() || null,
            "pending",
          ],
        );

        return { data: rows[0] ?? null, error: null };
      } catch (retryError) {
        return { data: null, error: toDbError(retryError) };
      }
    }

    return { data: null, error: toDbError(error) };
  }
}

export async function annualMaintenanceSupportsColumn(columnName: string) {
  try {
    const rows = await queryRows<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'annual_maintenance_payments'
         AND column_name = $1
       LIMIT 1`,
      [columnName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export const DEFAULT_ANNUAL_MAINTENANCE_VERIFICATION_STATUS = "pending" as const;
export type AnnualMaintenanceVerificationStatus = "pending" | "verified" | "rejected";

export function normalizeTransactionReference(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.toLowerCase() : null;
}

export function isAnnualMaintenanceVerificationComplete(status?: string | null) {
  return status === "verified";
}

export function isMembershipAuthorizationRequired(input: {
  is_active?: boolean | null;
  userStatus?: string | null;
  paymentVerificationStatus?: string | null;
}) {
  const isPaymentPolicyActive = Boolean(input.is_active);
  if (!isPaymentPolicyActive) {
    return false;
  }

  const effectiveUserStatus = input.userStatus ?? "pending";
  if (effectiveUserStatus !== "approved") {
    return true;
  }

  return !isAnnualMaintenanceVerificationComplete(input.paymentVerificationStatus);
}

export function isMembershipAuthorized(input: {
  is_active?: boolean | null;
  userStatus?: string | null;
  paymentVerificationStatus?: string | null;
  verifiedByRole?: string | null;
}) {
  if (!input.is_active) {
    return input.userStatus === "approved";
  }

  if (input.userStatus !== "approved") {
    return false;
  }

  if (!isAnnualMaintenanceVerificationComplete(input.paymentVerificationStatus)) {
    return false;
  }

  return input.verifiedByRole === "super_admin";
}

export async function getMembershipAuthorizationStatusForUser(userId: string, userStatus?: string | null) {
  const activeSettings = await queryRows<{ is_active: boolean }>(
    `SELECT is_active
     FROM annual_maintenance_settings
     WHERE payment_category = 'ANNUAL_MAINTENANCE'
       AND is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  if (activeSettings.length === 0) {
    return { required: false, authorized: userStatus === "approved", verificationStatus: null, verifiedByRole: null };
  }

  try {
    const rows = await queryRows<{ verification_status: string | null; role: string | null }>(
      `SELECT ap.verification_status, u.role
       FROM annual_maintenance_payments ap
       LEFT JOIN users u ON u.id = ap.verified_by
       WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'
       ORDER BY ap.created_at DESC
       LIMIT 1`,
      [userId],
    );

    const paymentVerificationStatus = rows[0]?.verification_status ?? DEFAULT_ANNUAL_MAINTENANCE_VERIFICATION_STATUS;
    const verifiedByRole = rows[0]?.role ?? null;
    const authorized = isMembershipAuthorized({
      is_active: true,
      userStatus,
      paymentVerificationStatus,
      verifiedByRole,
    });

    return {
      required: true,
      authorized,
      verificationStatus: paymentVerificationStatus,
      verifiedByRole,
    };
  } catch (error) {
    const fallbackRows = await queryRows<{ status: string | null; role: string | null }>(
      `SELECT ap.status, u.role
       FROM annual_maintenance_payments ap
       LEFT JOIN users u ON u.id = ap.verified_by
       WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'
       ORDER BY ap.created_at DESC
       LIMIT 1`,
      [userId],
    );

    const paymentVerificationStatus = fallbackRows[0]?.status ?? DEFAULT_ANNUAL_MAINTENANCE_VERIFICATION_STATUS;
    const verifiedByRole = fallbackRows[0]?.role ?? null;
    const authorized = isMembershipAuthorized({
      is_active: true,
      userStatus,
      paymentVerificationStatus,
      verifiedByRole,
    });

    return {
      required: true,
      authorized,
      verificationStatus: paymentVerificationStatus,
      verifiedByRole,
    };
  }
}

export async function findDuplicateTransactionNumber(transactionNumber: string, excludePaymentId?: string | null) {
  const normalized = normalizeTransactionReference(transactionNumber);
  if (!normalized) {
    return { exists: false, matches: [] };
  }

  try {
    const rows = await queryRows<any>(
      `SELECT source, id, user_id, transaction_number, transaction_id, transaction_utr, amount, created_at, sahyog_type
       FROM (
         SELECT 'receipts'::text AS source, r.id, r.user_id, r.transaction_number, r.transaction_id, r.transaction_utr, r.amount, r.created_at, r.sahyog_type
         FROM receipts r
         WHERE LOWER(COALESCE(r.transaction_number, '')) = $1
            OR LOWER(COALESCE(r.transaction_id, '')) = $1
            OR LOWER(COALESCE(r.transaction_utr, '')) = $1

         UNION ALL

         SELECT 'annual_maintenance'::text AS source, ap.id, ap.user_id, ap.transaction_number, ap.transaction_number AS transaction_id, COALESCE(ap.transaction_utr, ap.transaction_number) AS transaction_utr, ap.amount, ap.created_at, ap.payment_category AS sahyog_type
         FROM annual_maintenance_payments ap
         WHERE (LOWER(COALESCE(ap.transaction_number, '')) = $1 OR LOWER(COALESCE(ap.transaction_utr, '')) = $1)
           AND ($2::uuid IS NULL OR ap.id::text <> $2)
       ) matches
       ORDER BY created_at DESC`,
      [normalized, excludePaymentId ?? null],
    );

    return { exists: rows.length > 0, matches: rows };
  } catch (error) {
    try {
      const fallbackRows = await queryRows<any>(
        `SELECT source, id, user_id, transaction_number, transaction_id, transaction_utr, amount, created_at, sahyog_type
         FROM (
           SELECT 'receipts'::text AS source, r.id, r.user_id, r.transaction_number, r.transaction_id, r.transaction_utr, r.amount, r.created_at, r.sahyog_type
           FROM receipts r
           WHERE LOWER(COALESCE(r.transaction_number, '')) = $1
              OR LOWER(COALESCE(r.transaction_id, '')) = $1
              OR LOWER(COALESCE(r.transaction_utr, '')) = $1

           UNION ALL

           SELECT 'annual_maintenance'::text AS source, ap.id, ap.user_id, ap.transaction_number, ap.transaction_number AS transaction_id, NULL AS transaction_utr, ap.amount, ap.created_at, ap.payment_category AS sahyog_type
           FROM annual_maintenance_payments ap
           WHERE LOWER(COALESCE(ap.transaction_number, '')) = $1
             AND ($2::uuid IS NULL OR ap.id::text <> $2)
         ) matches
         ORDER BY created_at DESC`,
        [normalized, excludePaymentId ?? null],
      );

      return { exists: fallbackRows.length > 0, matches: fallbackRows };
    } catch (fallbackError) {
      return { exists: false, matches: [], error: toDbError(fallbackError) };
    }
  }
}

export async function getAnnualMaintenancePaymentByUser(userId: string) {
  try {
    const data = await queryRows<any>(
      `SELECT ap.*,
              u.name AS user_name,
              u.district AS user_district,
              u.email AS user_email,
              u.phone_number AS user_phone
       FROM annual_maintenance_payments ap
       LEFT JOIN users u ON u.id = ap.user_id
       WHERE ap.user_id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'
       ORDER BY ap.created_at DESC`,
      [userId],
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getAnnualMaintenancePaymentByTransaction(userId: string, transactionNumber: string) {
  const normalized = normalizeTransactionReference(transactionNumber);
  if (!normalized) {
    return { data: null, error: null };
  }

  try {
    const rows = await queryRows<any>(
      `SELECT *
       FROM annual_maintenance_payments
       WHERE payment_category = 'ANNUAL_MAINTENANCE'
         AND user_id = $1
         AND LOWER(transaction_number) = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, normalized],
    );

    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export function normalizeAnnualMaintenancePaidToName(value?: string | null) {
  if (!value || value === "SWS Bharat Annual Maintenance Fund") {
    return "Registration Money";
  }

  return value;
}

export async function getAnnualMaintenancePaymentById(paymentId: string) {
  try {
    const rows = await queryRows<any>(
      `SELECT ap.*,
              u.name AS user_name,
              u.district AS user_district,
              u.email AS user_email,
              u.phone_number AS user_phone
       FROM annual_maintenance_payments ap
       LEFT JOIN users u ON u.id = ap.user_id
       WHERE ap.id = $1 AND ap.payment_category = 'ANNUAL_MAINTENANCE'
       LIMIT 1`,
      [paymentId],
    );

    const row = rows[0] ?? null;
    if (!row) {
      return { data: null, error: null };
    }

    return {
      data: {
        ...row,
        paid_to_name: normalizeAnnualMaintenancePaidToName(row.paid_to_name),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function updateAnnualMaintenancePayment(paymentId: string, updates: Record<string, unknown>) {
  try {
    const hasVerificationStatusColumn = await annualMaintenanceSupportsColumn("verification_status");
    const hasTransactionUtrColumn = await annualMaintenanceSupportsColumn("transaction_utr");
    const entries = Object.entries(updates)
      .filter(([, value]) => value !== undefined)
      .filter(([key]) => key !== "verification_status" || hasVerificationStatusColumn)
      .filter(([key]) => key !== "transaction_utr" || hasTransactionUtrColumn);

    if (entries.length === 0) {
      return { data: null, error: null };
    }

    const setClause = entries.map(([key], index) => `"${key}" = $${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);
    const rows = await queryRows<any>(
      `UPDATE annual_maintenance_payments
       SET ${setClause}
       WHERE id = $${entries.length + 1} AND payment_category = 'ANNUAL_MAINTENANCE'
       RETURNING *`,
      [...values, paymentId],
    );

    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export function buildAnnualMaintenanceReceiptNumber(paymentId: string) {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const shortId = String(paymentId).replace(/-/g, "").slice(0, 8).toUpperCase();
  return `AM-REC-${dateStamp}-${shortId}`;
}

export async function ensureAnnualMaintenanceReceiptRecord(paymentId: string, receiptNumber: string, generatedReceiptPath: string) {
  try {
    const rows = await queryRows<any>(
      `UPDATE annual_maintenance_payments
       SET receipt_number = COALESCE(receipt_number, $1),
           generated_receipt_path = COALESCE(generated_receipt_path, $2),
           updated_at = NOW()
       WHERE id = $3 AND payment_category = 'ANNUAL_MAINTENANCE'
       RETURNING *`,
      [receiptNumber, generatedReceiptPath, paymentId],
    );

    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function generateAnnualMaintenanceReceipt(payment: {
  id: string;
  user_id: string;
  transaction_number: string;
  amount: number | string | null;
  payment_date?: string | null;
  created_at?: string | null;
  receipt_number?: string | null;
  status?: string | null;
}, user: {
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  district?: string | null;
  state?: string | null;
  village_city?: string | null;
  house_flat_no?: string | null;
  street_locality?: string | null;
  landmark?: string | null;
  pincode?: string | null;
  country?: string | null;
}) {
  const receiptNumber = payment.receipt_number || buildAnnualMaintenanceReceiptNumber(payment.id);
  const address = [
    user.house_flat_no,
    user.street_locality,
    user.landmark,
    user.village_city,
    user.district,
    user.state,
    user.pincode,
    user.country,
  ].filter(Boolean).join(", ") || "-";

  const pdfRelativePath = await generateReceiptPdf({
    receipt_number: receiptNumber,
    transaction_number: payment.transaction_number,
    transaction_id: payment.transaction_number,
    amount: payment.amount ?? 0,
    created_at: payment.created_at ?? new Date().toISOString(),
    id: payment.id,
    user_id: payment.user_id,
    transaction_date: payment.payment_date ?? payment.created_at ?? null,
    paid_by_name: user.name ?? "-",
    paid_by_district: user.district ?? "-",
    paid_to_name: "Registration Money",
    paid_to_district: user.district ?? "-",
    sahyog_type: "Annual Maintenance",
    payment_provider: "Annual Maintenance",
  }, {
    name: user.name ?? "-",
    phone_number: user.phone_number ?? null,
    email: user.email ?? null,
    address,
    paid_by_name: user.name ?? "-",
    paid_by_district: user.district ?? "-",
    paid_to_name: normalizeAnnualMaintenancePaidToName("SWS Bharat Annual Maintenance Fund"),
    paid_to_district: user.district ?? "-",
  });

  return {
    receipt_number: receiptNumber,
    generated_receipt_path: pdfRelativePath,
    paid_to_name: "Registration Money",
  };
}
