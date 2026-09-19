-- Pre-migration diagnostic checks for admin/district migrations

-- 1) Active Super Admins
SELECT id, email FROM users WHERE role = 'super_admin' AND is_active = true;

-- 2) Duplicate active Super Admin count
SELECT count(*) AS active_super_admins FROM users WHERE role = 'super_admin' AND is_active = true;

-- 3) District admin mapping duplicates (district + mapping_role)
SELECT district, mapping_role, count(*) FROM district_admin_mapping GROUP BY district, mapping_role HAVING count(*) > 1;

-- 4) Pending users by district
SELECT COALESCE(NULLIF(district, ''), '__none__') AS district, count(*) FROM users WHERE status = 'pending' GROUP BY COALESCE(NULLIF(district, ''), '__none__') ORDER BY count DESC;

-- 5) Check for existing FK constraint names we plan to create
SELECT conname, conrelid::regclass AS table_name FROM pg_constraint WHERE conname IN ('fk_users_created_by','fk_users_updated_by','fk_dam_created_by','fk_dam_updated_by');

-- 6) Check for existing policies related to these migrations
SELECT polname, polrelid::regclass AS table_name FROM pg_policy WHERE polname LIKE 'users_%' OR polname LIKE 'dam_%' OR polname LIKE 'notifications_%' OR polname LIKE 'admin_audit_%';

-- 7) Sanity: existing district values in users
SELECT district, count(*) FROM users GROUP BY district ORDER BY count DESC LIMIT 50;

-- 8) Existing district_admin_mapping rows (sample)
SELECT * FROM district_admin_mapping ORDER BY created_at DESC LIMIT 50;
