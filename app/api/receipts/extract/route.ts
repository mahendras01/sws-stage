import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { extractPaymentDocumentData, validateReceiptFile } from "@/lib/receipt-extraction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "Receipt file is required." }, { status: 400 });
    }

    const validation = await validateReceiptFile(file, file.name || "receipt");
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.error || "Invalid receipt file." }, { status: 400 });
    }

    const result = await extractPaymentDocumentData(file);
    return NextResponse.json({ success: true, extracted: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Failed to extract payment details.", details: error?.message ?? null }, { status: 500 });
  }
}
