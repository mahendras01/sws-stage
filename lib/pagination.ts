export function clampPageNumber(page: number | string | null | undefined, totalPages: number) {
  const safeTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
  const numericPage = Number.parseInt(String(page ?? "1"), 10);
  const basePage = Number.isFinite(numericPage) && numericPage > 0 ? numericPage : 1;

  return Math.min(Math.max(basePage, 1), safeTotalPages);
}

export function paginateItems<T>(items: T[], currentPage: number, pageSize: number) {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safeCurrentPage = clampPageNumber(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;

  return {
    items: items.slice(startIndex, endIndex),
    totalItems,
    totalPages,
    currentPage: safeCurrentPage,
    pageSize: safePageSize,
    startIndex,
    endIndex,
  };
}

export function buildReceiptPagination({
  totalItems,
  currentPage,
  pageSize,
}: {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  baseUrl?: string;
  receiptType?: string;
}) {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 0) / safePageSize));
  const safeCurrentPage = clampPageNumber(currentPage, totalPages);
  const prevPage = safeCurrentPage > 1 ? safeCurrentPage - 1 : null;
  const nextPage = safeCurrentPage < totalPages ? safeCurrentPage + 1 : null;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return {
    currentPage: safeCurrentPage,
    totalPages,
    prevPage,
    nextPage,
    pageNumbers,
    pageInfo: totalItems === 0 ? "No receipts found" : `Page ${safeCurrentPage} of ${totalPages}`,
    pageSize: safePageSize,
  };
}
