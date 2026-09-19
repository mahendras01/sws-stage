-- Migration: add receipt_number, file fields, sequence and RPC for generating receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipts_receipt_seq;

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(255);

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Ensure uniqueness on receipt_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'receipts' AND indexname = 'idx_receipts_receipt_number'
  ) THEN
    CREATE UNIQUE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
  END IF;
END$$;

-- RPC function to get next receipt number from DB sequence
CREATE OR REPLACE FUNCTION receipts_get_next_receipt_number()
RETURNS TEXT AS $$
DECLARE
  seqval bigint;
  rnum text;
BEGIN
  seqval := nextval('receipts_receipt_seq');
  rnum := 'SWS-REC-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' || lpad(seqval::text, 6, '0');
  RETURN rnum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
