ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nominee_aadhar_number VARCHAR(12);
