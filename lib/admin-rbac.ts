export const DISTRICT_SCOPED_ADMIN_ROLES = ["district_admin", "district_co_admin"] as const;
export const COUNTRY_LEVEL_ADMIN_ROLES = ["super_admin", "country_co_admin"] as const;
export const PENDING_USERS_VIEW_ROLES = ["super_admin", "country_co_admin", "admin_read_only"] as const;
export const PENDING_USERS_MANAGE_ROLES = ["super_admin"] as const;

const DISTRICT_SCOPED_ADMIN_ROLE_SET = new Set<string>(DISTRICT_SCOPED_ADMIN_ROLES);
const COUNTRY_LEVEL_ADMIN_ROLE_SET = new Set<string>(COUNTRY_LEVEL_ADMIN_ROLES);
const PENDING_USERS_VIEW_ROLE_SET = new Set<string>(PENDING_USERS_VIEW_ROLES);
const PENDING_USERS_MANAGE_ROLE_SET = new Set<string>(PENDING_USERS_MANAGE_ROLES);

export function isDistrictScopedAdminRole(role?: string | null) {
  return DISTRICT_SCOPED_ADMIN_ROLE_SET.has(role ?? "");
}

export function isCountryLevelAdminRole(role?: string | null) {
  return COUNTRY_LEVEL_ADMIN_ROLE_SET.has(role ?? "");
}

export function canViewPendingUsers(role?: string | null) {
  return PENDING_USERS_VIEW_ROLE_SET.has(role ?? "");
}

export function canManagePendingUsers(role?: string | null) {
  return PENDING_USERS_MANAGE_ROLE_SET.has(role ?? "");
}