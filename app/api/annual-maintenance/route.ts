import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAnnualMaintenancePayment, getAnnualMaintenanceSettings } from "@/lib/annual-maintenance";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getAnnualMaintenanceSettings();
  if (error) {
    return NextResponse.json({ success: false, message: "Failed to load annual maintenance details", details: error.message }, { status: 500 });
  }

  const settings = data && data.is_active ? data : null;
  return NextResponse.json({ success: true, settings });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const form = await request.formData();
  const transactionNumber = String(form.get("transactionNumber") ?? "").trim();
  const amountValue = form.get("amount");
  const amount = amountValue !== null && amountValue !== "" ? Number(amountValue) : null;
  const paymentDate = String(form.get("paymentDate") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const file = form.get("receipt") as File | null;

  if (!transactionNumber) {
    return NextResponse.json({ success: false, message: "Transaction Number is required" }, { status: 400 });
  }

  if (amount === null || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ success: false, message: "Valid amount is required" }, { status: 400 });
  }

  if (!file || !(file instanceof File) || typeof file.size !== "number") {
    return NextResponse.json({ success: false, message: "Payment receipt is required" }, { status: 400 });
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ success: false, message: "Only PDF, JPG, JPEG, and PNG files are allowed" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: "File too large. Maximum size is 5MB." }, { status: 400 });
  }

  const storageDir = path.join(process.cwd(), "annual_maintenance_receipts");
  await fs.promises.mkdir(storageDir, { recursive: true });

  const safeName = `${Date.now()}-${String(file.name || "receipt").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const finalPath = path.join(storageDir, safeName);
  const arrayBuffer = await file.arrayBuffer();
  await fs.promises.writeFile(finalPath, Buffer.from(arrayBuffer));

  const receiptPath = path.join("annual_maintenance_receipts", safeName);

  const { data, error } = await createAnnualMaintenancePayment({
    userId: auth.session.user.id,
    transactionNumber,
    amount,
    paymentDate: paymentDate || null,
    receiptPath,
    receiptName: safeName,
    notes: notes || null,
  });

  if (error) {
    try {
      await fs.promises.unlink(finalPath);
    } catch {
      // ignore cleanup errors
    }
    return NextResponse.json({ success: false, message: "Failed to save payment submission", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, item: data }, { status: 201 });
}
