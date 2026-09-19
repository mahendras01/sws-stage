-- RLS policies for admin hierarchy and district-level access
-- Idempotent: uses IF NOT EXISTS where applicable and careful checks

-- Notes:
-- - Policies assume `auth.uid()` returns the current user's UUID and that the
--   `users` table stores role and is_active for admin detection.
-- - Server-side actions should continue to use the service role (auth.role() = 'service_role').

-- 1) Helper expressions (used inline below):
--    - super_admin: exists user with id = auth.uid() and role = 'super_admin' and is_active
--    - country_co_admin: exists user with id = auth.uid() and role = 'country_co_admin' and is_active
--    - district_admin mapping: exists row in district_admin_mapping for auth.uid() matching users.district

-- 2) Policies for `users` table
-- Allow selects for: service_role, owner (auth.uid() = id), super_admin, country_co_admin, district admins for that district
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_select_owner_or_admin') THEN
    CREATE POLICY users_select_owner_or_admin ON users FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR auth.uid() = id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin' AND u.is_active)
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'country_co_admin' AND u.is_active)
        OR EXISTS (SELECT 1 FROM district_admin_mapping dam WHERE dam.admin_user_id = auth.uid() AND dam.is_active AND dam.mapping_role IN ('district_admin','district_co_admin') AND dam.district = users.district)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_update_admin_only') THEN
    CREATE POLICY users_update_admin_only ON users FOR UPDATE
      USING (
        auth.role() = 'service_role'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_insert_service_only') THEN
    CREATE POLICY users_insert_service_only ON users FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_delete_admin') THEN
    CREATE POLICY users_delete_admin ON users FOR DELETE
      USING (
        auth.role() = 'service_role'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin' AND u.is_active)
      );
  END IF;
END
$$;

-- 3) Policies for `district_admin_mapping`
-- - Super Admin and Country Co-Admin can manage mappings (create/update/delete)
-- - Admins can view their own mapping; service role has full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'dam_select_policy') THEN
    CREATE POLICY dam_select_policy ON district_admin_mapping FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR admin_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'dam_manage_by_country_admin') THEN
    CREATE POLICY dam_manage_by_country_admin ON district_admin_mapping FOR ALL
      USING (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active))
      WITH CHECK (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active));
  END IF;
END
$$;

-- 4) Policies for `notifications`
-- - Inserts only by service role (server creates notifications)
-- - Select by recipient or super_admin/country_co_admin
-- - Update (mark read/resolve) allowed by recipient, service_role, or super_admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notifications_insert_service_only') THEN
    CREATE POLICY notifications_insert_service_only ON notifications FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notifications_select_recipient') THEN
    CREATE POLICY notifications_select_recipient ON notifications FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR recipient_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notifications_update_recipient') THEN
    CREATE POLICY notifications_update_recipient ON notifications FOR UPDATE
      USING (
        auth.role() = 'service_role'
        OR recipient_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR recipient_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      );
  END IF;
END
$$;

-- 5) Policies for `admin_assignment_audit`
-- - Inserts by service_role only (server logs assignments)
-- - Select by service_role or super_admin/country_co_admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'admin_audit_insert_service_only') THEN
    CREATE POLICY admin_audit_insert_service_only ON admin_assignment_audit FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'admin_audit_select_admins') THEN
    CREATE POLICY admin_audit_select_admins ON admin_assignment_audit FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin','country_co_admin') AND u.is_active)
      );
  END IF;
END
$$;

-- End of RLS policy file
