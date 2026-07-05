-- Migration 058: RAG settings, vector monitoring, knowledge limits, contact merge support
-- Features: RAG Model Switcher, Vector Storage Monitoring, Knowledge Entry Limits, Firecrawl Rate Limiting

-- ============================================================
-- RAG settings table (per-account)
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  embedding_model TEXT NOT NULL DEFAULT 'openai/text-embedding-3-small',
  embedding_dimensions INTEGER NOT NULL DEFAULT 1536,
  similarity_threshold NUMERIC(3,2) DEFAULT 0.70,
  max_results INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);
ALTER TABLE rag_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rag_settings_admin" ON rag_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
);

-- ============================================================
-- Global RAG settings (super-admin level, singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS global_rag_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_model TEXT NOT NULL DEFAULT 'openai/text-embedding-3-small',
  active_dimensions INTEGER NOT NULL DEFAULT 1536,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE global_rag_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_rag_super_admin" ON global_rag_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
);
INSERT INTO global_rag_settings (id, active_model, active_dimensions)
VALUES (1, 'openai/text-embedding-3-small', 1536)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Pricing tier and knowledge limits on accounts
-- ============================================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pricing_tier TEXT DEFAULT 'starter';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS knowledge_entry_limit INTEGER DEFAULT 100;

-- ============================================================
-- RPC for vector storage stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_vector_storage_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_rows', (SELECT count(*) FROM knowledge_embeddings),
    'total_accounts', (SELECT count(DISTINCT account_id) FROM knowledge_embeddings),
    'estimated_size_mb', ROUND((SELECT count(*) FROM knowledge_embeddings) * 12.7 / 1024, 2),
    'free_tier_pct', ROUND((SELECT count(*) FROM knowledge_embeddings) * 12.7 / 1024 / 150 * 100, 1),
    'per_account', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          ke.account_id,
          a.name as account_name,
          count(*) as embedding_count,
          ROUND(count(*) * 12.7 / 1024, 2) as estimated_mb
        FROM knowledge_embeddings ke
        JOIN accounts a ON a.id = ke.account_id
        GROUP BY ke.account_id, a.name
        ORDER BY count(*) DESC
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;
