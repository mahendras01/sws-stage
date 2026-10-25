import assert from "node:assert/strict";
import test from "node:test";

import { pickLatestReceiptNumber } from "../lib/user-id-card.ts";

test("pickLatestReceiptNumber prefers the newest non-empty receipt number", () => {
  const result = pickLatestReceiptNumber([
    { receipt_number: "AM-REC-20240101-0001", created_at: "2024-01-01T10:00:00Z" },
    { receipt_number: "AM-REC-20240201-0002", created_at: "2024-02-01T10:00:00Z" },
    { receipt_number: "AM-REC-20240301-0003", created_at: "2024-03-01T10:00:00Z" },
  ]);

  assert.equal(result, "AM-REC-20240301-0003");
});

test("pickLatestReceiptNumber ignores blank and missing values", () => {
  const result = pickLatestReceiptNumber([
    { receipt_number: "", created_at: "2024-03-01T10:00:00Z" },
    { receipt_number: null, created_at: "2024-02-01T10:00:00Z" },
    { receipt_number: "AM-REC-20240101-0001", created_at: "2024-01-01T10:00:00Z" },
  ]);

  assert.equal(result, "AM-REC-20240101-0001");
});
