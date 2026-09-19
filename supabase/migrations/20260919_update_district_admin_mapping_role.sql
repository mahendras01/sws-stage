-- Add mapping_role to district_admin_mapping to distinguish admin/co-admin
ALTER TABLE district_admin_mapping
  ADD COLUMN IF NOT EXISTS mapping_role VARCHAR(30) DEFAULT 'district_admin';

-- Ensure only one mapping per district per role
CREATE UNIQUE INDEX IF NOT EXISTS idx_district_role_unique ON district_admin_mapping(district, mapping_role);
