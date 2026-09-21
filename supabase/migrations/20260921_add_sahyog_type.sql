-- Add sahyog_type so receipt uploads can be classified and filtered by list pages
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS sahyog_type VARCHAR(100);

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS sahyog_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_receipts_sahyog_type ON receipts(sahyog_type);
CREATE INDEX IF NOT EXISTS idx_contributions_sahyog_type ON contributions(sahyog_type);
