CREATE TABLE IF NOT EXISTS annual_maintenance_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_category VARCHAR(50) NOT NULL DEFAULT 'ANNUAL_MAINTENANCE',
  fee_amount DECIMAL(12,2),
  qr_code_url TEXT,
  upi_id VARCHAR(255),
  account_holder_name VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(255),
  ifsc_code VARCHAR(30),
  branch_name VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE annual_maintenance_settings
  ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

CREATE TABLE IF NOT EXISTS annual_maintenance_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_category VARCHAR(50) NOT NULL DEFAULT 'ANNUAL_MAINTENANCE',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_number VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2),
  payment_date DATE,
  payment_receipt_path TEXT,
  payment_receipt_name TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annual_maintenance_settings_active ON annual_maintenance_settings(is_active, payment_category);
CREATE INDEX IF NOT EXISTS idx_annual_maintenance_payments_user ON annual_maintenance_payments(user_id, payment_category);

CREATE OR REPLACE FUNCTION annual_maintenance_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annual_maintenance_settings_updated_at
BEFORE UPDATE ON annual_maintenance_settings
FOR EACH ROW
EXECUTE FUNCTION annual_maintenance_update_updated_at();

CREATE TRIGGER trigger_annual_maintenance_payments_updated_at
BEFORE UPDATE ON annual_maintenance_payments
FOR EACH ROW
EXECUTE FUNCTION annual_maintenance_update_updated_at();

ALTER TABLE annual_maintenance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_maintenance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active annual maintenance settings" ON annual_maintenance_settings
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can insert their annual maintenance payments" ON annual_maintenance_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own annual maintenance payments" ON annual_maintenance_payments
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Super and country admins can manage annual maintenance settings" ON annual_maintenance_settings
  FOR ALL USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin')
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin')
    )
  );

CREATE POLICY "Admins can manage annual maintenance payments" ON annual_maintenance_payments
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin')
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin')
    )
  );
