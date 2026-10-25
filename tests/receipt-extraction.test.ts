import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { computeFileHash, extractPaymentFieldsFromText, isWorkerBasedReceiptParsingEnabled, normalizeReceiptReference, normalizeReferenceValue, validateReceiptFile } from "../lib/receipt-extraction.ts";
import { normalizeTransactionReference, findDuplicateTransactionNumber, generateAnnualMaintenanceReceipt, normalizeAnnualMaintenancePaidToName } from "../lib/annual-maintenance.ts";
import { ensurePdfKitFontDataFiles, generateReceiptPdf, regenerateStoredReceiptPdf, resolveDevanagariFontPath } from "../lib/pdf.ts";

test("extractPaymentFieldsFromText parses a PhonePe receipt snapshot", () => {
  const sample = `
    PhonePe Transaction Successful
    Amount: ₹ 1,250.00
    Transaction ID: PHE1234567890
    Paid by: Jasmeet Singh
    Date: 12/10/2026 18:42
  `;

  const result = extractPaymentFieldsFromText(sample);

  assert.equal(result.paymentProvider, "PhonePe");
  assert.equal(result.amount, 1250);
  assert.equal(result.transactionId, "PHE1234567890");
  assert.equal(result.transactionDate, "2026-10-12");
  assert.equal(result.transactionTime, "18:42");
  assert.equal(result.payerName, "Jasmeet Singh");
});

test("extractPaymentFieldsFromText keeps transaction ID and UTR distinct", () => {
  const sample = `
    Google Pay
    Amount paid: INR 560.50
    Txn ID: GPAY-4F9D3A0B
    UTR: 123456789012
    Date: 24/11/2026
  `;

  const result = extractPaymentFieldsFromText(sample);

  assert.equal(result.paymentProvider, "Google Pay");
  assert.equal(result.amount, 560.5);
  assert.equal(result.transactionId, "GPAY-4F9D3A0B");
  assert.equal(result.utr, "123456789012");
  assert.equal(result.transactionDate, "2026-11-24");
});

test("extractPaymentFieldsFromText handles a bank transfer reference without an ID", () => {
  const sample = `
    HDFC Bank - NEFT Credit
    Amount: 2250.00
    UTR: HDFCN231020000012345
    Date: 03-02-2027
  `;

  const result = extractPaymentFieldsFromText(sample);

  assert.equal(result.paymentProvider, "Bank Transfer");
  assert.equal(result.amount, 2250);
  assert.equal(result.utr, "HDFCN231020000012345");
  assert.equal(result.transactionId, null);
  assert.equal(result.transactionDate, "2027-02-03");
});

test("worker-based receipt parsing stays opt-in by default", () => {
  delete process.env.ENABLE_OCR;
  delete process.env.ENABLE_PDFJS;
  assert.equal(isWorkerBasedReceiptParsingEnabled(), false);

  process.env.ENABLE_OCR = "true";
  assert.equal(isWorkerBasedReceiptParsingEnabled(), true);

  delete process.env.ENABLE_OCR;
  process.env.ENABLE_PDFJS = "true";
  assert.equal(isWorkerBasedReceiptParsingEnabled(), true);

  delete process.env.ENABLE_PDFJS;
});

test("normalizeReceiptReference prefers the first non-empty reference", () => {
  assert.equal(normalizeReceiptReference("  ", "TXN-8842", "UTR-2215"), "TXN-8842");
  assert.equal(normalizeReceiptReference("", null, "UTR-9988"), "UTR-9988");
  assert.equal(normalizeReceiptReference("", "", ""), null);
});

test("normalizeReferenceValue trims and lowercases payment references", () => {
  assert.equal(normalizeReferenceValue("  UTR-123  "), "utr-123");
  assert.equal(normalizeReferenceValue("   "), null);
  assert.equal(normalizeReferenceValue("A/B-C"), "a/b-c");
});

test("computeFileHash deterministically fingerprints uploaded bytes", () => {
  const digest = computeFileHash(Buffer.from("same bytes same hash"));
  assert.equal(digest, "ee89a95bdd5eb47f929bd3bf84d951a03f5c40b097c1a09d5de5e8fbfcdbc7f7");
  assert.equal(computeFileHash(Buffer.from("same bytes same hash")), digest);
  assert.notEqual(computeFileHash(Buffer.from("other bytes")), digest);
});

test("validateReceiptFile rejects non-payment files", async () => {
  const file = new File(["not a receipt"], "notes.txt", { type: "text/plain" });

  const result = await validateReceiptFile(file, "notes.txt");

  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /Unsupported file type/i);
});

test("validateReceiptFile accepts a valid PDF signature", async () => {
  const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  const file = new File([pdfBytes], "valid.pdf", { type: "application/pdf" });

  const result = await validateReceiptFile(file, "valid.pdf");

  assert.equal(result.valid, true);
  assert.equal(result.mimeType, "application/pdf");
});

test("normalizeTransactionReference trims and lowercases references", () => {
  assert.equal(normalizeTransactionReference(" UTR-123 " ), "utr-123");
  assert.equal(normalizeTransactionReference(""), null);
  assert.equal(normalizeTransactionReference(null), null);
});

test("ensurePdfKitFontDataFiles restores the AFM files needed by PDFKit in production builds", () => {
  const targets = [
    path.join(process.cwd(), ".next", "server", "chunks", "data"),
    path.join(process.cwd(), ".next", "server", "data"),
  ];

  for (const target of targets) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  const copied = ensurePdfKitFontDataFiles();
  assert.ok(copied.length > 0, "expected PDFKit font files to be restored");
  assert.ok(copied.some((file) => file.endsWith("Helvetica.afm")), "expected Helvetica.afm to be available");
});

test("resolveDevanagariFontPath accepts valid Devanagari font collections like .ttc", () => {
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-devanagari-font-"));
  const fontPath = path.join(tempDir, "GotuDevanagari-Regular.ttc");
  fs.writeFileSync(fontPath, Buffer.from("fake-ttc-font"));

  const previous = process.env.PDF_DEVANAGARI_FONT_PATH;
  process.env.PDF_DEVANAGARI_FONT_PATH = fontPath;

  try {
    const resolved = resolveDevanagariFontPath();
    assert.equal(resolved, fontPath, "expected a .ttc Devanagari font path to be accepted");
  } finally {
    if (previous === undefined) {
      delete process.env.PDF_DEVANAGARI_FONT_PATH;
    } else {
      process.env.PDF_DEVANAGARI_FONT_PATH = previous;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("resolveDevanagariFontPath finds a Unicode-capable Devanagari font when available", () => {
  const resolved = resolveDevanagariFontPath();
  if (resolved) {
    assert.ok(fs.existsSync(resolved), "expected the discovered font path to exist");
    assert.match(resolved, /\.(ttf|otf|ttc|otc)$/i, "expected a supported Devanagari font file");
  }
});

test("generateReceiptPdf does not embed the superscript fallback character in the amount text", async () => {
  const receiptData = {
    receipt_number: "PDF-TEST-CHARACTER-CASE",
    transaction_number: "TXN-BAD-CHAR",
    transaction_id: "TXN-BAD-CHAR",
    amount: 1,
    created_at: new Date().toISOString(),
    sahyog_type: "General",
    paid_by_name: "Test User",
    paid_by_district: "Lucknow",
    paid_to_name: "Self Welfare Society",
    paid_to_district: "Lucknow",
  };

  const outputPath = path.join(process.cwd(), "private", "receipts", "pdf", "SWS-REC-FONT-TEST.pdf");
  const pdfOutput = await generateReceiptPdf(receiptData, {
    name: "Test User",
    phone_number: "9999999999",
    email: "test@example.com",
    address: "1 Main Street, Lucknow",
    paid_by_name: "Test User",
    paid_by_district: "Lucknow",
    paid_to_name: "Self Welfare Society",
    paid_to_district: "Lucknow",
  }, { outputPath });

  assert.ok(pdfOutput.startsWith("private/receipts/pdf/"));
  const pdfFilePath = path.join(process.cwd(), pdfOutput);
  const extractedText = execFileSync("python3", [
    "-c",
    `from pypdf import PdfReader
from io import BytesIO
import sys
pdf_bytes = open(sys.argv[1], 'rb').read()
reader = PdfReader(BytesIO(pdf_bytes))
text = "\\n".join(page.extract_text() or "" for page in reader.pages)
print(text)
`,
    pdfFilePath,
  ], { encoding: "utf8" });

  assert.ok(!extractedText.includes("¹"), "expected the superscript fallback character to be absent from the rendered PDF text");
  assert.match(extractedText, /₹\s*1\.00|Rs\.?\s*1\.00|INR\s*1\.00/i, "expected the rupee amount to render correctly in the actual PDF text");

  await fs.promises.unlink(path.join(process.cwd(), pdfOutput)).catch(() => undefined);
});

test("regenerateStoredReceiptPdf refreshes stale JPG receipt artifacts into valid PDFs", async () => {
  const staleRelativePath = path.join("private", "receipts", "evidence", "legacy-receipt.jpg");
  const staleAbsolutePath = path.join(process.cwd(), staleRelativePath);
  await fs.promises.mkdir(path.dirname(staleAbsolutePath), { recursive: true });
  await fs.promises.writeFile(staleAbsolutePath, Buffer.from("not-a-pdf"));

  const refreshedPath = await regenerateStoredReceiptPdf({
    receipt_number: "LEGACY-RECEIPT-123",
    transaction_number: "TXN-LEGACY-123",
    transaction_id: "TXN-LEGACY-123",
    amount: 50,
    created_at: new Date().toISOString(),
    sahyog_type: "General",
    paid_by_name: "Legacy Donor",
    paid_to_name: "Self Welfare Society",
  }, {
    name: "Legacy Donor",
    phone_number: "9999999999",
    email: "legacy@example.com",
    paid_by_name: "Legacy Donor",
    paid_to_name: "Self Welfare Society",
  }, staleRelativePath);

  assert.ok(refreshedPath, "expected a refreshed PDF path to be returned");
  assert.match(refreshedPath, /^private\/receipts\/pdf\//, "expected the canonical PDF directory to be used");
  assert.ok(refreshedPath.endsWith(".pdf"), "expected the refreshed receipt path to end in .pdf");

  const pdfFile = path.join(process.cwd(), refreshedPath);
  assert.ok(fs.existsSync(pdfFile), "expected the regenerated receipt PDF to exist");
  assert.equal(fs.readFileSync(pdfFile).subarray(0, 5).toString("ascii"), "%PDF-", "expected a real PDF signature");

  await fs.promises.unlink(staleAbsolutePath).catch(() => undefined);
  await fs.promises.unlink(pdfFile).catch(() => undefined);
});

test("generateReceiptPdf adds the diagonal SELF WELFARE SOCIETY watermark to the actual PDF output", async () => {
  const receiptData = {
    receipt_number: "PDF-WATERMARK-CASE",
    transaction_number: "TXN-WATERMARK-CASE",
    transaction_id: "TXN-WATERMARK-CASE",
    amount: 50,
    created_at: new Date().toISOString(),
    sahyog_type: "General",
    paid_by_name: "Watermark User",
    paid_by_district: "Lucknow",
    paid_to_name: "Self Welfare Society",
    paid_to_district: "Lucknow",
  };

  const outputPath = path.join(process.cwd(), "private", "receipts", "pdf", "SWS-REC-WATERMARK-TEST.pdf");
  const pdfOutput = await generateReceiptPdf(receiptData, {
    name: "Watermark User",
    phone_number: "9999999999",
    email: "watermark@example.com",
    address: "1 Main Street, Lucknow",
    paid_by_name: "Watermark User",
    paid_by_district: "Lucknow",
    paid_to_name: "Self Welfare Society",
    paid_to_district: "Lucknow",
  }, { outputPath });

  assert.ok(pdfOutput.startsWith("private/receipts/pdf/"));
  const pdfFilePath = path.join(process.cwd(), pdfOutput);
  const extractedText = execFileSync("python3", [
    "-c",
    `from pypdf import PdfReader
from io import BytesIO
import sys
pdf_bytes = open(sys.argv[1], 'rb').read()
reader = PdfReader(BytesIO(pdf_bytes))
text = "\\n".join(page.extract_text() or "" for page in reader.pages)
print(text)
`,
    pdfFilePath,
  ], { encoding: "utf8" });

  assert.match(extractedText, /SELF WELFARE SOCIETY/i, "expected the watermark text to appear in the actual PDF output");

  await fs.promises.unlink(path.join(process.cwd(), pdfOutput)).catch(() => undefined);
});

test("generateReceiptPdf can generate repeated receipts for the same seed without a filename collision", async () => {
  const receiptData = {
    receipt_number: "AM-REC-RETRY-SAME-SEED",
    transaction_number: "TXN-RETRY-SAME-SEED",
    transaction_id: "TXN-RETRY-SAME-SEED",
    amount: 2500,
    created_at: new Date().toISOString(),
    sahyog_type: "Annual Maintenance",
    paid_by_name: "Test User",
    paid_by_district: "Lucknow",
    paid_to_name: "Registration Money",
    paid_to_district: "Lucknow",
  };

  const firstPath = await generateReceiptPdf(receiptData, { name: "Test User", phone_number: "9999999999", email: "test@example.com", address: "1 Main Street, Lucknow", paid_by_name: "Test User", paid_by_district: "Lucknow", paid_to_name: "Registration Money", paid_to_district: "Lucknow" });
  const secondPath = await generateReceiptPdf(receiptData, { name: "Test User", phone_number: "9999999999", email: "test@example.com", address: "1 Main Street, Lucknow", paid_by_name: "Test User", paid_by_district: "Lucknow", paid_to_name: "Registration Money", paid_to_district: "Lucknow" });

  assert.ok(firstPath.startsWith("private/receipts/pdf/"));
  assert.ok(secondPath.startsWith("private/receipts/pdf/"));
  assert.ok(fs.existsSync(path.join(process.cwd(), firstPath)));
  assert.ok(fs.existsSync(path.join(process.cwd(), secondPath)));

  await fs.promises.unlink(path.join(process.cwd(), firstPath)).catch(() => undefined);
  await fs.promises.unlink(path.join(process.cwd(), secondPath)).catch(() => undefined);
});

test("normalizeAnnualMaintenancePaidToName remaps legacy annual-maintenance labels to SELF WELFARE SOCIETY", () => {
  assert.equal(normalizeAnnualMaintenancePaidToName("SWS Bharat Annual Maintenance Fund"), "SELF WELFARE SOCIETY");
  assert.equal(normalizeAnnualMaintenancePaidToName("Registration Money"), "SELF WELFARE SOCIETY");
  assert.equal(normalizeAnnualMaintenancePaidToName(null), "SELF WELFARE SOCIETY");
});

test("generateAnnualMaintenanceReceipt labels the recipient as SELF WELFARE SOCIETY", async () => {
  const result = await generateAnnualMaintenanceReceipt({
    id: "am-123",
    user_id: "user-123",
    transaction_number: "TXN-REG-123",
    amount: 2500,
    created_at: new Date().toISOString(),
    payment_date: new Date().toISOString(),
  }, {
    name: "Test User",
    email: "test@example.com",
    phone_number: "9999999999",
    district: "Lucknow",
    state: "Uttar Pradesh",
    village_city: "Lucknow",
    house_flat_no: "1",
    street_locality: "Main Street",
    landmark: "Near Park",
    pincode: "226001",
    country: "India",
  });

  assert.ok(result.generated_receipt_path);
  assert.match(result.generated_receipt_path, /^private\/receipts\/pdf\//);
  assert.equal(result.paid_to_name, "SELF WELFARE SOCIETY");

  const pdfFile = path.join(process.cwd(), result.generated_receipt_path);
  assert.ok(fs.existsSync(pdfFile), "expected PDF file to be generated");

  await fs.promises.unlink(pdfFile).catch(() => undefined);
});

test("findDuplicateTransactionNumber reports duplicates and accepts unique references", async () => {
  const duplicate = await findDuplicateTransactionNumber("TXN-ALREADY-USED");
  assert.equal(typeof duplicate.exists, "boolean");

  const unique = await findDuplicateTransactionNumber("UNIQUE-AM-TXN-7531");
  assert.equal(typeof unique.exists, "boolean");
});
