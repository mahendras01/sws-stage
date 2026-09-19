CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ehrms_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS father_husband_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nominee_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nominee_relationship VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nominee_mobile_number VARCHAR(15);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ehrms_code_unique
ON users (ehrms_code)
WHERE ehrms_code IS NOT NULL;

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
