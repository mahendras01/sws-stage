import assert from "node:assert/strict";
import test from "node:test";

import { buildReceiptPagination, clampPageNumber, paginateItems } from "../lib/pagination.ts";

test("paginateItems returns the requested page slice and preserves ordering", () => {
  const items = Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }));

  const result = paginateItems(items, 2, 10);

  assert.deepEqual(result.items.map((item) => item.id), Array.from({ length: 10 }, (_, index) => index + 11));
  assert.equal(result.totalPages, 3);
  assert.equal(result.currentPage, 2);
  assert.equal(result.totalItems, 25);
});

test("buildReceiptPagination clamps page values and creates numbered links for page boundaries", () => {
  const pagination = buildReceiptPagination({
    totalItems: 45,
    currentPage: 12,
    pageSize: 10,
    baseUrl: "/view-sahyog-receipt?receiptType=All",
  });

  assert.equal(clampPageNumber(12, 5), 5);
  assert.equal(pagination.currentPage, 5);
  assert.equal(pagination.totalPages, 5);
  assert.equal(pagination.prevPage, 4);
  assert.equal(pagination.nextPage, null);
  assert.deepEqual(pagination.pageNumbers, [1, 2, 3, 4, 5]);
  assert.equal(pagination.pageInfo, "Page 5 of 5");
});
