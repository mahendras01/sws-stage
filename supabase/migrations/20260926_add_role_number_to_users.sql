ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_number VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_users_role_number
  ON users (role_number);
