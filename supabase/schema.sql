-- Self-Welfare Society Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User status enum
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');

-- User role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'district_admin', 'super_admin', 'country_co_admin', 'district_co_admin');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'country_co_admin') THEN
    ALTER TYPE user_role ADD VALUE 'country_co_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'district_co_admin') THEN
    ALTER TYPE user_role ADD VALUE 'district_co_admin';
  END IF;
END
$$;

-- Death status enum
CREATE TYPE death_status AS ENUM ('active', 'closed');

-- Department and post masters
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

-- District master used for district-scoped admin roles
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_name VARCHAR(255) NOT NULL UNIQUE,
  state_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  aadhar_number VARCHAR(12) NOT NULL UNIQUE,
  pan_number VARCHAR(10) NOT NULL UNIQUE,
  date_of_birth DATE,
  ehrms_code VARCHAR(50) UNIQUE,
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
  father_husband_name VARCHAR(255),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  nominee_name VARCHAR(255),
  nominee_relationship VARCHAR(100),
  nominee_mobile_number VARCHAR(15),
  bank_account_number VARCHAR(18) NOT NULL,
  bank_ifsc_code VARCHAR(11) NOT NULL,
  bank_holder_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(10) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  district VARCHAR(100),
  district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
  state VARCHAR(100),
  pincode VARCHAR(6),
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  status user_status NOT NULL DEFAULT 'pending',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rejected_reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS house_flat_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS street_locality VARCHAR(255),
  ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
  ADD COLUMN IF NOT EXISTS village_city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS district_id UUID,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(6),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

INSERT INTO departments (name)
VALUES
  ('Administration'),
  ('Accounts'),
  ('Operations'),
  ('Health & Safety')
ON CONFLICT (name) DO NOTHING;

INSERT INTO posts (department_id, name)
SELECT d.id, v.name
FROM departments d
CROSS JOIN (VALUES
  ('Administration', 'Clerk'),
  ('Administration', 'Assistant'),
  ('Accounts', 'Accountant'),
  ('Accounts', 'Cashier'),
  ('Operations', 'Supervisor'),
  ('Operations', 'Field Officer'),
  ('Health & Safety', 'Medical Officer'),
  ('Health & Safety', 'Support Staff')
) AS v(department_name, name)
WHERE d.name = v.department_name
ON CONFLICT (department_id, name) DO NOTHING;

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- District admin mapping table
CREATE TABLE district_admin_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  district VARCHAR(100) NOT NULL,
  mapping_role VARCHAR(30) NOT NULL DEFAULT 'district_admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_user_id, district)
);

-- Approval history table
CREATE TABLE approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_role VARCHAR(30) NOT NULL,
  approval_status VARCHAR(20) NOT NULL CHECK (approval_status IN ('approved', 'rejected')),
  approval_reason TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin assignment audit log
CREATE TABLE admin_assignment_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  mapping_role VARCHAR(30),
  district VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table for registration/admin requests
CREATE TABLE notifications (
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

-- Deaths table
CREATE TABLE deaths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_name VARCHAR(255) NOT NULL,
  member_id UUID REFERENCES users(id) ON DELETE SET NULL,
  death_date DATE NOT NULL,
  age INTEGER,
  cause_of_death TEXT,
  family_info TEXT,
  amount_raised DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status death_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contributions table
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  death_id UUID NOT NULL REFERENCES deaths(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contributor_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district);
CREATE INDEX idx_users_ehrms_code ON users(ehrms_code);
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_posts_department_id ON posts(department_id);
CREATE INDEX idx_posts_name ON posts(name);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_district_admin_mapping_admin ON district_admin_mapping(admin_user_id);
CREATE INDEX idx_district_admin_mapping_district ON district_admin_mapping(district);
CREATE INDEX idx_approval_history_user_id ON approval_history(user_id);
CREATE INDEX idx_approval_history_approved_by ON approval_history(approved_by);
CREATE INDEX idx_deaths_status ON deaths(status);
CREATE INDEX idx_deaths_death_date ON deaths(death_date DESC);
CREATE INDEX idx_contributions_death_id ON contributions(death_id);

-- Function to update amount_raised when contribution is added/updated/deleted
CREATE OR REPLACE FUNCTION update_death_amount_raised()
RETURNS TRIGGER AS $$
DECLARE
  target_death_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_death_id := OLD.death_id;
  ELSE
    target_death_id := NEW.death_id;
  END IF;

  UPDATE deaths
  SET amount_raised = (
    SELECT COALESCE(SUM(amount), 0)
    FROM contributions
    WHERE death_id = target_death_id
  )
  WHERE id = target_death_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_amount_raised
AFTER INSERT OR UPDATE OR DELETE ON contributions
FOR EACH ROW
EXECUTE FUNCTION update_death_amount_raised();

-- Function to update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security (optional - we use service role from API)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_admin_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to users" ON users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to password_reset_tokens" ON password_reset_tokens FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to district_admin_mapping" ON district_admin_mapping FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to approval_history" ON approval_history FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to deaths" ON deaths FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to contributions" ON contributions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Create admin user (update email/password hash after first signup)
-- Example: After signing up, run:
-- UPDATE users SET is_admin = true, status = 'approved' WHERE email = 'admin@example.com';
