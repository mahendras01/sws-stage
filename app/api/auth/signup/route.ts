import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { calculateMembershipExpiryDate, validateSignup } from "@/lib/validation";
import {
  createUser,
  getDepartmentById,
  getPostById,
  getUserByAadhar,
  getUserByEhrmsCode,
  getUserByEmail,
  getUserByPan,
  getDistrictAdminIds,
  getCountryAdminIds,
  createNotificationsBatch,
} from "@/lib/db";
import { verifyPincodeMatch } from "@/lib/pincode";
import type { SignupInput } from "@/lib/types";

function getFriendlySignupError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: string }).message || "");

    if (message.includes("relation \"users\"") || message.includes("does not exist")) {
      return "Database table is missing. Run the SQL from supabase/schema.sql in Supabase.";
    }

    if (message.includes("duplicate key")) {
      return "A user with the same email, Aadhaar, PAN, or EHRMS code already exists.";
    }

    return message;
  }

  return "Failed to create account";
}

async function parseSignupBody(request: NextRequest): Promise<SignupInput> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json() as Promise<SignupInput>;
  }

  const formData = await request.formData();

  const acceptTerms = formData.get("accept_terms");

  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm_password: String(formData.get("confirm_password") ?? ""),
    name: String(formData.get("name") ?? ""),
    aadhar_number: String(formData.get("aadhar_number") ?? ""),
    pan_number: String(formData.get("pan_number") ?? ""),
    date_of_birth: String(formData.get("date_of_birth") ?? ""),
    ehrms_code: String(formData.get("ehrms_code") ?? ""),
    confirm_ehrms_code: String(formData.get("confirm_ehrms_code") ?? ""),
    role_number: String(formData.get("role_number") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    father_husband_name: String(formData.get("father_husband_name") ?? ""),
    department_id: String(formData.get("department_id") ?? ""),
    post_id: String(formData.get("post_id") ?? ""),
    nominee_name: String(formData.get("nominee_name") ?? ""),
    nominee_relationship: String(formData.get("nominee_relationship") ?? ""),
    nominee_mobile_number: String(formData.get("nominee_mobile_number") ?? ""),
    nominee_aadhar_number: String(formData.get("nominee_aadhar_number") ?? ""),
    reference_name: String(formData.get("reference_name") ?? ""),
    bank_account_number: String(formData.get("bank_account_number") ?? ""),
    bank_ifsc_code: String(formData.get("bank_ifsc_code") ?? ""),
    bank_holder_name: String(formData.get("bank_holder_name") ?? ""),
    phone_number: String(formData.get("phone_number") ?? ""),
    blood_group: String(formData.get("blood_group") ?? ""),
    house_flat_no: String(formData.get("house_flat_no") ?? ""),
    street_locality: String(formData.get("street_locality") ?? ""),
    landmark: String(formData.get("landmark") ?? ""),
    village_city: String(formData.get("village_city") ?? ""),
    district: String(formData.get("district") ?? ""),
    state: String(formData.get("state") ?? ""),
    pincode: String(formData.get("pincode") ?? ""),
    country: String(formData.get("country") ?? "India"),
    permanent_same_as_current: formData.get("permanent_same_as_current") === "true" || formData.get("permanent_same_as_current") === "on" || formData.get("permanent_same_as_current") === "1",
    permanent_house_flat_no: String(formData.get("permanent_house_flat_no") ?? ""),
    permanent_street_locality: String(formData.get("permanent_street_locality") ?? ""),
    permanent_landmark: String(formData.get("permanent_landmark") ?? ""),
    permanent_village_city: String(formData.get("permanent_village_city") ?? ""),
    permanent_district: String(formData.get("permanent_district") ?? ""),
    permanent_state: String(formData.get("permanent_state") ?? ""),
    permanent_pincode: String(formData.get("permanent_pincode") ?? ""),
    permanent_country: String(formData.get("permanent_country") ?? "India"),
    accept_terms: acceptTerms === "true" || acceptTerms === "on" || acceptTerms === "1",
  };
}

async function validateDepartmentPostRelationship(departmentId: string, postId: string) {
  const [departmentResult, postResult] = await Promise.all([
    getDepartmentById(departmentId),
    getPostById(postId),
  ]);

  if (departmentResult.error || !departmentResult.data) {
    return { valid: false, error: "Selected department is invalid." };
  }

  if (postResult.error || !postResult.data) {
    return { valid: false, error: "Selected post is invalid." };
  }

  if (postResult.data.department_id !== departmentId) {
    return { valid: false, error: "Selected post does not belong to the selected department." };
  }

  return { valid: true, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseSignupBody(request);

    const validation = validateSignup(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: validation.errors },
        { status: 400 },
      );
    }

    const email = body.email.toLowerCase().trim();
    const pan = body.pan_number.toUpperCase();
    const ehrmsCode = body.ehrms_code.trim().toUpperCase();
    const ifsc = body.bank_ifsc_code.toUpperCase();
    const houseFlatNo = body.house_flat_no.trim();
    const streetLocality = body.street_locality.trim();
    const landmark = body.landmark.trim();
    const villageCity = body.village_city.trim();
    const district = body.district.trim();
    const state = body.state.trim();
    const pincode = body.pincode.trim();
    const country = body.country.trim() || "India";

    const departmentPostValidation = await validateDepartmentPostRelationship(body.department_id, body.post_id);
    if (!departmentPostValidation.valid) {
      return NextResponse.json(
        { success: false, message: departmentPostValidation.error, errors: { department_id: departmentPostValidation.error ?? "Invalid department/post selection." } },
        { status: 400 },
      );
    }

    const pincodeIsValid = await verifyPincodeMatch({
      pincode,
      district,
      villageCity,
      state,
    });

    if (!pincodeIsValid) {
      return NextResponse.json(
        { success: false, message: "PIN code does not match the provided district, village/city, or state.", errors: { pincode: "PIN code does not match the provided address details." } },
        { status: 400 },
      );
    }

    const { data: existingEmail } = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 },
      );
    }

    const { data: existingAadhar } = await getUserByAadhar(body.aadhar_number);
    if (existingAadhar) {
      return NextResponse.json(
        { success: false, message: "Aadhar number already registered" },
        { status: 409 },
      );
    }

    const { data: existingPan } = await getUserByPan(pan);
    if (existingPan) {
      return NextResponse.json(
        { success: false, message: "PAN number already registered" },
        { status: 409 },
      );
    }

    const { data: existingEhrms } = await getUserByEhrmsCode(ehrmsCode);
    if (existingEhrms) {
      return NextResponse.json(
        { success: false, message: "EHRMS code already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const { data, error } = await createUser({
      email,
      password_hash: passwordHash,
      name: body.name.trim(),
      aadhar_number: body.aadhar_number,
      pan_number: pan,
      date_of_birth: body.date_of_birth || null,
      membership_expiry_date: calculateMembershipExpiryDate(body.date_of_birth) || null,
      ehrms_code: ehrmsCode,
      role_number: body.role_number?.trim() || null,
      gender: body.gender.trim(),
      father_husband_name: body.father_husband_name.trim(),
      department_id: body.department_id,
      post_id: body.post_id,
      nominee_name: body.nominee_name.trim(),
      nominee_relationship: body.nominee_relationship.trim(),
      nominee_mobile_number: body.nominee_mobile_number.trim(),
      nominee_aadhar_number: body.nominee_aadhar_number.trim(),
      reference_name: body.reference_name?.trim() || null,
      bank_account_number: body.bank_account_number || "",
      bank_ifsc_code: ifsc || "",
      bank_holder_name: body.bank_holder_name.trim() || "",
      phone_number: body.phone_number.trim(),
      blood_group: body.blood_group.trim(),
      house_flat_no: houseFlatNo,
      street_locality: streetLocality,
      landmark: landmark || null,
      village_city: villageCity,
      district,
      state,
      pincode,
      country,
      permanent_same_as_current: body.permanent_same_as_current ?? false,
      permanent_house_flat_no: body.permanent_same_as_current ? houseFlatNo : (body.permanent_house_flat_no ?? "").trim(),
      permanent_street_locality: body.permanent_same_as_current ? streetLocality : (body.permanent_street_locality ?? "").trim(),
      permanent_landmark: body.permanent_same_as_current ? (landmark || null) : (body.permanent_landmark ?? "").trim() || null,
      permanent_village_city: body.permanent_same_as_current ? villageCity : (body.permanent_village_city ?? "").trim(),
      permanent_district: body.permanent_same_as_current ? district : (body.permanent_district ?? "").trim(),
      permanent_state: body.permanent_same_as_current ? state : (body.permanent_state ?? "").trim(),
      permanent_pincode: body.permanent_same_as_current ? pincode : (body.permanent_pincode ?? "").trim(),
      permanent_country: body.permanent_same_as_current ? country : (body.permanent_country ?? "India").trim() || "India",
      status: "pending",
    });

    if (error || !data) {
      console.error("Signup insert failed:", error);
      return NextResponse.json(
        { success: false, message: getFriendlySignupError(error) },
        { status: 500 },
      );
    }

    // Registration approvals are handled only by the Super Admin. No district-level approval notifications are created.

    return NextResponse.json({
      success: true,
      message: "Registration successful. Waiting for admin approval.",
      user: { id: data.id, email: data.email, status: data.status },
    });
  } catch (error) {
    console.error("Signup route error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
