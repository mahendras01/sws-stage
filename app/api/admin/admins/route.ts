import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, getAdminContext, isDistrictScopedAdminRole, isCountryLevelAdminRole } from "@/lib/auth";
import { listAdmins, createOrUpdateAdmin, logAdminAssignment, getDistrictByName, upsertDistrict, getDistrictById, getAdminById } from "@/lib/db";
import { queryRows } from "@/lib/postgres";
import { getRequestMeta, log } from "@/lib/logger";
import { resolveDistrictFromPincode } from "@/lib/up-districts";

export const dynamic = "force-dynamic";

const ALLOWED_ADMIN_ROLES = ["super_admin", "country_co_admin", "district_admin", "district_co_admin"] as const;
const DEFAULT_ADMIN_PASSWORD = "Admin@12345";

const DUPLICATE_EMAIL_MESSAGE = "This email is already registered to another user or admin. Please use a different email.";
const ADMIN_EMAIL_IN_USE_MESSAGE = "This email is already assigned to an admin account. Please use a different email.";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhoneDigits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function isUniqueEmailViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const dbError = error as { code?: string; message?: string };
  return dbError.code === "23505" && /users_email_key|duplicate key value|unique constraint/i.test(dbError.message ?? "");
}

async function getUserByNormalizedEmail(email: string, excludeUserId?: string | null) {
  const trimmedExcludeId = typeof excludeUserId === "string" ? excludeUserId.trim() : "";
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return null;

  const params: unknown[] = [normalizedEmail];
  let sql = `
    SELECT id, email, role, is_admin
    FROM users
    WHERE LOWER(BTRIM(email)) = $1
  `;

  if (trimmedExcludeId) {
    params.push(trimmedExcludeId);
    sql += " AND id <> $2";
  }

  sql += " LIMIT 1";

  const rows = await queryRows<{ id: string; email: string; role: string | null; is_admin: boolean }>(sql, params);
  return rows[0] ?? null;
}

function buildAdminPlaceholders(name: string) {
  const safeName = (name || "Admin").trim() || "Admin";
  const uniqueNumber = Math.floor(Date.now() / 1000) % 900000000000 + 100000000000;
  const panDigits = String(Math.floor(Math.random() * 9000) + 1000);

  return {
    aadhar_number: String(uniqueNumber),
    pan_number: `ABCDE${panDigits}Z`,
    phone_number: String((Math.floor(Math.random() * 9000000000) + 1000000000)).slice(0, 10),
    bank_account_number: String((Math.floor(Math.random() * 900000000000000000) + 100000000000000000)).slice(0, 18),
    bank_ifsc_code: "ABCD0000001",
    bank_holder_name: safeName,
    country: "India",
  };
}

export async function GET(request: NextRequest) {
  const meta = getRequestMeta(request);
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      log.warn("admin.admins.lookup.unauthorized", meta);
      return auth.error;
    }

    const adminContext = getAdminContext(auth.session);
    if (!isCountryLevelAdminRole(adminContext.role)) {
      log.warn("admin.admins.lookup.forbidden", { ...meta, adminId: auth.session.user.id, adminRole: adminContext.role });
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const lookup = request.nextUrl.searchParams.get("lookup")?.trim() ?? "";
    if (lookup) {
      if (adminContext.role !== "super_admin") {
        log.warn("admin.admins.lookup.super_admin_required", { ...meta, adminId: auth.session.user.id, adminRole: adminContext.role });
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }

      const normalizedLookup = lookup.toLowerCase();
      const phoneDigits = normalizePhoneDigits(lookup);
      const phoneDigitsLast10 = phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;
      const phonePattern = phoneDigits ? `%${phoneDigits}%` : "%__NO_PHONE_MATCH__%";
      const phoneLast10Pattern = phoneDigitsLast10 ? `%${phoneDigitsLast10}%` : "%__NO_PHONE_MATCH__%";
      const emailPattern = `%${normalizedLookup}%`;

      const users = await queryRows<{
        id: string;
        name: string | null;
        email: string | null;
        phone_number: string | null;
        role: string | null;
        district: string | null;
        is_admin: boolean | null;
        status: string | null;
      }>(
        `SELECT id, name, email, phone_number, role, district, is_admin, status
         FROM users
         WHERE status = 'approved'
           AND role <> 'super_admin'
           AND (
             LOWER(BTRIM(email)) = LOWER(BTRIM($1))
             OR LOWER(BTRIM(email)) LIKE $2
             OR REGEXP_REPLACE(COALESCE(phone_number, ''), '\\D', '', 'g') LIKE $3
             OR REGEXP_REPLACE(COALESCE(phone_number, ''), '\\D', '', 'g') LIKE $4
           )
         ORDER BY created_at DESC
         LIMIT 10`,
        [lookup, emailPattern, phonePattern, phoneLast10Pattern],
      );

      if (users.length === 0) {
        log.info("admin.admins.lookup.no_result", {
          ...meta,
          adminId: auth.session.user.id,
          adminRole: adminContext.role,
          lookupType: lookup.includes("@") ? "email" : "mobile_or_text",
        });
      } else {
        log.info("admin.admins.lookup.success", {
          ...meta,
          adminId: auth.session.user.id,
          adminRole: adminContext.role,
          resultCount: users.length,
          lookupType: lookup.includes("@") ? "email" : "mobile_or_text",
        });
      }

      return NextResponse.json({
        success: true,
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
            district: user.district,
          is_admin: Boolean(user.is_admin),
          status: user.status,
        })),
      });
    }

    const { data, error } = await listAdmins();
    if (error) {
      log.error("admin.admins.list.failed", { ...meta, adminId: auth.session.user.id, adminRole: adminContext.role, error });
      return NextResponse.json({ success: false, admins: [] });
    }

    log.info("admin.admins.list.success", { ...meta, adminId: auth.session.user.id, adminRole: adminContext.role, count: (data ?? []).length });
    return NextResponse.json({ success: true, admins: data ?? [] });
  } catch (e) {
    log.error("admin.admins.lookup.exception", { ...meta, error: e });
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);
    if (adminContext.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, selected_user_id, name, email, role, district, district_id, pincode, is_active, password, country, status } = body;

    if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ success: false, message: "Invalid admin role" }, { status: 400 });
    }

    const safeId = typeof id === "string" ? id.trim() : "";
    const selectedUserId = typeof selected_user_id === "string" ? selected_user_id.trim() : "";
    const safeName = typeof name === "string" ? name.trim() : "";
    const safeEmail = normalizeEmail(email);
    const safeDistrict = typeof district === "string" ? district.trim() : "";
    const rawDistrictId = typeof district_id === "string" ? district_id.trim() : "";
    const safeDistrictId = rawDistrictId && /^[0-9a-fA-F-]{36}$/.test(rawDistrictId) ? rawDistrictId : "";
    const safePincode = typeof pincode === "string" ? pincode.trim() : "";
    const safeCountry = typeof country === "string" ? country.trim() || "India" : "India";
    const safeStatus = status === "pending" || status === "approved" || status === "rejected" ? status : "approved";
    const suppliedPassword = typeof password === "string" ? password.trim() : "";
    const adminPlaceholders = buildAdminPlaceholders(safeName);

    if (role === "country_co_admin") {
      const targetUserId = safeId || selectedUserId;
      if (!targetUserId || !/^[0-9a-fA-F-]{36}$/.test(targetUserId)) {
        return NextResponse.json({ success: false, message: "Select an existing registered user for Country Co-Admin assignment." }, { status: 400 });
      }

      const targetRows = await queryRows<{
        id: string;
        name: string | null;
        email: string | null;
        phone_number: string | null;
        role: string | null;
        is_admin: boolean | null;
        is_active: boolean | null;
        status: string | null;
        district: string | null;
        district_id: string | null;
        country: string | null;
      }>(
        `SELECT id, name, email, phone_number, role, is_admin, is_active, status, district, district_id, country
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [targetUserId],
      );
      const targetUser = targetRows[0] ?? null;

      if (!targetUser) {
        return NextResponse.json({ success: false, message: "Selected user not found." }, { status: 404 });
      }

      if (targetUser.status !== "approved") {
        return NextResponse.json({ success: false, message: "Only approved users can be assigned as Country Co-Admin." }, { status: 409 });
      }

      if (targetUser.role === "super_admin") {
        return NextResponse.json({ success: false, message: "Super Admin role cannot be reassigned from this screen." }, { status: 403 });
      }

      const creatingAssignment = !safeId;
      if (creatingAssignment && targetUser.is_admin) {
        return NextResponse.json({ success: false, message: "This user already has an admin assignment." }, { status: 409 });
      }

      const adminData: Record<string, unknown> = {
        id: targetUser.id,
        role,
        district: null,
        district_id: null,
        country: (targetUser.country && targetUser.country.trim()) || safeCountry,
        status: "approved",
        is_admin: true,
        is_active: is_active !== false,
      };

      const { data, error } = await createOrUpdateAdmin(adminData);
      if (error) {
        console.error("Failed to assign country co-admin:", error);
        return NextResponse.json({ success: false, message: "Failed to assign country co-admin" }, { status: 500 });
      }

      try {
        await logAdminAssignment({
          admin_user_id: data.id,
          acted_by: auth.session.user.id,
          action: safeId ? "update" : "assign",
          mapping_role: role,
          district: null,
          note: safeId
            ? "Updated country_co_admin admin assignment"
            : "Promoted existing user to country_co_admin",
        });
      } catch (auditError) {
        console.error("Failed to create admin assignment audit record:", auditError);
        return NextResponse.json({ success: false, message: "Admin assignment was not fully recorded." }, { status: 500 });
      }

      return NextResponse.json({ success: true, admin: data });
    }

    let resolvedDistrictName: string | null = safeDistrict || null;
    let resolvedDistrictId: string | null = safeDistrictId || null;

    if (isDistrictScopedAdminRole(role)) {
      if (safePincode) {
        try {
          const pincodeMatch = await resolveDistrictFromPincode(safePincode);
          if (resolvedDistrictName && resolvedDistrictName.toLowerCase() !== pincodeMatch.districtName.toLowerCase()) {
            return NextResponse.json({ success: false, message: `PIN code ${safePincode} maps to ${pincodeMatch.districtName}, not ${resolvedDistrictName}.` }, { status: 400 });
          }
          resolvedDistrictName = pincodeMatch.districtName;
        } catch (error) {
          return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Invalid PIN code for district assignment." }, { status: 400 });
        }
      }

      if (!resolvedDistrictName) {
        return NextResponse.json({ success: false, message: "A district is required for district-level admin roles" }, { status: 400 });
      }

      const districtRow = resolvedDistrictId ? await getDistrictById(resolvedDistrictId) : await getDistrictByName(resolvedDistrictName);

      if (!districtRow.data) {
        const { data: createdDistrict, error: districtError } = await upsertDistrict(resolvedDistrictName);
        if (districtError || !createdDistrict) {
          console.error("Failed to resolve district record:", districtError);
          return NextResponse.json({ success: false, message: "Unable to find or create the selected district." }, { status: 500 });
        }
        resolvedDistrictId = createdDistrict.id;
      } else {
        resolvedDistrictId = districtRow.data.id;
      }
    }

    if (!isDistrictScopedAdminRole(role) && (resolvedDistrictName || resolvedDistrictId)) {
      return NextResponse.json({ success: false, message: "Country-level admin roles must not be assigned a district" }, { status: 400 });
    }

    if (role === "super_admin" && !safeId) {
      const { data: existing } = await listAdmins();
      const hasActiveSuper = (existing ?? []).some((u: any) => u.role === "super_admin" && u.is_active);
      if (hasActiveSuper) {
        return NextResponse.json({ success: false, message: "An active Super Admin already exists" }, { status: 409 });
      }
    }

    const emailOwner = await getUserByNormalizedEmail(safeEmail, safeId || null);
    const promotingExistingUser = !safeId && !!emailOwner && !emailOwner.is_admin;
    const effectiveId = safeId || (promotingExistingUser ? emailOwner?.id ?? "" : "");

    if (emailOwner && !promotingExistingUser) {
      return NextResponse.json({
        success: false,
        message: emailOwner.is_admin ? ADMIN_EMAIL_IN_USE_MESSAGE : DUPLICATE_EMAIL_MESSAGE,
      }, { status: 409 });
    }

    const finalDistrictName = isDistrictScopedAdminRole(role) ? (resolvedDistrictName && resolvedDistrictName.trim() ? resolvedDistrictName.trim() : null) : null;
    const finalDistrictId = isDistrictScopedAdminRole(role) ? (resolvedDistrictId && resolvedDistrictId.trim() ? resolvedDistrictId.trim() : null) : null;

    let passwordHash = await bcrypt.hash(suppliedPassword || DEFAULT_ADMIN_PASSWORD, 12);
    if (effectiveId) {
      const { data: existingAdmin } = await getAdminById(effectiveId);
      if (existingAdmin?.password_hash) {
        passwordHash = existingAdmin.password_hash;
      }
    }

    const adminData: Record<string, unknown> = promotingExistingUser
      ? {
          // Promote an existing user account to admin without overwriting identity/banking fields.
          id: effectiveId,
          email: safeEmail,
          name: safeName,
          role,
          district: finalDistrictName,
          district_id: finalDistrictId,
          country: safeCountry,
          status: safeStatus,
          is_admin: true,
          is_active: is_active !== false,
        }
      : {
          id: effectiveId || undefined,
          email: safeEmail,
          password_hash: passwordHash,
          name: safeName,
          aadhar_number: adminPlaceholders.aadhar_number,
          pan_number: adminPlaceholders.pan_number,
          date_of_birth: null,
          gender: "Other",
          father_husband_name: safeName,
          bank_account_number: adminPlaceholders.bank_account_number,
          bank_ifsc_code: adminPlaceholders.bank_ifsc_code,
          bank_holder_name: adminPlaceholders.bank_holder_name,
          phone_number: adminPlaceholders.phone_number,
          role,
          district: finalDistrictName,
          district_id: finalDistrictId,
          state: "Uttar Pradesh",
          country: safeCountry,
          status: safeStatus,
          is_admin: true,
          is_active: is_active !== false,
        };

    const { data, error } = await createOrUpdateAdmin(adminData);
    if (error) {
      if (isUniqueEmailViolation(error)) {
        return NextResponse.json({ success: false, message: DUPLICATE_EMAIL_MESSAGE }, { status: 409 });
      }
      console.error("Failed to create/update admin:", error);
      return NextResponse.json({ success: false, message: "Failed to create/update admin" }, { status: 500 });
    }

    try {
      await logAdminAssignment({
        admin_user_id: data.id,
        acted_by: auth.session.user.id,
        action: effectiveId && safeId ? "update" : "assign",
        mapping_role: role,
        district: isDistrictScopedAdminRole(role) ? finalDistrictName : null,
        note: safeId
          ? `Updated ${role} admin record`
          : promotingExistingUser
            ? `Promoted existing user to ${role}`
            : `Created ${role} admin account`,
      });
    } catch (auditError) {
      console.error("Failed to create admin assignment audit record. Rolling back newly created admin user:", auditError);

      if (!safeId && !promotingExistingUser) {
        try {
          await queryRows("DELETE FROM users WHERE id = $1", [data.id]);
        } catch (rollbackError) {
          console.error("Rollback failed for admin user after audit write error:", rollbackError);
        }
      }

      return NextResponse.json({
        success: false,
        message: "Admin account could not be fully recorded. The operation was rolled back.",
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, admin: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
