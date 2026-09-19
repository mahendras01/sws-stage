-- Migration: create receipts table with unique constraints and transaction id generator
CREATE SEQUENCE IF NOT EXISTS receipts_txn_seq;

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number VARCHAR(255) NOT NULL UNIQUE,
  transaction_seq BIGINT NOT NULL DEFAULT nextval('receipts_txn_seq'),
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  uploaded_file_path TEXT NOT NULL,
  receipt_file_path TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to populate transaction_id using date and sequence
CREATE OR REPLACE FUNCTION receipts_generate_transaction_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_id IS NULL OR NEW.transaction_id = '' THEN
    NEW.transaction_id := 'SWS-TXN-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' || lpad(NEW.transaction_seq::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_receipts_generate_transaction_id
BEFORE INSERT ON receipts
FOR EACH ROW
EXECUTE FUNCTION receipts_generate_transaction_id();

-- updated_at trigger
CREATE OR REPLACE FUNCTION receipts_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_receipts_updated_at
BEFORE UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION receipts_update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_seq ON receipts(transaction_seq);

-- Enable Row Level Security and policies
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Allow service role full access to receipts" ON receipts FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Users can insert their own receipts
CREATE POLICY "Users can insert own receipts" ON receipts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can select their own receipts; service role can also select
CREATE POLICY "Users can select own receipts" ON receipts FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Only service role can update/delete receipts (admin actions)
CREATE POLICY "Service role can modify receipts (update)" ON receipts FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can modify receipts (delete)" ON receipts FOR DELETE USING (auth.role() = 'service_role');
