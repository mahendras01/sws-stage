import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findDuplicateTransactionNumber } from "@/lib/annual-maintenance";
import { normalizeReferenceValue } from "@/lib/receipt-extraction";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const rawTransactionNumber = String(url.searchParams.get("transactionNumber") ?? "");
  const transactionNumber = normalizeReferenceValue(rawTransactionNumber);
  if (!transactionNumber) {
    return NextResponse.json({ success: false, message: "Transaction number is required." }, { status: 400 });
  }

  const duplicateResult = await findDuplicateTransactionNumber(transactionNumber);
  if (duplicateResult.exists) {
    return NextResponse.json({
      success: false,
      duplicate: true,
      message: "This UTR / Transaction Number has already been used. Please check your receipt.",
    }, { status: 409 });
  }

  return NextResponse.json({ success: true, duplicate: false });
}
