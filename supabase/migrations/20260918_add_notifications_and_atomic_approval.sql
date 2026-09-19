-- Add notifications table and ensure atomic approval updates

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  registration_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  district VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, resolved
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique ON notifications(recipient_user_id, notification_type, registration_user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_registration_user_id ON notifications(registration_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access to notifications" ON notifications FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
