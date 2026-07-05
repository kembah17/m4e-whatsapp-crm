-- Import sessions for WhatsApp/email import bridge
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  contact_id UUID REFERENCES contacts(id),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting','previewing','confirmed','cancelled','expired')),
  collected_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_summary JSONB,
  source_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);
CREATE INDEX idx_import_sessions_account ON import_sessions(account_id);
CREATE INDEX idx_import_sessions_conversation ON import_sessions(conversation_id);
CREATE INDEX idx_import_sessions_status ON import_sessions(status) WHERE status = 'collecting';
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own account import sessions" ON import_sessions
  FOR ALL USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));
