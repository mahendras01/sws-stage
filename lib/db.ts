import { supabase } from "./supabase";
import type { Death, Contribution, User } from "./types";

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();
  return { data: data as User | null, error };
}

export async function listDistricts() {
  const { data, error } = await supabase.from("districts").select("id, district_name, state_name").order("district_name", { ascending: true });
  return { data: data as Array<{ id: string; district_name: string; state_name: string | null }> | null, error };
}

export async function getDistrictByName(districtName: string) {
  const normalizedName = districtName?.trim();

  if (!normalizedName) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("districts")
    .select("id, district_name, state_name")
    .ilike("district_name", normalizedName)
    .maybeSingle();

  return { data: data as { id: string; district_name: string; state_name: string | null } | null, error };
}

export async function getDistrictById(districtId: string) {
  const { data, error } = await supabase.from("districts").select("id, district_name, state_name").eq("id", districtId).maybeSingle();
  return { data: data as { id: string; district_name: string; state_name: string | null } | null, error };
}

export async function upsertDistrict(districtName: string, stateName = "Uttar Pradesh") {
  const normalizedName = districtName?.trim();

  if (!normalizedName) {
    return { data: null, error: new Error("District name is required") };
  }

  const { data: existing, error: existingError } = await getDistrictByName(normalizedName);

  if (existingError && existingError.code !== "PGRST116") {
    return { data: null, error: existingError };
  }

  if (existing) {
    return { data: existing, error: null };
  }

  const { data, error } = await supabase
    .from("districts")
    .insert({ district_name: normalizedName, state_name: stateName, is_active: true })
    .select("id, district_name, state_name")
    .single();

  return { data: data as { id: string; district_name: string; state_name: string | null } | null, error };
}

export async function getUserByAadhar(aadhar: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("aadhar_number", aadhar)
    .single();
  return { data, error };
}

export async function getUserByPan(pan: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("pan_number", pan.toUpperCase())
    .single();
  return { data, error };
}

export async function getUserByEhrmsCode(ehrmsCode: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("ehrms_code", ehrmsCode.trim().toUpperCase())
    .maybeSingle();
  return { data, error };
}

export async function getDepartments() {
  const { data, error } = await supabase.from("departments").select("id, name").order("name", { ascending: true });
  return { data: data as Array<{ id: string; name: string }> | null, error };
}

export async function getPosts() {
  const { data, error } = await supabase.from("posts").select("id, department_id, name").order("name", { ascending: true });
  return { data: data as Array<{ id: string; department_id: string; name: string }> | null, error };
}

export async function getDepartmentById(departmentId: string) {
  const { data, error } = await supabase.from("departments").select("id, name").eq("id", departmentId).maybeSingle();
  return { data: data as { id: string; name: string } | null, error };
}

export async function getPostById(postId: string) {
  const { data, error } = await supabase.from("posts").select("id, department_id, name").eq("id", postId).maybeSingle();
  return { data: data as { id: string; department_id: string; name: string } | null, error };
}

export async function createUser(userData: Record<string, unknown>) {
  const { data, error } = await supabase.from("users").insert(userData).select("id, email, status").single();
  return { data, error };
}

function applyDistrictFilter(query: any, adminRole?: string | null, adminDistrict?: string | null) {
  if (adminRole === "district_admin" || adminRole === "district_co_admin") {
    if (adminDistrict) {
      return query.eq("district", adminDistrict);
    }
    return query.eq("district", "__none__");
  }

  return query;
}

export async function getPendingUsersForAdmin(adminRole?: string | null, adminDistrict?: string | null) {
  let query = supabase
    .from("users")
    .select(
      "id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, status, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  query = applyDistrictFilter(query, adminRole, adminDistrict);

  const { data, error } = await query;
  return { data: data as Partial<User>[] | null, error };
}

export async function getPendingUsersCount() {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return { count: count ?? 0, error };
}

export async function createApprovalHistory(historyData: Record<string, unknown>) {
  const { data, error } = await supabase.from("approval_history").insert(historyData).select().single();
  return { data, error };
}

export async function updateUserStatus(
  userId: string,
  status: "approved" | "rejected",
  rejectedReason?: string,
) {
  const updateData: Record<string, unknown> = { status };
  if (status === "rejected" && rejectedReason) {
    updateData.rejected_reason = rejectedReason;
  }
  // Perform conditional update to ensure we only change users that are still pending.
  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .eq("status", "pending")
    .select()
    .single();
  return { data, error };
}

export async function getDistrictAdminIds(district: string) {
  const { data, error } = await supabase
    .from("district_admin_mapping")
    .select("admin_user_id, mapping_role")
    .eq("district", district);
  return { data: data as Array<{ admin_user_id: string }> | null, error };
}

export async function getDistrictAdminMappings() {
  const { data, error } = await supabase.from("district_admin_mapping").select("id, admin_user_id, district, mapping_role, created_at").order("district");
  return { data, error };
}

export async function assignDistrictAdmin(adminUserId: string, district: string, mappingRole: string) {
  // Remove existing mapping for this district+role then insert the new mapping
  const { error: delErr } = await supabase.from("district_admin_mapping").delete().eq("district", district).eq("mapping_role", mappingRole);
  if (delErr) return { data: null, error: delErr };

  const { data, error } = await supabase.from("district_admin_mapping").insert({ admin_user_id: adminUserId, district, mapping_role: mappingRole }).select().single();
  return { data, error };
}

export async function listAdmins() {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, district, district_id, is_admin, is_active, created_at, updated_at, ehrms_code")
    .eq("is_admin", true)
    .in("role", ["super_admin", "country_co_admin", "district_admin", "district_co_admin"])
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function getAdminById(adminId: string) {
  const { data, error } = await supabase.from("users").select("*").eq("id", adminId).single();
  return { data, error };
}

export async function createOrUpdateAdmin(adminData: Record<string, unknown>) {
  const normalizedAdminData = { ...adminData };
  const rawId = typeof normalizedAdminData.id === "string" ? normalizedAdminData.id.trim() : "";

  if (!rawId) {
    delete normalizedAdminData.id;
  }

  // If id present, update otherwise insert
  if (rawId) {
    const { data, error } = await supabase.from("users").update(normalizedAdminData).eq("id", rawId).select().single();
    return { data, error };
  }

  const { data, error } = await supabase.from("users").insert(normalizedAdminData).select().single();
  return { data, error };
}

export async function logAdminAssignment(audit: Record<string, unknown>) {
  const payload = { ...audit } as Record<string, unknown>;

  if (payload.assigned_by && !payload.acted_by) {
    payload.acted_by = payload.assigned_by;
  }

  delete payload.assigned_by;

  if (!payload.action) {
    payload.action = "assign";
  }

  if (!payload.admin_user_id) {
    return { data: null, error: new Error("admin_user_id is required for admin assignment audit") };
  }

  const { data, error } = await supabase.from("admin_assignment_audit").insert(payload).select().single();
  return { data, error };
}

export async function getCountryAdminIds() {
  const { data, error } = await supabase.from("users").select("id").eq("is_admin", true);
  return { data: data as Array<{ id: string }> | null, error };
}

export async function createNotification(notificationData: Record<string, unknown>) {
  const { data, error } = await supabase.from("notifications").insert(notificationData).select().single();
  return { data, error };
}

export async function createNotificationsBatch(notifications: Record<string, unknown>[]) {
  if (!notifications || notifications.length === 0) return { data: null, error: null };
  const { data, error } = await supabase.from("notifications").insert(notifications).select();
  return { data, error };
}

export async function resolveNotificationsForRegistration(registrationUserId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "resolved", read_at: new Date().toISOString() })
    .eq("registration_user_id", registrationUserId);
  return { data, error };
}

export async function getApprovedUsers(adminRole?: string | null, adminDistrict?: string | null, selectedDistrict?: string | null) {
  let query = supabase
    .from("users")
    .select(
      "id, name, email, phone_number, house_flat_no, street_locality, village_city, district, state, pincode, date_of_birth",
    )
    .eq("status", "approved")
    .order("name");

  if (selectedDistrict && selectedDistrict.trim() !== "") {
    query = query.eq("district", selectedDistrict.trim());
  } else {
    query = applyDistrictFilter(query, adminRole, adminDistrict);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function getAdminDashboardStats(adminRole?: string | null, adminDistrict?: string | null) {
  const isDistrictAdmin = adminRole === "district_admin" || adminRole === "district_co_admin";

  const usersCountQuery = applyDistrictFilter(
    supabase.from("users").select("id", { count: "exact", head: true }),
    adminRole,
    adminDistrict,
  );
  const pendingCountQuery = applyDistrictFilter(
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "pending"),
    adminRole,
    adminDistrict,
  );
  const approvedCountQuery = applyDistrictFilter(
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "approved"),
    adminRole,
    adminDistrict,
  );
  const rejectedCountQuery = applyDistrictFilter(
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    adminRole,
    adminDistrict,
  );

  const [usersCountRes, pendingCountRes, approvedCountRes, rejectedCountRes, deathsRes, contributionsRes] = await Promise.all([
    usersCountQuery,
    pendingCountQuery,
    approvedCountQuery,
    rejectedCountQuery,
    supabase.from("deaths").select("id, member_id").order("created_at", { ascending: false }),
    supabase.from("contributions").select("id, contributor_id").order("created_at", { ascending: false }),
  ]);

  if (usersCountRes.error || pendingCountRes.error || approvedCountRes.error || rejectedCountRes.error || deathsRes.error || contributionsRes.error) {
    return {
      data: null,
      error: usersCountRes.error || pendingCountRes.error || approvedCountRes.error || rejectedCountRes.error || deathsRes.error || contributionsRes.error,
    };
  }

  let deathCount = deathsRes.data?.length ?? 0;
  let contributionCount = contributionsRes.data?.length ?? 0;

  if (isDistrictAdmin && adminDistrict) {
    const memberIds = (deathsRes.data ?? [])
      .map((death: { member_id: string | null }) => death.member_id)
      .filter((memberId): memberId is string => Boolean(memberId));
    const contributorIds = (contributionsRes.data ?? [])
      .map((contribution: { contributor_id: string | null }) => contribution.contributor_id)
      .filter((contributorId): contributorId is string => Boolean(contributorId));

    if (memberIds.length > 0) {
      const { data: districtMembers } = await supabase.from("users").select("id").in("id", memberIds).eq("district", adminDistrict);
      const allowedMemberIds = new Set((districtMembers ?? []).map((member: { id: string }) => member.id));
      deathCount = (deathsRes.data ?? []).filter((death: { member_id: string | null }) => death.member_id && allowedMemberIds.has(death.member_id)).length;
    }

    if (contributorIds.length > 0) {
      const { data: districtContributors } = await supabase.from("users").select("id").in("id", contributorIds).eq("district", adminDistrict);
      const allowedContributorIds = new Set((districtContributors ?? []).map((contributor: { id: string }) => contributor.id));
      contributionCount = (contributionsRes.data ?? []).filter((contribution: { contributor_id: string | null }) => contribution.contributor_id && allowedContributorIds.has(contribution.contributor_id)).length;
    }
  }

  return {
    data: {
      totalUsers: usersCountRes.count ?? 0,
      pendingUsers: pendingCountRes.count ?? 0,
      approvedUsers: approvedCountRes.count ?? 0,
      rejectedUsers: rejectedCountRes.count ?? 0,
      deaths: deathCount,
      contributions: contributionCount,
      isDistrictAdmin,
      district: adminDistrict,
    },
    error: null,
  };
}

export async function createDeath(deathData: Record<string, unknown>) {
  const { data, error } = await supabase.from("deaths").insert(deathData).select("id").single();
  return { data, error };
}

export async function getAllDeaths(status?: "active" | "closed") {
  let query = supabase
    .from("deaths")
    .select("id, member_name, death_date, age, cause_of_death, family_info, amount_raised, status, created_at")
    .order("death_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  return { data: data as Death[] | null, error };
}

export async function getDeathById(deathId: string) {
  const { data, error } = await supabase.from("deaths").select("*").eq("id", deathId).single();
  return { data: data as Death | null, error };
}

export async function getContributionsByDeathId(deathId: string) {
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("death_id", deathId)
    .order("contribution_date", { ascending: false });
  return { data: data as Contribution[] | null, error };
}

export async function updateDeathStatus(deathId: string, status: "active" | "closed") {
  const { data, error } = await supabase
    .from("deaths")
    .update({ status })
    .eq("id", deathId)
    .select()
    .single();
  return { data, error };
}

export async function createContribution(contributionData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("contributions")
    .insert(contributionData)
    .select()
    .single();
  return { data, error };
}

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, status, district")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function getUserProfileById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, role, status, is_admin, created_at, updated_at",
    )
    .eq("id", userId)
    .single();
  return { data: data as Partial<User> | null, error };
}

export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select(
      "id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, role, status, is_admin, created_at, updated_at",
    )
    .single();
  return { data: data as Partial<User> | null, error };
}

export async function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  return { data, error };
}

export async function getPasswordResetTokenByHash(tokenHash: string) {
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  return { data, error };
}

export async function invalidatePasswordResetTokensForUser(userId: string, usedAt: Date) {
  const { error } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: usedAt.toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  return { error };
}

export async function markPasswordResetTokenUsed(tokenId: string, usedAt: Date) {
  const { error } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: usedAt.toISOString() })
    .eq("id", tokenId);

  return { error };
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", userId);
  return { error };
}

// Receipts
export async function getReceiptByTransactionNumber(transactionNumber: string) {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("transaction_number", transactionNumber)
    .maybeSingle();
  return { data, error };
}

export async function createReceipt(receiptData: Record<string, unknown>) {
  const { data, error } = await supabase.from("receipts").insert(receiptData).select().single();
  return { data, error };
}

export async function getReceiptsByUser(userId: string) {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function getReceiptById(receiptId: string) {
  const { data, error } = await supabase.from("receipts").select("*").eq("id", receiptId).maybeSingle();
  return { data, error };
}
