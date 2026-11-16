import assert from "node:assert/strict";
import test from "node:test";

import { formatReceiptDateForPdf } from "../lib/pdf.ts";

test("formatReceiptDateForPdf prefers the stored payment date and formats it as DD-MM-YYYY", () => {
  assert.equal(formatReceiptDateForPdf({ transaction_date: "2024-08-15", created_at: "2024-09-20T10:00:00Z" }), "15-08-2024");
});

test("formatReceiptDateForPdf falls back to the receipt upload timestamp when no payment date is present", () => {
  assert.equal(formatReceiptDateForPdf({ created_at: "2024-09-20T10:00:00Z" }), "20-09-2024");
});
