-- 2026-09-20: Add districts master, role values, admin flags, and indexes.
-- Idempotent: uses IF NOT EXISTS checks and DO blocks for enum additions.

-- 1) Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Add new role enum values (if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'country_co_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'country_co_admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'district_co_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'district_co_admin';
  END IF;
END
$$;

-- 3) Create districts master table if missing
CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_name VARCHAR(255) NOT NULL UNIQUE,
  state_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Add district_id to users (nullable for now to avoid breaking)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS district_id UUID;

-- 5) Backfill districts from existing users.district text values (only non-null/non-empty)
-- Insert distinct district names into districts table (skip blank)
INSERT INTO districts (district_name)
SELECT DISTINCT TRIM(district) FROM users
WHERE district IS NOT NULL AND TRIM(district) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM districts d WHERE d.district_name = TRIM(users.district)
  );

-- 6) Set users.district_id by matching district name (safe update; only affects rows with text district)
UPDATE users
SET district_id = d.id
FROM districts d
WHERE users.district IS NOT NULL
  AND TRIM(users.district) = d.district_name
  AND (users.district_id IS NULL OR users.district_id <> d.id);

-- 7) Add is_active to users for admin activation control (default true)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 8) Add created_by / updated_by to users (nullable FK)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add FK constraints on users.created_by/updated_by if they do not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_created_by') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_updated_by') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 9) Add mapping_role and is_active to district_admin_mapping and created_by/updated_by for audit
ALTER TABLE district_admin_mapping
  ADD COLUMN IF NOT EXISTS mapping_role VARCHAR(30) DEFAULT 'district_admin',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add FK constraints on district_admin_mapping.created_by/updated_by if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dam_created_by') THEN
    ALTER TABLE district_admin_mapping ADD CONSTRAINT fk_dam_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dam_updated_by') THEN
    ALTER TABLE district_admin_mapping ADD CONSTRAINT fk_dam_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 10) Ensure only one active Super Admin: partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_super_admin ON users ((role)) WHERE role = 'super_admin' AND is_active = true;

-- 11) Ensure only one active District Admin/Co-Admin per district: unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_district_role ON district_admin_mapping (district, mapping_role) WHERE is_active = true;

-- 12) Create admin_assignment_audit to log changes (immutable)
CREATE TABLE IF NOT EXISTS admin_assignment_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'assign','unassign','activate','deactivate','change_role'
  mapping_role VARCHAR(30),
  district VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13) Notifications table (if not created already)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  registration_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  district_id UUID,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_registration_user_id ON notifications (registration_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications (recipient_user_id);

-- 14) Enable/keep RLS on new/changed tables (note: policies require careful review)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_admin_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_assignment_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 15) Example service_role policy: keep existing service_role full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_full_access_users') THEN
    CREATE POLICY service_role_full_access_users ON users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_full_access_dam') THEN
    CREATE POLICY service_role_full_access_dam ON district_admin_mapping FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_full_access_admin_audit') THEN
    CREATE POLICY service_role_full_access_admin_audit ON admin_assignment_audit FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_full_access_notifications') THEN
    CREATE POLICY service_role_full_access_notifications ON notifications FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- 16) Comments for future cleanup
COMMENT ON COLUMN users.district IS 'Deprecated: use users.district_id FK to districts.id (added 2026-09-20). Keep until clients migrated.';