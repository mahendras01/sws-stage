CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(30) NOT NULL CHECK (type IN ('achievement', 'photo', 'video')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  media_url TEXT,
  external_link TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_type ON gallery_items(type);
CREATE INDEX IF NOT EXISTS idx_gallery_items_active ON gallery_items(is_active);
CREATE INDEX IF NOT EXISTS idx_gallery_items_sort_order ON gallery_items(sort_order);

CREATE OR REPLACE FUNCTION gallery_items_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gallery_items_updated_at
BEFORE UPDATE ON gallery_items
FOR EACH ROW
EXECUTE FUNCTION gallery_items_update_updated_at();

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active gallery items" ON gallery_items
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Managers can insert gallery items" ON gallery_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin', 'district_admin', 'district_co_admin')
    )
  );

CREATE POLICY "Managers can update gallery items" ON gallery_items
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin', 'district_admin', 'district_co_admin')
    )
  );

CREATE POLICY "Managers can delete gallery items" ON gallery_items
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin = TRUE
        AND u.role IN ('super_admin', 'country_co_admin', 'district_admin', 'district_co_admin')
    )
  );
