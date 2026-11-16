import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getDepartments, getPosts, getUserByEmail, getUserById, getUserByPhoneNumber, getUserPendingNomineeRequest, getUserProfileById, updateUserProfile } from "@/lib/db";
import { getRequestMeta, log, summarizeUser } from "@/lib/logger";
import { validateProfileUpdatePayload } from "@/lib/profile-validation";

const READ_ONLY_FIELDS = ["name", "aadhar_number", "pan_number", "date_of_birth", "ehrms_code", "role_number"];
const EDITABLE_FIELDS = [
  "email",
  "gender",
  "father_husband_name",
  "department_id",
  "post_id",
  "nominee_name",
  "nominee_relationship",
  "nominee_mobile_number",
  "nominee_aadhar_number",
  "nominee2_relationship",
  "nominee2_mobile_number",
  "phone_home",
  "blood_group",
  "office_name",
  "sub_post",
  "block",
  "disease",
  "cause_of_illness",
  "phone_number",
  "bank_account_number",
  "bank_ifsc_code",
  "bank_holder_name",
  "house_flat_no",
  "street_locality",
  "landmark",
  "village_city",
  "district",
  "state",
  "pincode",
  "country",
] as const;

const NOMINEE_EDIT_FIELDS = [
  "nominee_name",
  "nominee_relationship",
  "nominee_mobile_number",
  "nominee_aadhar_number",
  "nominee2_relationship",
  "nominee2_mobile_number",
] as const;

const NOMINEE_REQUEST_ALLOWED_STATUSES = new Set(["none", "approved", "rejected"]);

function getSafeProfilePayload(body: Record<string, unknown>) {
  const safeUpdate: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const rawValue = body[field];
      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      const value = typeof rawValue === "string" ? rawValue.trim() : String(rawValue).trim();
      if (field === "email") {
        safeUpdate[field] = value.toLowerCase();
        continue;
      }

      if (field === "phone_number") {
        safeUpdate[field] = value.replace(/\s+/g, "");
        continue;
      }

      if (field === "bank_ifsc_code") {
        safeUpdate[field] = value.toUpperCase();
        continue;
      }

      if (field === "blood_group" && value) {
        safeUpdate[field] = value.toUpperCase();
        continue;
      }

      if (field === "country" && !value) {
        safeUpdate[field] = "India";
        continue;
      }

      safeUpdate[field] = value;
    }
  }

  return safeUpdate;
}

async function validateDepartmentPostSelection(departmentId: string, postId: string) {
  if (!departmentId || !postId) {
    return { valid: true, message: null };
  }

  const [departmentsResult, postsResult] = await Promise.all([getDepartments(), getPosts()]);

  if (departmentsResult.error || postsResult.error) {
    return { valid: false, message: "Department or post details could not be validated." };
  }

  const targetPost = (postsResult.data ?? []).find((post) => post.id === postId);

  if (!targetPost) {
    return { valid: false, message: "Selected post is not valid." };
  }

  if (targetPost.department_id !== departmentId) {
    return { valid: false, message: "Selected post does not belong to the selected department." };
  }

  return { valid: true, message: null };
}

function validateUpdates(updates: Record<string, unknown>) {
  return validateProfileUpdatePayload(updates);
}

export async function GET(request: NextRequest) {
  const meta = getRequestMeta(request);
  const sessionResult = await getSession();
  const session = sessionResult?.user ? sessionResult : null;

  if (!session?.user?.id) {
    log.warn("profile.get.unauthorized", meta);
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const [{ data, error }, pendingRequest] = await Promise.all([
    getUserProfileById(session.user.id),
    getUserPendingNomineeRequest(session.user.id),
  ]);

  if (error || !data) {
    log.error("profile.get.failed", { ...meta, userId: session.user.id, email: session.user.email, error });
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const nomineeRequestStatus = pendingRequest?.data?.status ?? "none";
  log.info("profile.get.success", { ...meta, user: summarizeUser(data), nomineeRequestStatus });

  return NextResponse.json({
    success: true,
    user: {
      ...data,
      email: data.email ?? "",
      name: data.name ?? "",
      aadhar_number: data.aadhar_number ?? "",
      pan_number: data.pan_number ?? "",
      date_of_birth: data.date_of_birth ?? "",
      ehrms_code: data.ehrms_code ?? "",
      role_number: data.role_number ?? "",
      gender: data.gender ?? "",
      father_husband_name: data.father_husband_name ?? "",
      department_id: data.department_id ?? "",
      post_id: data.post_id ?? "",
      nominee_name: data.nominee_name ?? "",
      nominee_relationship: data.nominee_relationship ?? "",
      nominee_mobile_number: data.nominee_mobile_number ?? "",
      nominee_aadhar_number: data.nominee_aadhar_number ?? "",
      nominee2_relationship: data.nominee2_relationship ?? "",
      nominee2_mobile_number: data.nominee2_mobile_number ?? "",
      nominee_edit_allowed: Boolean(data.nominee_edit_allowed),
      nominee_request_status: nomineeRequestStatus,
      pending_nominee_request: pendingRequest?.data ?? null,
      phone_home: data.phone_home ?? "",
      blood_group: data.blood_group ?? "",
      office_name: data.office_name ?? "",
      sub_post: data.sub_post ?? "",
      block: data.block ?? "",
      disease: data.disease ?? "",
      cause_of_illness: data.cause_of_illness ?? "",
    },
  });
}

export async function PATCH(request: NextRequest) {
  const meta = getRequestMeta(request);
  const sessionResult = await getSession();
  const session = sessionResult?.user ? sessionResult : null;

  if (!session?.user?.id) {
    log.warn("profile.update.unauthorized", meta);
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const actor = { userId: session.user.id, email: session.user.email, name: session.user.name };

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    log.warn("profile.update.rejected", { ...meta, user: actor, reason: "invalid_body" });
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const updates = getSafeProfilePayload(body);
  if (Object.keys(updates).length === 0) {
    log.warn("profile.update.rejected", { ...meta, user: actor, reason: "no_valid_fields" });
    return NextResponse.json({ success: false, message: "No valid profile fields were provided for update" }, { status: 400 });
  }

  const updateSummary = { ...meta, user: { ...summarizeUser(updates), ...actor }, updatedFields: Object.keys(updates) };
  log.info("profile.update.received", updateSummary);

  for (const field of READ_ONLY_FIELDS) {
    if (field in body) {
      delete body[field];
    }
  }

  const nomineeFieldsUpdated = NOMINEE_EDIT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(updates, field));
  if (nomineeFieldsUpdated) {
    log.info("profile.update.nominee.direct_edit", { ...updateSummary, userId: session.user.id, fields: Object.keys(updates).filter((field) => NOMINEE_EDIT_FIELDS.includes(field as (typeof NOMINEE_EDIT_FIELDS)[number])) });
  }

  const validationErrors = validateUpdates(updates);
  if (Object.keys(validationErrors).length > 0) {
    log.warn("profile.update.validation_failed", { ...updateSummary, errors: validationErrors });
    return NextResponse.json({ success: false, message: "Validation failed", errors: validationErrors }, { status: 400 });
  }

  const email = typeof updates.email === "string" ? updates.email.toLowerCase().trim() : "";
  const phoneNumber = typeof updates.phone_number === "string" ? updates.phone_number.replace(/\s+/g, "") : "";

  if (email) {
    const { data: existingEmail } = await getUserByEmail(email);
    if (existingEmail && existingEmail.id !== session.user.id) {
      log.warn("profile.update.rejected", { ...meta, user: actor, reason: "duplicate_email", existingUserId: existingEmail.id });
      return NextResponse.json({ success: false, message: "This email address is already registered to another user." }, { status: 409 });
    }
  }

  if (phoneNumber) {
    const { data: existingPhone } = await getUserByPhoneNumber(phoneNumber);
    if (existingPhone && existingPhone.id !== session.user.id) {
      log.warn("profile.update.rejected", { ...meta, user: actor, reason: "duplicate_phone_number", existingUserId: existingPhone.id });
      return NextResponse.json({ success: false, message: "This mobile number is already registered to another user." }, { status: 409 });
    }
  }

  if (updates.department_id && updates.post_id) {
    const departmentPostValidation = await validateDepartmentPostSelection(String(updates.department_id), String(updates.post_id));
    if (!departmentPostValidation.valid) {
      log.warn("profile.update.rejected", { ...updateSummary, reason: "invalid_department_post", detail: departmentPostValidation.message });
      return NextResponse.json({ success: false, message: departmentPostValidation.message || "Invalid department/post selection." }, { status: 400 });
    }
  }

  const { data, error } = await updateUserProfile(session.user.id, updates);
  if (error || !data) {
    log.error("profile.update.failed", { ...updateSummary, error });
    return NextResponse.json({ success: false, message: "Unable to update profile" }, { status: 500 });
  }

  log.info("profile.update.success", { ...updateSummary, user: { ...summarizeUser(data), ...actor } });

  return NextResponse.json({
    success: true,
    message: "Profile updated successfully.",
    user: {
      ...data,
      email: data.email ?? "",
      name: data.name ?? "",
      aadhar_number: data.aadhar_number ?? "",
      pan_number: data.pan_number ?? "",
      date_of_birth: data.date_of_birth ?? "",
      ehrms_code: data.ehrms_code ?? "",
      role_number: data.role_number ?? "",
      gender: data.gender ?? "",
      father_husband_name: data.father_husband_name ?? "",
      department_id: data.department_id ?? "",
      post_id: data.post_id ?? "",
      nominee_name: data.nominee_name ?? "",
      nominee_relationship: data.nominee_relationship ?? "",
      nominee_mobile_number: data.nominee_mobile_number ?? "",
      nominee_aadhar_number: data.nominee_aadhar_number ?? "",
      nominee2_relationship: data.nominee2_relationship ?? "",
      nominee2_mobile_number: data.nominee2_mobile_number ?? "",
      nominee_edit_allowed: Boolean(data.nominee_edit_allowed),
      phone_home: data.phone_home ?? "",
      blood_group: data.blood_group ?? "",
      office_name: data.office_name ?? "",
      sub_post: data.sub_post ?? "",
      block: data.block ?? "",
      disease: data.disease ?? "",
      cause_of_illness: data.cause_of_illness ?? "",
    },
  });
}
