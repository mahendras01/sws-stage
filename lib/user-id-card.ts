import { queryRows, toDbError } from "./postgres.ts";
import type { User } from "./types";

export type UserIdCardRow = {
  receipt_number?: string | null;
  created_at?: string | null;
  status?: string | null;
  verification_status?: string | null;
};

export function pickLatestReceiptNumber(rows: UserIdCardRow[]): string | null {
  const filtered = rows.filter((row) => typeof row?.receipt_number === "string" && row.receipt_number.trim().length > 0);
  if (filtered.length === 0) {
    return null;
  }

  const sorted = [...filtered].sort((left, right) => {
    const leftValue = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightValue = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightValue - leftValue;
  });

  return sorted[0].receipt_number?.trim() ?? null;
}

export async function getCurrentUserIdCardData(userId: string) {
  try {
    const userRows = await queryRows<Partial<User>>(
      `SELECT id, email, name, date_of_birth, ehrms_code, gender, phone_number, phone_home, blood_group
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    const user = userRows[0] ?? null;
    if (!user) {
      return { user: null, swsId: null, error: new Error("User not found") };
    }

    const rows = await queryRows<UserIdCardRow>(
      `SELECT receipt_number, created_at
       FROM annual_maintenance_payments
       WHERE user_id = $1
         AND payment_category = 'ANNUAL_MAINTENANCE'
         AND receipt_number IS NOT NULL
         AND receipt_number <> ''
       ORDER BY created_at DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );

    return {
      user,
      swsId: pickLatestReceiptNumber(rows),
      error: null,
    };
  } catch (error) {
    return { user: null, swsId: null, error: toDbError(error) };
  }
}
