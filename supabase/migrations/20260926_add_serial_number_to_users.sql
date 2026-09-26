ALTER TABLE users
  ADD COLUMN IF NOT EXISTS serial_number BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_serial_number_unique
  ON users (serial_number)
  WHERE serial_number IS NOT NULL;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM users
  WHERE serial_number IS NULL
)
UPDATE users u
SET serial_number = r.rn
FROM ranked r
WHERE u.id = r.id;

CREATE OR REPLACE FUNCTION set_users_serial_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    SELECT COALESCE(MAX(serial_number), 0) + 1
    INTO NEW.serial_number
    FROM users;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_users_serial_number ON users;
CREATE TRIGGER trg_set_users_serial_number
BEFORE INSERT OR UPDATE OF serial_number
ON users
FOR EACH ROW
EXECUTE FUNCTION set_users_serial_number();

WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM users
  WHERE serial_number IS NULL
)
UPDATE users u
SET serial_number = n.rn
FROM numbered n
WHERE u.id = n.id;
