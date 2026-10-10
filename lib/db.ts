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

export async function ensureRequiredRegistrationMasterData() {
  const departmentName = "Panchayati Raj Vibhag";
  const postName = "Safai Karamchari";

  const { data: department, error: departmentError } = await supabase
    .from("departments")
    .upsert({ name: departmentName }, { onConflict: "name" })
    .select("id, name")
    .maybeSingle();

  if (departmentError) {
    return { department: null, post: null, error: departmentError };
  }

  if (!department?.id) {
    return { department: null, post: null, error: new Error("Panchayati Raj Vibhag department could not be created.") };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .upsert({ department_id: department.id, name: postName }, { onConflict: "department_id,name" })
    .select("id, department_id, name")
    .maybeSingle();

  return { department, post, error: postError };
}

export async function createUser(userData: Record<string, unknown>) {
  const { data, error } = await supabase.from("users").insert(userData).select("id, email, status").single();
  return { data, error };
}

function applyDistrictFilter(query: any, adminRole?: string | null, adminDistrict?: string | null) {
  // New registration approvals are handled only by the Super Admin.
  // District-scoped approval is intentionally no longer used.
  return query;
}

export async function getPendingUsersForAdmin(adminRole?: string | null, adminDistrict?: string | null) {
  let query = supabase
    .from("users")
    .select(
      "id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, role_number, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, nominee_aadhar_number, reference_name, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, status, created_at",
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

export async function getApprovedUsers(adminRole?: string | null, adminDistrict?: string | null, selectedDistrict?: string | null, selectedBlock?: string | null) {
  const normalizedDistrict = selectedDistrict?.trim();
  const normalizedBlock = selectedBlock?.trim();

  let query = supabase
    .from("users")
    .select(
      "id, serial_number, ehrms_code, name, role_number, email, phone_number, house_flat_no, street_locality, village_city, district, state, pincode, date_of_birth",
    )
    .eq("status", "approved")
    .order("serial_number", { ascending: true });

  if (normalizedDistrict && normalizedDistrict !== "") {
    query = query.eq("district", normalizedDistrict);
  } else {
    query = applyDistrictFilter(query, adminRole, adminDistrict);
  }

  if (normalizedBlock && normalizedBlock !== "All") {
    query = query.ilike("village_city", `%${normalizedBlock}%`);
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
      .map((death: { member_id?: string | null }) => death.member_id)
      .filter((memberId: string | null): memberId is string => Boolean(memberId));
    const contributorIds = (contributionsRes.data ?? [])
      .map((contribution: { contributor_id?: string | null }) => contribution.contributor_id)
      .filter((contributorId: string | null): contributorId is string => Boolean(contributorId));

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

export async function getPublicLabharthiRecords(page = 1, pageSize = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const from = (safePage - 1) * safePageSize;

  const listQuery = supabase
    .from("deaths")
    .select("id, member_id, member_name, status, created_at")
    .order("created_at", { ascending: false })
    .range(from, from + safePageSize - 1);

  const countQuery = supabase.from("deaths").select("id", { count: "exact", head: true });

  const [listResult, countResult] = await Promise.all([listQuery, countQuery]);

  if (listResult.error || countResult.error) {
    return {
      data: [],
      totalCount: 0,
      totalPages: 0,
      error: listResult.error || countResult.error,
    };
  }

  const deathRows = (listResult.data ?? []) as Array<{ id: string; member_id?: string | null; member_name?: string | null; status?: string | null }>;
  const deathIds = deathRows.map((death: { id: string }) => death.id).filter(Boolean);
  const memberIds = Array.from(
    new Set(
      deathRows
        .map((death: { member_id?: string | null }) => death.member_id)
        .filter((memberId: string | null | undefined): memberId is string => Boolean(memberId)),
    ),
  );

  const [usersResult, contributionsResult] = await Promise.all([
    memberIds.length > 0 ? supabase.from("users").select("id, name, serial_number, ehrms_code, role_number, district, village_city").in("id", memberIds) : Promise.resolve({ data: [], error: null }),
    deathIds.length > 0 ? supabase.from("contributions").select("death_id, contributor_name, created_at").in("death_id", deathIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);

  if (usersResult.error || contributionsResult.error) {
    return {
      data: [],
      totalCount: countResult.count ?? 0,
      totalPages: Math.max(1, Math.ceil((countResult.count ?? 0) / safePageSize)),
      error: usersResult.error || contributionsResult.error,
    };
  }

  const userMap = new Map(
    ((usersResult.data ?? []) as Array<{ id: string; serial_number?: string | null; ehrms_code?: string | null; role_number?: string | null; district?: string | null; village_city?: string | null; name?: string | null }>).map((user) => [user.id, user]),
  );
  const latestContributorByDeath = new Map<string, string>();

  ((contributionsResult.data ?? []) as Array<{ death_id?: string | null; contributor_name?: string | null }>).forEach((entry) => {
    const deathId = entry.death_id as string | undefined;
    if (!deathId || latestContributorByDeath.has(deathId)) return;
    latestContributorByDeath.set(deathId, (entry.contributor_name as string | undefined) || "-");
  });

  const records = deathRows.map((death) => {
    const user = death.member_id ? (userMap.get(death.member_id) as { serial_number?: string | null; ehrms_code?: string | null; role_number?: string | null; district?: string | null; village_city?: string | null; name?: string | null } | undefined) : null;
    return {
      id: death.id,
      serial_number: user?.serial_number ?? null,
      ehrms_code: user?.ehrms_code ?? null,
      labharthi_name: death.member_name || user?.name || "-",
      role_number: user?.role_number ?? null,
      amount_sender_name: latestContributorByDeath.get(death.id) ?? "-",
      district: user?.district ?? null,
      village_city: user?.village_city ?? null,
      status: death.status,
    };
  });

  return {
    data: records,
    totalCount: countResult.count ?? 0,
    totalPages: Math.max(1, Math.ceil((countResult.count ?? 0) / safePageSize)),
    error: null,
  };
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
    .select("id, name, email, status, district, phone_number, ehrms_code, role_number, aadhar_number, pan_number, nominee_aadhar_number, bank_account_number, bank_ifsc_code, bank_holder_name, house_flat_no, street_locality, landmark, village_city, state, pincode, country")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function getUserProfileById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, role_number, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, nominee_aadhar_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, role, status, is_admin, created_at, updated_at",
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
      "id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, role_number, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, nominee_aadhar_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, role, status, is_admin, created_at, updated_at",
    )
    .single();
  return { data: data as Partial<User> | null, error };
}

export async function invalidatePasswordResetTokensForUser(userId: string, usedAt: Date) {
  const { error } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: usedAt.toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  return { error };
}
export async function getSahyogList(opts?: { q?: string; page?: number; pageSize?: number; sahyogType?: string }) {
  const q = opts?.q?.trim() ?? "";
  const requestedType = opts?.sahyogType?.trim() ?? "";
  const normalizedType = requestedType ? requestedType.toLowerCase() : "";
  const page = opts?.page && opts.page > 0 ? opts.page : 1;
  const pageSize = opts?.pageSize && opts.pageSize > 0 ? Math.min(opts.pageSize, 100) : 20;

  try {
    let userIds: string[] | null = null;
    if (q !== "") {
      const orExpr = `name.ilike.%${q}%,ehrms_code.ilike.%${q}%,phone_number.ilike.%${q}%`;
      const { data: usersFound } = await supabase.from("users").select("id").or(orExpr).limit(2000);
      userIds = (usersFound ?? []).map((u: any) => u.id).filter(Boolean);
      if (userIds !== null && userIds.length === 0) {
        return { data: [], count: 0 };
      }
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase.from("receipts").select("*", { count: "exact" }).order("created_at", { ascending: false });

    if (normalizedType) {
      query = query.ilike("sahyog_type", normalizedType);
    }

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: receipts, count, error } = await query.range(start, end);
    if (error) return { data: null, count: 0, error };

    const rows = receipts ?? [];
    if (rows.length === 0) {
      return { data: [], count: count ?? 0 };
    }

    const userIdsInRows = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));

    const usersMap: Record<string, any> = {};
    if (userIdsInRows.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id,name,ehrms_code,phone_number,department_id,block,district,village_city")
        .in("id", userIdsInRows);
      (users ?? []).forEach((u: any) => (usersMap[u.id] = u));
    }

    const deptIds = Array.from(new Set(Object.values(usersMap).map((u: any) => u.department_id).filter(Boolean)));
    const deptMap: Record<string, any> = {};
    if (deptIds.length > 0) {
      const { data: depts } = await supabase.from("departments").select("id,name").in("id", deptIds);
      (depts ?? []).forEach((d: any) => (deptMap[d.id] = d));
    }

    const latestContributionByUser: Record<string, any> = {};
    if (userIdsInRows.length > 0) {
      const { data: contributions } = await supabase
        .from("contributions")
        .select("id, contributor_id, death_id, contribution_date, created_at")
        .in("contributor_id", userIdsInRows)
        .order("contribution_date", { ascending: false });

      for (const contribution of contributions ?? []) {
        const key = contribution.contributor_id;
        const contributionDate = contribution.contribution_date ?? contribution.created_at;
        if (!key) continue;
        if (!latestContributionByUser[key] || new Date(contributionDate) > new Date(latestContributionByUser[key].contribution_date ?? latestContributionByUser[key].created_at)) {
          latestContributionByUser[key] = contribution;
        }
      }
    }

    const deathIds = Array.from(new Set(Object.values(latestContributionByUser).map((c: any) => c.death_id).filter(Boolean)));
    const deathsMap: Record<string, any> = {};
    if (deathIds.length > 0) {
      const { data: deaths } = await supabase.from("deaths").select("id,member_name").in("id", deathIds);
      (deaths ?? []).forEach((d: any) => (deathsMap[d.id] = d));
    }

    const items = rows.map((receipt: any) => {
      const user = usersMap[receipt.user_id] ?? null;
      const dept = user && user.department_id ? deptMap[user.department_id] : null;
      const latestContribution = latestContributionByUser[receipt.user_id] ?? null;
      const lateUserName = latestContribution?.death_id ? deathsMap[latestContribution.death_id]?.member_name ?? null : null;
      const contributionDate = latestContribution?.contribution_date ?? latestContribution?.created_at ?? receipt.created_at ?? receipt.updated_at;

      return {
        id: receipt.id,
        ehrms_code: user?.ehrms_code ?? null,
        user_name: user?.name ?? null,
        department: dept?.name ?? null,
        block: user?.block ?? user?.village_city ?? null,
        district: user?.district ?? null,
        late_user_name: lateUserName,
        date: contributionDate,
      };
    });

    return { data: items, count: count ?? 0 };
  } catch (err) {
    return { data: null, count: 0, error: err };
  }
}

export async function createReceipt(receiptData: Record<string, unknown>) {
  const { data, error } = await supabase.from("receipts").insert(receiptData).select().single();
  return { data, error };
}

export async function getReceiptByTransactionNumber(transactionNumber: string) {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("transaction_number", transactionNumber.trim())
    .maybeSingle();
  return { data, error };
}

export async function getReceiptById(receiptId: string) {
  const { data, error } = await supabase.from("receipts").select("*").eq("id", receiptId).single();
  return { data, error };
}

export async function updateReceipt(receiptId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("receipts").update(updates).eq("id", receiptId).select().single();
  return { data, error };
}

export async function deleteReceipt(receiptId: string) {
  const { error } = await supabase.from("receipts").delete().eq("id", receiptId);
  return { error };
}

export async function getReceiptsByUser(userId: string) {
  const { data, error } = await supabase.from("receipts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return { data: data as any[] | null, error };
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}
