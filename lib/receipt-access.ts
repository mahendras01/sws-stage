export function canViewAllSahyogReceipts(role?: string | null) {
  return role === "super_admin";
}

export function canAccessReceiptForUser(
  viewer?: { id?: string | null; role?: string | null } | null,
  receiptOwnerId?: string | null,
) {
  if (!viewer?.id) {
    return false;
  }

  if (String(receiptOwnerId ?? "") === String(viewer.id)) {
    return true;
  }

  return canViewAllSahyogReceipts(viewer.role) && Boolean(receiptOwnerId);
}
