-- ============================================================
-- 036_multi_branch_support.sql
--
-- Adds branch/location support within a single client account.
-- Branches are optional — accounts without branches continue
-- to work exactly as before (branch_id = NULL everywhere).
--
-- Idempotent. No data loss.
-- ============================================================

-- 1) Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_account
  ON branches (account_id) WHERE is_active = true;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_select ON branches;
CREATE POLICY branches_select ON branches FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS branches_insert ON branches;
CREATE POLICY branches_insert ON branches FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS branches_update ON branches;
CREATE POLICY branches_update ON branches FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS branches_delete ON branches;
CREATE POLICY branches_delete ON branches FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON branches;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Add branch_id to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS branch_id UUID
  REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_branch
  ON contacts (account_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- 3) Add branch_id to deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS branch_id UUID
  REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_branch
  ON deals (branch_id)
  WHERE branch_id IS NOT NULL;

-- 4) Add branch_id to purchase_history
ALTER TABLE purchase_history
  ADD COLUMN IF NOT EXISTS branch_id UUID
  REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_branch
  ON purchase_history (account_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- 5) Add branch_id to broadcasts (target branch)
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS branch_id UUID
  REFERENCES branches(id) ON DELETE SET NULL;

-- 6) RPC: Get branch metrics summary
CREATE OR REPLACE FUNCTION get_branch_metrics(
  p_account_id UUID,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  branch_id UUID,
  branch_name TEXT,
  contact_count BIGINT,
  deal_count BIGINT,
  deal_value NUMERIC,
  purchase_count BIGINT,
  purchase_value NUMERIC,
  avg_completeness NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id AS branch_id,
    b.name AS branch_name,
    COALESCE(c.cnt, 0) AS contact_count,
    COALESCE(d.cnt, 0) AS deal_count,
    COALESCE(d.total_value, 0) AS deal_value,
    COALESCE(p.cnt, 0) AS purchase_count,
    COALESCE(p.total_value, 0) AS purchase_value,
    COALESCE(c.avg_score, 0) AS avg_completeness
  FROM branches b
  LEFT JOIN (
    SELECT branch_id,
           COUNT(*) AS cnt,
           AVG(data_completeness_score)::NUMERIC(5,1) AS avg_score
    FROM contacts
    WHERE account_id = p_account_id
    GROUP BY branch_id
  ) c ON c.branch_id = b.id
  LEFT JOIN (
    SELECT branch_id,
           COUNT(*) AS cnt,
           SUM(value) AS total_value
    FROM deals
    WHERE pipeline_id IN (
      SELECT id FROM pipelines WHERE account_id = p_account_id
    )
    GROUP BY branch_id
  ) d ON d.branch_id = b.id
  LEFT JOIN (
    SELECT branch_id,
           COUNT(*) AS cnt,
           SUM(amount) AS total_value
    FROM purchase_history
    WHERE account_id = p_account_id
    GROUP BY branch_id
  ) p ON p.branch_id = b.id
  WHERE b.account_id = p_account_id
    AND b.is_active = true
    AND (p_branch_id IS NULL OR b.id = p_branch_id)
  ORDER BY b.name;
$$;

ALTER FUNCTION get_branch_metrics(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_branch_metrics(UUID, UUID) TO authenticated;
