-- Migration 057: Ban Avoidance, Multi-Identifier, RAG, API Keys, Firecrawl
-- Created: 2026-07-04
-- Batches: Ban avoidance engine, multi-identifier contacts, RAG knowledge base,
--          AI playground, public API keys, Firecrawl audit logging

-- Enable pgvector if available (Supabase has it)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. Multi-identifier columns on contacts
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_username TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bsuid TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_identifier TEXT DEFAULT 'phone';

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_username
  ON contacts(account_id, whatsapp_username)
  WHERE whatsapp_username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_bsuid
  ON contacts(account_id, bsuid)
  WHERE bsuid IS NOT NULL;

-- ============================================================
-- 2. Number warm-up state (per phone_number_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS number_warmup_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  phone_number_id TEXT NOT NULL,
  current_tier INTEGER NOT NULL DEFAULT 1,
  tier_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversations_today INTEGER NOT NULL DEFAULT 0,
  conversations_today_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  quality_rating TEXT NOT NULL DEFAULT 'GREEN',
  quality_rating_updated_at TIMESTAMPTZ DEFAULT now(),
  is_auto_throttled BOOLEAN NOT NULL DEFAULT false,
  marketing_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, phone_number_id)
);

ALTER TABLE number_warmup_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own warmup"
  ON number_warmup_state FOR ALL
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 3. Marketing frequency tracking (per contact)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_frequency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  template_name TEXT,
  template_category TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfl_contact_sent
  ON marketing_frequency_log(account_id, contact_id, sent_at DESC);

ALTER TABLE marketing_frequency_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own frequency"
  ON marketing_frequency_log FOR ALL
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 4. Template block rate tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS template_block_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_blocked INTEGER NOT NULL DEFAULT 0,
  block_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  is_auto_disabled BOOLEAN NOT NULL DEFAULT false,
  disabled_at TIMESTAMPTZ,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, template_name)
);

ALTER TABLE template_block_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own block rates"
  ON template_block_rates FOR ALL
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 5. RAG embeddings for knowledge base
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  knowledge_entry_id UUID NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding VECTOR(1536),
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(knowledge_entry_id, chunk_index)
);

CREATE INDEX idx_ke_account ON knowledge_embeddings(account_id);

ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own embeddings"
  ON knowledge_embeddings FOR ALL
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 6. AI playground sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_playground_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Session',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_playground_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON ai_playground_sessions FOR ALL
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 7. Public API keys
-- ============================================================
CREATE TABLE IF NOT EXISTS public_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(key_hash)
);

ALTER TABLE public_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON public_api_keys FOR ALL
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 8. Firecrawl audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS firecrawl_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID,
  url TEXT NOT NULL,
  action TEXT NOT NULL,
  result_summary TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. RPC Functions for atomic operations
-- ============================================================

-- Increment warmup counter atomically
CREATE OR REPLACE FUNCTION increment_warmup_counter(
  p_account_id UUID,
  p_phone_number_id TEXT
) RETURNS void AS $$
BEGIN
  UPDATE number_warmup_state
  SET conversations_today = conversations_today + 1,
      updated_at = now()
  WHERE account_id = p_account_id
    AND phone_number_id = p_phone_number_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment template send count atomically
CREATE OR REPLACE FUNCTION increment_template_send(
  p_account_id UUID,
  p_template_name TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO template_block_rates (account_id, template_name, total_sent)
  VALUES (p_account_id, p_template_name, 1)
  ON CONFLICT (account_id, template_name)
  DO UPDATE SET total_sent = template_block_rates.total_sent + 1,
               updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record template block
CREATE OR REPLACE FUNCTION record_template_block(
  p_account_id UUID,
  p_template_name TEXT
) RETURNS void AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  INSERT INTO template_block_rates (account_id, template_name, total_blocked)
  VALUES (p_account_id, p_template_name, 1)
  ON CONFLICT (account_id, template_name)
  DO UPDATE SET total_blocked = template_block_rates.total_blocked + 1,
               updated_at = now();

  -- Recalculate block rate
  SELECT CASE WHEN total_sent > 0 THEN total_blocked::NUMERIC / total_sent ELSE 0 END
  INTO v_rate
  FROM template_block_rates
  WHERE account_id = p_account_id AND template_name = p_template_name;

  UPDATE template_block_rates
  SET block_rate = v_rate,
      last_calculated_at = now(),
      is_auto_disabled = (v_rate > 0.015 AND total_sent >= 1000),
      disabled_at = CASE WHEN v_rate > 0.015 AND total_sent >= 1000 THEN now() ELSE disabled_at END
  WHERE account_id = p_account_id AND template_name = p_template_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Match knowledge embeddings via vector similarity
CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
  p_account_id UUID,
  p_embedding VECTOR(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 3
) RETURNS TABLE (
  knowledge_entry_id UUID,
  chunk_text TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.knowledge_entry_id,
    ke.chunk_text,
    (1 - (ke.embedding <=> p_embedding))::FLOAT AS similarity
  FROM knowledge_embeddings ke
  WHERE ke.account_id = p_account_id
    AND 1 - (ke.embedding <=> p_embedding) > p_match_threshold
  ORDER BY ke.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
