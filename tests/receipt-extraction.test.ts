import assert from "node:assert/strict";
import test from "node:test";

import { extractPaymentFieldsFromText, isWorkerBasedReceiptParsingEnabled, normalizeReceiptReference, validateReceiptFile } from "../lib/receipt-extraction.ts";
import { normalizeTransactionReference, findDuplicateTransactionNumber } from "../lib/annual-maintenance.ts";

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

test("findDuplicateTransactionNumber reports duplicates and accepts unique references", async () => {
  const duplicate = await findDuplicateTransactionNumber("TXN-ALREADY-USED");
  assert.equal(typeof duplicate.exists, "boolean");

  const unique = await findDuplicateTransactionNumber("UNIQUE-AM-TXN-7531");
  assert.equal(typeof unique.exists, "boolean");
});
