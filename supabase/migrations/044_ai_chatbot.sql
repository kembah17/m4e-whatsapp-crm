-- Migration 044: AI Chatbot / Intent Detection System
-- Adds tables for AI chatbot configuration, knowledge base, and conversation logs.

-- ============================================================
-- 1. ai_chatbot_config — one row per account
-- ============================================================
CREATE TABLE ai_chatbot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  confidence_threshold NUMERIC(3,2) DEFAULT 0.70,
  max_auto_replies INTEGER DEFAULT 3,
  handoff_message TEXT DEFAULT 'Let me connect you with a team member who can help you better. Please hold on a moment! ð',
  greeting_message TEXT DEFAULT 'Hello! ð I''m an AI assistant. How can I help you today?',
  system_prompt TEXT DEFAULT 'You are a helpful customer service assistant for a Nigerian business. Be friendly, professional, and concise. Use simple English. If you cannot answer a question confidently, say so and offer to connect the customer with a human agent. Always be respectful and use appropriate emojis sparingly.',
  business_hours JSONB DEFAULT '{"enabled": false, "timezone": "Africa/Lagos", "schedule": {"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}, "saturday": {"start": "09:00", "end": "13:00"}, "sunday": null}}'::jsonb,
  excluded_labels TEXT[] DEFAULT '{}',
  auto_greet_new_contacts BOOLEAN DEFAULT false,
  fallback_message TEXT DEFAULT 'I''m sorry, I couldn''t understand that. Could you please rephrase your question? Or type "agent" to speak with a human.',
  max_tokens INTEGER DEFAULT 500,
  temperature NUMERIC(2,1) DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

-- ============================================================
-- 2. ai_knowledge_base — FAQ / knowledge entries per account
-- ============================================================
CREATE TABLE ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('faq', 'product', 'policy', 'shipping', 'returns', 'pricing', 'general')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. ai_conversation_logs — every AI interaction
-- ============================================================
CREATE TABLE ai_conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID,
  inbound_message TEXT NOT NULL,
  detected_intent TEXT,
  confidence NUMERIC(3,2),
  response_text TEXT,
  knowledge_entry_id UUID REFERENCES ai_knowledge_base(id) ON DELETE SET NULL,
  was_auto_replied BOOLEAN DEFAULT false,
  was_handed_off BOOLEAN DEFAULT false,
  handoff_reason TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX idx_ai_chatbot_config_account ON ai_chatbot_config(account_id);
CREATE INDEX idx_ai_knowledge_base_account ON ai_knowledge_base(account_id);
CREATE INDEX idx_ai_knowledge_base_category ON ai_knowledge_base(account_id, category);
CREATE INDEX idx_ai_knowledge_base_active ON ai_knowledge_base(account_id, is_active);
CREATE INDEX idx_ai_conversation_logs_account ON ai_conversation_logs(account_id);
CREATE INDEX idx_ai_conversation_logs_contact ON ai_conversation_logs(contact_id);
CREATE INDEX idx_ai_conversation_logs_created ON ai_conversation_logs(account_id, created_at DESC);
CREATE INDEX idx_ai_conversation_logs_intent ON ai_conversation_logs(account_id, detected_intent);

-- ============================================================
-- 5. RLS policies
-- ============================================================
ALTER TABLE ai_chatbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_logs ENABLE ROW LEVEL SECURITY;

-- ai_chatbot_config: users can read/write their own account's config
CREATE POLICY ai_chatbot_config_select ON ai_chatbot_config
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY ai_chatbot_config_insert ON ai_chatbot_config
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY ai_chatbot_config_update ON ai_chatbot_config
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ai_knowledge_base: users can CRUD their own account's entries
CREATE POLICY ai_knowledge_base_select ON ai_knowledge_base
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY ai_knowledge_base_insert ON ai_knowledge_base
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY ai_knowledge_base_update ON ai_knowledge_base
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY ai_knowledge_base_delete ON ai_knowledge_base
  FOR DELETE USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ai_conversation_logs: users can read their own account's logs
CREATE POLICY ai_conversation_logs_select ON ai_conversation_logs
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
CREATE POLICY ai_conversation_logs_insert ON ai_conversation_logs
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Helper function: count recent AI auto-replies for a contact
-- ============================================================
CREATE OR REPLACE FUNCTION count_ai_replies_last_24h(
  p_account_id UUID,
  p_contact_id UUID
) RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM ai_conversation_logs
  WHERE account_id = p_account_id
    AND contact_id = p_contact_id
    AND was_auto_replied = true
    AND created_at >= now() - INTERVAL '24 hours';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 7. updated_at trigger for ai_chatbot_config
-- ============================================================
CREATE OR REPLACE FUNCTION update_ai_chatbot_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_chatbot_config_updated_at
  BEFORE UPDATE ON ai_chatbot_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chatbot_config_updated_at();

-- updated_at trigger for ai_knowledge_base
CREATE OR REPLACE FUNCTION update_ai_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_knowledge_base_updated_at
  BEFORE UPDATE ON ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_knowledge_base_updated_at();
