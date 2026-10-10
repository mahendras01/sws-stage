import { pool, queryRows, toDbError, withTransaction, type DbClient } from "./postgres";
import type { Death, Contribution, User } from "./types";

type DbError = { message: string; code: string };

function missingSingleRowError(entity: string): DbError {
  return { message: `${entity} not found`, code: "PGRST116" };
}

function buildInsert(tableName: string, payload: Record<string, unknown>) {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new Error(`Cannot insert into ${tableName} with an empty payload`);
  }

  const columns = keys.map((key) => `"${key}"`).join(", ");
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
  const values = keys.map((key) => payload[key]);

  return { columns, placeholders, values };
}

function buildUpdate(payload: Record<string, unknown>, startIndex = 1) {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new Error("Cannot update with an empty payload");
  }

  const setClause = keys.map((key, index) => `"${key}" = $${startIndex + index}`).join(", ");
  const values = keys.map((key) => payload[key]);

  return { setClause, values };
}

async function getCount(sql: string, params: unknown[] = [], client: DbClient = pool): Promise<number> {
  const rows = await queryRows<{ count: string }>(sql, params, client);
  return Number(rows[0]?.count ?? 0);
}

function applyDistrictFilterSql(baseWhere: string[] = [], _adminRole?: string | null, _adminDistrict?: string | null) {
  // New registration approvals are handled only by the Super Admin.
  // District-scoped approval is intentionally no longer used.
  return baseWhere;
}

export async function getUserByEmail(email: string) {
  try {
    const rows = await queryRows<User>("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function listDistricts() {
  try {
    const data = await queryRows<{ id: string; district_name: string; state_name: string | null }>(
      "SELECT id, district_name, state_name FROM districts ORDER BY district_name ASC",
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getDistrictByName(districtName: string) {
  const normalizedName = districtName?.trim();

  if (!normalizedName) {
    return { data: null, error: null };
  }

  try {
    const rows = await queryRows<{ id: string; district_name: string; state_name: string | null }>(
      "SELECT id, district_name, state_name FROM districts WHERE district_name ILIKE $1 LIMIT 1",
      [normalizedName],
    );

    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getDistrictById(districtId: string) {
  try {
    const rows = await queryRows<{ id: string; district_name: string; state_name: string | null }>(
      "SELECT id, district_name, state_name FROM districts WHERE id = $1 LIMIT 1",
      [districtId],
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
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

  try {
    const rows = await queryRows<{ id: string; district_name: string; state_name: string | null }>(
      "INSERT INTO districts (district_name, state_name, is_active) VALUES ($1, $2, $3) RETURNING id, district_name, state_name",
      [normalizedName, stateName, true],
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getUserByAadhar(aadhar: string) {
  try {
    const rows = await queryRows<{ id: string }>("SELECT id FROM users WHERE aadhar_number = $1", [aadhar]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getUserByPan(pan: string) {
  try {
    const rows = await queryRows<{ id: string }>("SELECT id FROM users WHERE pan_number = $1", [pan.toUpperCase()]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getUserByEhrmsCode(ehrmsCode: string) {
  try {
    const rows = await queryRows<{ id: string }>("SELECT id FROM users WHERE ehrms_code = $1 LIMIT 1", [ehrmsCode.trim().toUpperCase()]);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getDepartments() {
  try {
    const data = await queryRows<{ id: string; name: string }>("SELECT id, name FROM departments ORDER BY name ASC");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getPosts() {
  try {
    const data = await queryRows<{ id: string; department_id: string; name: string }>(
      "SELECT id, department_id, name FROM posts ORDER BY name ASC",
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getDepartmentById(departmentId: string) {
  try {
    const rows = await queryRows<{ id: string; name: string }>("SELECT id, name FROM departments WHERE id = $1 LIMIT 1", [departmentId]);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getPostById(postId: string) {
  try {
    const rows = await queryRows<{ id: string; department_id: string; name: string }>(
      "SELECT id, department_id, name FROM posts WHERE id = $1 LIMIT 1",
      [postId],
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function ensureRequiredRegistrationMasterData() {
  const departmentName = "Panchayati Raj Vibhag";
  const postName = "Safai Karamchari";

  try {
    const departmentRows = await queryRows<{ id: string; name: string }>(
      "INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name",
      [departmentName],
    );

    const department = departmentRows[0] ?? null;
    if (!department?.id) {
      return { department: null, post: null, error: new Error("Panchayati Raj Vibhag department could not be created.") };
    }

    const postRows = await queryRows<{ id: string; department_id: string; name: string }>(
      "INSERT INTO posts (department_id, name) VALUES ($1, $2) ON CONFLICT (department_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, department_id, name",
      [department.id, postName],
    );

    return { department, post: postRows[0] ?? null, error: null };
  } catch (error) {
    return { department: null, post: null, error: toDbError(error) };
  }
}

export async function createUser(userData: Record<string, unknown>) {
  try {
    const { columns, placeholders, values } = buildInsert("users", userData);
    const rows = await queryRows(
      `INSERT INTO users (${columns}) VALUES (${placeholders}) RETURNING id, email, status`,
      values,
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getPendingUsersForAdmin(adminRole?: string | null, adminDistrict?: string | null) {
  try {
    const whereClauses = applyDistrictFilterSql(["status = 'pending'"], adminRole, adminDistrict);

    const data = await queryRows<Partial<User>>(
      `SELECT id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, role_number, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, nominee_aadhar_number, reference_name, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, status, created_at
       FROM users
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY created_at DESC`,
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getPendingUsersCount() {
  try {
    const count = await getCount("SELECT COUNT(*)::text AS count FROM users WHERE status = 'pending'");
    return { count, error: null };
  } catch (error) {
    return { count: 0, error: toDbError(error) };
  }
}

export async function createApprovalHistory(historyData: Record<string, unknown>) {
  try {
    const { columns, placeholders, values } = buildInsert("approval_history", historyData);
    const rows = await queryRows(`INSERT INTO approval_history (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
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

  try {
    const { setClause, values } = buildUpdate(updateData);
    const rows = await queryRows(
      `UPDATE users
       SET ${setClause}
       WHERE id = $${values.length + 1} AND status = 'pending'
       RETURNING *`,
      [...values, userId],
    );

    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }

    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getDistrictAdminIds(district: string) {
  try {
    const data = await queryRows<{ admin_user_id: string }>(
      "SELECT admin_user_id, mapping_role FROM district_admin_mapping WHERE district = $1",
      [district],
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getDistrictAdminMappings() {
  try {
    const data = await queryRows(
      "SELECT id, admin_user_id, district, mapping_role, created_at FROM district_admin_mapping ORDER BY district",
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function assignDistrictAdmin(adminUserId: string, district: string, mappingRole: string) {
  try {
    const data = await withTransaction(async (client) => {
      await client.query("DELETE FROM district_admin_mapping WHERE district = $1 AND mapping_role = $2", [district, mappingRole]);
      const rows = await queryRows(
        "INSERT INTO district_admin_mapping (admin_user_id, district, mapping_role) VALUES ($1, $2, $3) RETURNING *",
        [adminUserId, district, mappingRole],
        client,
      );
      return rows[0] ?? null;
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function listAdmins() {
  try {
    const data = await queryRows(
      `SELECT id, name, email, role, district, district_id, is_admin, is_active, created_at, updated_at, ehrms_code
       FROM users
       WHERE is_admin = TRUE AND role = ANY($1::text[])
       ORDER BY created_at DESC`,
      [["super_admin", "country_co_admin", "district_admin", "district_co_admin"]],
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getAdminById(adminId: string) {
  try {
    const rows = await queryRows("SELECT * FROM users WHERE id = $1", [adminId]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("Admin") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function createOrUpdateAdmin(adminData: Record<string, unknown>) {
  const normalizedAdminData = { ...adminData };
  const rawId = typeof normalizedAdminData.id === "string" ? normalizedAdminData.id.trim() : "";

  if (!rawId) {
    delete normalizedAdminData.id;
  }

  try {
    if (rawId) {
      const { setClause, values } = buildUpdate(normalizedAdminData);
      const rows = await queryRows(
        `UPDATE users SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, rawId],
      );
      if (rows.length === 0) {
        return { data: null, error: missingSingleRowError("Admin") };
      }
      return { data: rows[0], error: null };
    }

    const { columns, placeholders, values } = buildInsert("users", normalizedAdminData);
    const rows = await queryRows(`INSERT INTO users (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
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

  try {
    const { columns, placeholders, values } = buildInsert("admin_assignment_audit", payload);
    const rows = await queryRows(`INSERT INTO admin_assignment_audit (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getCountryAdminIds() {
  try {
    const data = await queryRows<{ id: string }>("SELECT id FROM users WHERE is_admin = TRUE");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function createNotification(notificationData: Record<string, unknown>) {
  try {
    const { columns, placeholders, values } = buildInsert("notifications", notificationData);
    const rows = await queryRows(`INSERT INTO notifications (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function createNotificationsBatch(notifications: Record<string, unknown>[]) {
  if (!notifications || notifications.length === 0) return { data: null, error: null };

  try {
    const insertedRows: unknown[] = [];
    for (const notification of notifications) {
      const { columns, placeholders, values } = buildInsert("notifications", notification);
      const rows = await queryRows(`INSERT INTO notifications (${columns}) VALUES (${placeholders}) RETURNING *`, values);
      if (rows[0]) insertedRows.push(rows[0]);
    }

    return { data: insertedRows, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function resolveNotificationsForRegistration(registrationUserId: string) {
  try {
    const rows = await queryRows(
      "UPDATE notifications SET status = $1, read_at = $2 WHERE registration_user_id = $3 RETURNING *",
      ["resolved", new Date().toISOString(), registrationUserId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getApprovedUsers(adminRole?: string | null, adminDistrict?: string | null, selectedDistrict?: string | null, selectedBlock?: string | null) {
  const normalizedDistrict = selectedDistrict?.trim();
  const normalizedBlock = selectedBlock?.trim();

  try {
    const whereClauses: string[] = ["status = 'approved'"];
    const values: unknown[] = [];

    if (normalizedDistrict && normalizedDistrict !== "") {
      values.push(normalizedDistrict);
      whereClauses.push(`district = $${values.length}`);
    } else {
      applyDistrictFilterSql(whereClauses, adminRole, adminDistrict);
    }

    if (normalizedBlock && normalizedBlock !== "All") {
      values.push(`%${normalizedBlock}%`);
      whereClauses.push(`village_city ILIKE $${values.length}`);
    }

    const data = await queryRows(
      `SELECT id, serial_number, ehrms_code, name, role_number, email, phone_number, house_flat_no, street_locality, village_city, district, state, pincode, date_of_birth
       FROM users
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY serial_number ASC`,
      values,
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getAdminDashboardStats(adminRole?: string | null, adminDistrict?: string | null) {
  const isDistrictAdmin = adminRole === "district_admin" || adminRole === "district_co_admin";

  try {
    const [totalUsers, pendingUsers, approvedUsers, rejectedUsers] = await Promise.all([
      getCount("SELECT COUNT(*)::text AS count FROM users"),
      getCount("SELECT COUNT(*)::text AS count FROM users WHERE status = 'pending'"),
      getCount("SELECT COUNT(*)::text AS count FROM users WHERE status = 'approved'"),
      getCount("SELECT COUNT(*)::text AS count FROM users WHERE status = 'rejected'"),
    ]);

    let deaths = 0;
    let contributions = 0;

    if (isDistrictAdmin && adminDistrict) {
      [deaths, contributions] = await Promise.all([
        getCount(
          `SELECT COUNT(*)::text AS count
           FROM deaths d
           JOIN users u ON u.id = d.member_id
           WHERE u.district = $1`,
          [adminDistrict],
        ),
        getCount(
          `SELECT COUNT(*)::text AS count
           FROM contributions c
           JOIN users u ON u.id = c.contributor_id
           WHERE u.district = $1`,
          [adminDistrict],
        ),
      ]);
    } else {
      [deaths, contributions] = await Promise.all([
        getCount("SELECT COUNT(*)::text AS count FROM deaths"),
        getCount("SELECT COUNT(*)::text AS count FROM contributions"),
      ]);
    }

    return {
      data: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        rejectedUsers,
        deaths,
        contributions,
        isDistrictAdmin,
        district: adminDistrict,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function createDeath(deathData: Record<string, unknown>) {
  try {
    const { columns, placeholders, values } = buildInsert("deaths", deathData);
    const rows = await queryRows(`INSERT INTO deaths (${columns}) VALUES (${placeholders}) RETURNING id`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getAllDeaths(status?: "active" | "closed") {
  try {
    const values: unknown[] = [];
    let sql = "SELECT id, member_name, death_date, age, cause_of_death, family_info, amount_raised, status, created_at FROM deaths";

    if (status) {
      values.push(status);
      sql += ` WHERE status = $${values.length}`;
    }

    sql += " ORDER BY death_date DESC";

    const data = await queryRows<Death>(sql, values);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getPublicLabharthiRecords(page = 1, pageSize = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const offset = (safePage - 1) * safePageSize;

  try {
    const [deathRows, totalCount] = await Promise.all([
      queryRows<{ id: string; member_id?: string | null; member_name?: string | null; status?: string | null }>(
        `SELECT id, member_id, member_name, status, created_at
         FROM deaths
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [safePageSize, offset],
      ),
      getCount("SELECT COUNT(*)::text AS count FROM deaths"),
    ]);

    const deathIds = deathRows.map((death) => death.id).filter(Boolean);
    const memberIds = Array.from(new Set(deathRows.map((death) => death.member_id).filter((memberId): memberId is string => Boolean(memberId))));

    const [users, contributions] = await Promise.all([
      memberIds.length > 0
        ? queryRows<{ id: string; serial_number: string | null; ehrms_code: string | null; role_number: string | null; district: string | null; village_city: string | null; name: string | null }>(
            `SELECT id, name, serial_number, ehrms_code, role_number, district, village_city
             FROM users
             WHERE id::text = ANY($1::text[])`,
            [memberIds],
          )
        : Promise.resolve([]),
      deathIds.length > 0
        ? queryRows<{ death_id: string | null; contributor_name: string | null; created_at: string | null }>(
            `SELECT death_id, contributor_name, created_at
             FROM contributions
             WHERE death_id::text = ANY($1::text[])
             ORDER BY created_at DESC`,
            [deathIds],
          )
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const latestContributorByDeath = new Map<string, string>();

    contributions.forEach((entry) => {
      const deathId = entry.death_id ?? undefined;
      if (!deathId || latestContributorByDeath.has(deathId)) return;
      latestContributorByDeath.set(deathId, entry.contributor_name || "-");
    });

    const records = deathRows.map((death) => {
      const user = death.member_id ? userMap.get(death.member_id) : null;
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
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      totalCount: 0,
      totalPages: 0,
      error: toDbError(error),
    };
  }
}

export async function getDeathById(deathId: string) {
  try {
    const rows = await queryRows<Death>("SELECT * FROM deaths WHERE id = $1", [deathId]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("Death") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getContributionsByDeathId(deathId: string) {
  try {
    const data = await queryRows<Contribution>(
      "SELECT * FROM contributions WHERE death_id = $1 ORDER BY contribution_date DESC",
      [deathId],
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function updateDeathStatus(deathId: string, status: "active" | "closed") {
  try {
    const rows = await queryRows("UPDATE deaths SET status = $1 WHERE id = $2 RETURNING *", [status, deathId]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("Death") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function createContribution(contributionData: Record<string, unknown>) {
  try {
    const { columns, placeholders, values } = buildInsert("contributions", contributionData);
    const rows = await queryRows(`INSERT INTO contributions (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getUserById(userId: string) {
  try {
    const rows = await queryRows(
      "SELECT id, name, email, status, district, phone_number, ehrms_code, role_number, aadhar_number, pan_number, nominee_aadhar_number, bank_account_number, bank_ifsc_code, bank_holder_name, house_flat_no, street_locality, landmark, village_city, state, pincode, country FROM users WHERE id = $1",
      [userId],
    );
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getUserProfileById(userId: string) {
  try {
    const rows = await queryRows<Partial<User>>(
      `SELECT id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, role_number, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, nominee_aadhar_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, role, status, is_admin, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }

    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  try {
    const { setClause, values } = buildUpdate(updates);
    const rows = await queryRows<Partial<User>>(
      `UPDATE users
       SET ${setClause}
       WHERE id = $${values.length + 1}
       RETURNING id, email, name, aadhar_number, pan_number, date_of_birth, ehrms_code, role_number, gender, father_husband_name, department_id, post_id, nominee_name, nominee_relationship, nominee_mobile_number, nominee_aadhar_number, bank_account_number, bank_ifsc_code, bank_holder_name, phone_number, house_flat_no, street_locality, landmark, village_city, district, state, pincode, country, role, status, is_admin, created_at, updated_at`,
      [...values, userId],
    );

    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }

    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
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
      const usersFound = await queryRows<{ id: string }>(
        `SELECT id
         FROM users
         WHERE name ILIKE $1 OR ehrms_code ILIKE $1 OR phone_number ILIKE $1
         LIMIT 2000`,
        [`%${q}%`],
      );

      userIds = usersFound.map((user) => user.id).filter(Boolean);
      if (userIds.length === 0) {
        return { data: [], count: 0 };
      }
    }

    const offset = (page - 1) * pageSize;
    const whereClauses: string[] = [];
    const whereValues: unknown[] = [];

    if (normalizedType) {
      whereValues.push(normalizedType);
      whereClauses.push(`LOWER(COALESCE(sahyog_type, '')) = $${whereValues.length}`);
    }

    if (userIds && userIds.length > 0) {
      whereValues.push(userIds);
      whereClauses.push(`user_id::text = ANY($${whereValues.length}::text[])`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [receipts, count] = await Promise.all([
      queryRows<any>(
        `SELECT *
         FROM receipts
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT $${whereValues.length + 1} OFFSET $${whereValues.length + 2}`,
        [...whereValues, pageSize, offset],
      ),
      getCount(
        `SELECT COUNT(*)::text AS count FROM receipts ${whereSql}`,
        whereValues,
      ),
    ]);

    if (receipts.length === 0) {
      return { data: [], count };
    }

    const userIdsInRows = Array.from(new Set(receipts.map((receipt: any) => receipt.user_id).filter(Boolean)));

    const usersMap: Record<string, any> = {};
    if (userIdsInRows.length > 0) {
      const users = await queryRows<any>(
        `SELECT id, name, ehrms_code, phone_number, department_id, block, district, village_city
         FROM users
         WHERE id::text = ANY($1::text[])`,
        [userIdsInRows],
      );
      users.forEach((user) => {
        usersMap[user.id] = user;
      });
    }

    const deptIds = Array.from(new Set(Object.values(usersMap).map((user: any) => user.department_id).filter(Boolean)));
    const deptMap: Record<string, any> = {};
    if (deptIds.length > 0) {
      const depts = await queryRows<any>(
        "SELECT id, name FROM departments WHERE id::text = ANY($1::text[])",
        [deptIds],
      );
      depts.forEach((dept) => {
        deptMap[dept.id] = dept;
      });
    }

    const latestContributionByUser: Record<string, any> = {};
    if (userIdsInRows.length > 0) {
      const contributions = await queryRows<any>(
        `SELECT id, contributor_id, death_id, contribution_date, created_at
         FROM contributions
         WHERE contributor_id::text = ANY($1::text[])
         ORDER BY contribution_date DESC`,
        [userIdsInRows],
      );

      for (const contribution of contributions) {
        const key = contribution.contributor_id;
        const contributionDate = contribution.contribution_date ?? contribution.created_at;
        if (!key) continue;

        const existing = latestContributionByUser[key];
        const existingDate = existing ? existing.contribution_date ?? existing.created_at : null;
        if (!existing || new Date(contributionDate) > new Date(existingDate)) {
          latestContributionByUser[key] = contribution;
        }
      }
    }

    const deathIds = Array.from(new Set(Object.values(latestContributionByUser).map((entry: any) => entry.death_id).filter(Boolean)));
    const deathsMap: Record<string, any> = {};
    if (deathIds.length > 0) {
      const deaths = await queryRows<any>(
        "SELECT id, member_name FROM deaths WHERE id::text = ANY($1::text[])",
        [deathIds],
      );
      deaths.forEach((death) => {
        deathsMap[death.id] = death;
      });
    }

    const items = receipts.map((receipt: any) => {
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

    return { data: items, count };
  } catch (err) {
    return { data: null, count: 0, error: toDbError(err) };
  }
}

export async function createReceipt(receiptData: Record<string, unknown>) {
  try {
    const { columns, placeholders, values } = buildInsert("receipts", receiptData);
    const rows = await queryRows(`INSERT INTO receipts (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getReceiptByTransactionNumber(transactionNumber: string) {
  try {
    const rows = await queryRows(
      "SELECT * FROM receipts WHERE transaction_number = $1 LIMIT 1",
      [transactionNumber.trim()],
    );
    return { data: rows[0] ?? null, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function getReceiptById(receiptId: string) {
  try {
    const rows = await queryRows("SELECT * FROM receipts WHERE id = $1", [receiptId]);
    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("Receipt") };
    }
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function updateReceipt(receiptId: string, updates: Record<string, unknown>) {
  try {
    const { setClause, values } = buildUpdate(updates);
    const rows = await queryRows(
      `UPDATE receipts SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, receiptId],
    );

    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("Receipt") };
    }

    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function deleteReceipt(receiptId: string) {
  try {
    await queryRows("DELETE FROM receipts WHERE id = $1 RETURNING id", [receiptId]);
    return { error: null };
  } catch (error) {
    return { error: toDbError(error) };
  }
}

export async function getReceiptsByUser(userId: string) {
  try {
    const data = await queryRows<any>(
      "SELECT * FROM receipts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  try {
    const rows = await queryRows(
      "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3 RETURNING *",
      [passwordHash, new Date().toISOString(), userId],
    );

    if (rows.length === 0) {
      return { data: null, error: missingSingleRowError("User") };
    }

    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

