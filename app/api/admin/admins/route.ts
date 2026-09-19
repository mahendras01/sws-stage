import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, getAdminContext, isDistrictScopedAdminRole, isCountryLevelAdminRole } from "@/lib/auth";
import { listAdmins, createOrUpdateAdmin, logAdminAssignment, getDistrictByName, upsertDistrict, getDistrictById, getAdminById } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { resolveDistrictFromPincode } from "@/lib/up-districts";

export const dynamic = "force-dynamic";

const ALLOWED_ADMIN_ROLES = ["super_admin", "country_co_admin", "district_admin", "district_co_admin"] as const;
const DEFAULT_ADMIN_PASSWORD = "Admin@12345";

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

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);
    if (!isCountryLevelAdminRole(adminContext.role)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await listAdmins();
    if (error) {
      console.error("Failed to list admins:", error);
      return NextResponse.json({ success: false, admins: [] });
    }

    return NextResponse.json({ success: true, admins: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const adminContext = getAdminContext(auth.session);
    if (!isCountryLevelAdminRole(adminContext.role)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, role, district, district_id, pincode, is_active, password, country, status } = body;

    if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ success: false, message: "Invalid admin role" }, { status: 400 });
    }

    const safeId = typeof id === "string" ? id.trim() : "";
    const safeName = typeof name === "string" ? name.trim() : "";
    const safeEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const safeDistrict = typeof district === "string" ? district.trim() : "";
    const rawDistrictId = typeof district_id === "string" ? district_id.trim() : "";
    const safeDistrictId = rawDistrictId && /^[0-9a-fA-F-]{36}$/.test(rawDistrictId) ? rawDistrictId : "";
    const safePincode = typeof pincode === "string" ? pincode.trim() : "";
    const safeCountry = typeof country === "string" ? country.trim() || "India" : "India";
    const safeStatus = status === "pending" || status === "approved" || status === "rejected" ? status : "approved";
    const suppliedPassword = typeof password === "string" ? password.trim() : "";
    const adminPlaceholders = buildAdminPlaceholders(safeName);

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

    const finalDistrictName = isDistrictScopedAdminRole(role) ? (resolvedDistrictName && resolvedDistrictName.trim() ? resolvedDistrictName.trim() : null) : null;
    const finalDistrictId = isDistrictScopedAdminRole(role) ? (resolvedDistrictId && resolvedDistrictId.trim() ? resolvedDistrictId.trim() : null) : null;

    let passwordHash = await bcrypt.hash(suppliedPassword || DEFAULT_ADMIN_PASSWORD, 12);
    if (safeId) {
      const { data: existingAdmin } = await getAdminById(safeId);
      if (existingAdmin?.password_hash) {
        passwordHash = existingAdmin.password_hash;
      }
    }

    const adminData: Record<string, unknown> = {
      id: safeId || undefined,
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
      console.error("Failed to create/update admin:", error);
      return NextResponse.json({ success: false, message: "Failed to create/update admin" }, { status: 500 });
    }

    try {
      await logAdminAssignment({
        admin_user_id: data.id,
        acted_by: auth.session.user.id,
        action: safeId ? "update" : "assign",
        mapping_role: role,
        district: isDistrictScopedAdminRole(role) ? finalDistrictName : null,
        note: safeId ? `Updated ${role} admin record` : `Created ${role} admin account`,
      });
    } catch (auditError) {
      console.error("Failed to create admin assignment audit record. Rolling back newly created admin user:", auditError);

      if (!safeId) {
        const { error: rollbackError } = await supabase.from("users").delete().eq("id", data.id);
        if (rollbackError) {
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
