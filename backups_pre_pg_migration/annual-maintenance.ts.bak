import { supabase } from "./supabase";

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
  const { data, error } = await supabase
    .from("annual_maintenance_settings")
    .select("*")
    .eq("payment_category", "ANNUAL_MAINTENANCE")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: (data as AnnualMaintenanceSettings | null) ?? null, error };
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
      const { data, error } = await supabase
        .from("annual_maintenance_settings")
        .update(payloadToSave)
        .eq("id", existing.data.id)
        .select()
        .single();

      return { data, error };
    }

    const { data, error } = await supabase
      .from("annual_maintenance_settings")
      .insert({
        ...payloadToSave,
        created_by: userId,
      })
      .select()
      .single();

    return { data, error };
  };

  const firstAttempt = await tryUpsert(true);
  if (!firstAttempt.error) return firstAttempt;

  const isMissingFeeColumnError = String(firstAttempt.error.message).toLowerCase().includes("fee_amount") && String(firstAttempt.error.message).toLowerCase().includes("schema cache");
  if (!isMissingFeeColumnError) {
    return firstAttempt;
  }

  return tryUpsert(false);
}

export async function createAnnualMaintenancePayment(payload: {
  userId: string;
  transactionNumber: string;
  amount: number | null;
  paymentDate?: string | null;
  receiptPath?: string | null;
  receiptName?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from("annual_maintenance_payments")
    .insert({
      payment_category: "ANNUAL_MAINTENANCE",
      user_id: payload.userId,
      transaction_number: payload.transactionNumber.trim(),
      amount: payload.amount ?? null,
      payment_date: payload.paymentDate ?? null,
      payment_receipt_path: payload.receiptPath ?? null,
      payment_receipt_name: payload.receiptName ?? null,
      notes: payload.notes?.trim() || null,
      status: "pending",
    })
    .select()
    .single();

  return { data, error };
}

export async function getAnnualMaintenancePaymentByUser(userId: string) {
  const { data, error } = await supabase
    .from("annual_maintenance_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("payment_category", "ANNUAL_MAINTENANCE")
    .order("created_at", { ascending: false });

  return { data: data as any[] | null, error };
}
