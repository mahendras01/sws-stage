import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { NextResponse } from "next/server";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.status !== "approved") {
    return {
      error: NextResponse.json(
        { success: false, message: "Account not approved" },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.user.is_admin) {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function isDistrictScopedAdminRole(role?: string | null) {
  return role === "district_admin" || role === "district_co_admin";
}

export function isCountryLevelAdminRole(role?: string | null) {
  return role === "super_admin" || role === "country_co_admin";
}

export function getAdminContext(session: { user: { role?: string; is_admin?: boolean; district?: string | null } }) {
  // Preserve explicit role values from session.user.role when present.
  // Allowed roles: 'user', 'district_admin', 'super_admin', 'country_co_admin', 'district_co_admin'
  const role = session.user.role ?? (session.user.is_admin ? "super_admin" : "user");

  return {
    role,
    district: session.user.district ?? null,
  };
}
