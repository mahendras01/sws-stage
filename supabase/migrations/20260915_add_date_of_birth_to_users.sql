ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Optional safety check for existing profiles:
-- UPDATE users
-- SET date_of_birth = NULL
-- WHERE date_of_birth IS NOT NULL AND date_of_birth > CURRENT_DATE;
