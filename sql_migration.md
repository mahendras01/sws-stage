# Address Feature Migration

Run the following SQL in Supabase SQL Editor to add address columns to the existing users table safely.

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS house_flat_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS street_locality VARCHAR(255),
  ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
  ADD COLUMN IF NOT EXISTS village_city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(6),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) NOT NULL DEFAULT 'India';
```

This migration is safe for existing users because the new columns are added without dropping or modifying existing rows.

# District Admin Approval Workflow Migration

Run the following SQL to add role-based admin access, district-based admin mapping, and approval history support.

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'district_admin', 'super_admin');
  END IF;
END
$$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS district VARCHAR(100);

CREATE TABLE IF NOT EXISTS district_admin_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  district VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_user_id, district)
);

CREATE TABLE IF NOT EXISTS approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_role VARCHAR(30) NOT NULL,
  approval_status VARCHAR(20) NOT NULL CHECK (approval_status IN ('approved', 'rejected')),
  approval_reason TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);
CREATE INDEX IF NOT EXISTS idx_district_admin_mapping_admin ON district_admin_mapping(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_user_id ON approval_history(user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_admin_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to users" ON users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to district_admin_mapping" ON district_admin_mapping FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to approval_history" ON approval_history FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

After running this migration, assign a district admin by updating a user to `role = 'district_admin'`, `is_admin = true`, and inserting a mapping row in `district_admin_mapping`.
