-- Migration: add additional profile fields required by My Profile sections
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nominee2_relationship VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nominee2_mobile_number VARCHAR(15),
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5),
  ADD COLUMN IF NOT EXISTS office_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sub_post VARCHAR(255),
  ADD COLUMN IF NOT EXISTS block VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone_home VARCHAR(15),
  ADD COLUMN IF NOT EXISTS disease TEXT,
  ADD COLUMN IF NOT EXISTS cause_of_illness TEXT;

-- Indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_office_name ON users(office_name);
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group);
