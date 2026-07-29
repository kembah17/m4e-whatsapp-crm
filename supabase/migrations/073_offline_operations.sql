-- Migration 073: Offline Operations System
-- Offline Payments Ledger + Hybrid Pipeline + Stage Checklists + Deal Activities
-- Date: 2026-07-29
-- Purpose: Enable Nigerian businesses using bank transfers, POS, cash to track
--          everything through the CRM. Add stage checklists, deal activity logging,
--          and offline payment recording with verification workflow.

-- ============================================================
-- A1. Enum: payment_method_type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM (
    'bank_transfer', 'pos', 'cash', 'cheque', 'mobile_transfer', 'online', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- A2. Enum: offline_payment_status
-- ============================================================
DO $$ BEGIN
  CREATE TYPE offline_payment_status AS ENUM (
    'pending', 'verified', 'rejected', 'reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- A3. Enum: stage_type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE stage_type AS ENUM (
    'auto_digital',
    'manual_digital',
    'physical_verification',
    'external_dependent',
    'time_gated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- A4. Enum: checklist_item_type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE checklist_item_type AS ENUM (
    'checkbox', 'document', 'photo', 'sign_off', 'payment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- A5. Enum: activity_type
-- ============================================================
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'note', 'call', 'meeting', 'email_sent', 'whatsapp_sent',
    'stage_change', 'payment_received', 'document_uploaded',
    'task_completed', 'status_change', 'assignment_change', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- A6. Table: offline_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS offline_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Payment details
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_method payment_method_type NOT NULL,
  reference_number TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Verification
  status offline_payment_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  proof_storage_path TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offline_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offline_payments_account" ON offline_payments
  FOR ALL USING (is_account_member(account_id));

CREATE INDEX IF NOT EXISTS idx_offline_payments_account ON offline_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_invoice ON offline_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_deal ON offline_payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_contact ON offline_payments(contact_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_status ON offline_payments(account_id, status);
CREATE INDEX IF NOT EXISTS idx_offline_payments_date ON offline_payments(payment_date DESC);

-- ============================================================
-- A7. Alter pipeline_stages - Add hybrid pipeline columns
-- All columns have safe defaults so existing data is unaffected.
-- ============================================================
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS stage_type stage_type NOT NULL DEFAULT 'manual_digital',
  ADD COLUMN IF NOT EXISTS min_duration_hours INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- A8. Table: stage_checklist_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  item_type checklist_item_type NOT NULL DEFAULT 'checkbox',
  is_required BOOLEAN DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stage_checklist_templates ENABLE ROW LEVEL SECURITY;

-- Join-based RLS: stage -> pipeline -> account
CREATE POLICY "stage_checklist_templates_account" ON stage_checklist_templates
  FOR ALL USING (
    stage_id IN (
      SELECT ps.id FROM pipeline_stages ps
      JOIN pipelines p ON p.id = ps.pipeline_id
      WHERE is_account_member(p.account_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_stage_checklist_stage ON stage_checklist_templates(stage_id, position);

-- ============================================================
-- A9. Table: deal_checklist_completions
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  checklist_template_id UUID NOT NULL REFERENCES stage_checklist_templates(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  proof_url TEXT,
  proof_storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deal_id, checklist_template_id)
);

ALTER TABLE deal_checklist_completions ENABLE ROW LEVEL SECURITY;

-- Join-based RLS: deal -> account
CREATE POLICY "deal_checklist_completions_account" ON deal_checklist_completions
  FOR ALL USING (
    deal_id IN (
      SELECT id FROM deals WHERE is_account_member(account_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_deal_checklist_deal ON deal_checklist_completions(deal_id);

-- ============================================================
-- A10. Table: deal_activities
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- References
  performed_by UUID REFERENCES auth.users(id),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- For stage_change activities
  old_stage_id UUID REFERENCES pipeline_stages(id),
  new_stage_id UUID REFERENCES pipeline_stages(id),
  -- For payment activities
  payment_id UUID REFERENCES offline_payments(id) ON DELETE SET NULL,
  -- Attachments
  attachment_url TEXT,
  attachment_storage_path TEXT,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_activities_account" ON deal_activities
  FOR ALL USING (is_account_member(account_id));

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_activities_account ON deal_activities(account_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_type ON deal_activities(activity_type);

-- ============================================================
-- A11. Trigger: Auto-update invoice on payment verification
-- ============================================================
CREATE OR REPLACE FUNCTION update_invoice_on_payment_verification()
RETURNS trigger AS $$
BEGIN
  -- When payment is verified, add amount to invoice
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET amount_paid = COALESCE(amount_paid, 0) + NEW.amount,
        balance_due = total - (COALESCE(amount_paid, 0) + NEW.amount),
        status = CASE
          WHEN total - (COALESCE(amount_paid, 0) + NEW.amount) <= 0 THEN 'paid'
          WHEN COALESCE(amount_paid, 0) + NEW.amount > 0 THEN 'partial'
          ELSE status
        END,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;

  -- Handle reversal: subtract amount
  IF NEW.status = 'reversed' AND OLD.status = 'verified' AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET amount_paid = GREATEST(0, COALESCE(amount_paid, 0) - NEW.amount),
        balance_due = total - GREATEST(0, COALESCE(amount_paid, 0) - NEW.amount),
        status = CASE
          WHEN GREATEST(0, COALESCE(amount_paid, 0) - NEW.amount) <= 0 THEN 'unpaid'
          ELSE 'partial'
        END,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON offline_payments;
CREATE TRIGGER trg_update_invoice_on_payment
  AFTER UPDATE OF status ON offline_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment_verification();

-- ============================================================
-- A12. Trigger: Auto-log deal stage changes
-- Handles NULL auth.uid() for system-triggered changes.
-- ============================================================
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    INSERT INTO deal_activities (
      deal_id, account_id, activity_type, title,
      old_stage_id, new_stage_id, performed_by
    )
    VALUES (
      NEW.id,
      NEW.account_id,
      'stage_change',
      'Stage changed',
      OLD.stage_id,
      NEW.stage_id,
      NULLIF(auth.uid(), NULL)  -- NULL if system-triggered
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_deal_stage_change ON deals;
CREATE TRIGGER trg_log_deal_stage_change
  AFTER UPDATE OF stage_id ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_stage_change();

-- ============================================================
-- A13. Trigger: Auto-create checklist completions on stage change
-- Uses ON CONFLICT to handle re-entry to a stage.
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_checklist_completions()
RETURNS trigger AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    INSERT INTO deal_checklist_completions (deal_id, checklist_template_id)
    SELECT NEW.id, sct.id
    FROM stage_checklist_templates sct
    WHERE sct.stage_id = NEW.stage_id
    ON CONFLICT (deal_id, checklist_template_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_checklist ON deals;
CREATE TRIGGER trg_auto_create_checklist
  AFTER UPDATE OF stage_id ON deals
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_checklist_completions();

-- ============================================================
-- A14. View: deal_checklist_progress
-- ============================================================
CREATE OR REPLACE VIEW deal_checklist_progress AS
SELECT
  d.id AS deal_id,
  d.stage_id,
  COUNT(sct.id) AS total_items,
  COUNT(sct.id) FILTER (WHERE sct.is_required) AS required_items,
  COUNT(dcc.id) FILTER (WHERE dcc.completed) AS completed_items,
  COUNT(dcc.id) FILTER (WHERE dcc.completed AND sct.is_required) AS required_completed,
  CASE
    WHEN COUNT(sct.id) = 0 THEN 100
    ELSE ROUND(100.0 * COUNT(dcc.id) FILTER (WHERE dcc.completed) / COUNT(sct.id))
  END AS completion_percent,
  BOOL_AND(COALESCE(dcc.completed, false)) FILTER (WHERE sct.is_required) AS all_required_complete
FROM deals d
LEFT JOIN stage_checklist_templates sct ON sct.stage_id = d.stage_id
LEFT JOIN deal_checklist_completions dcc ON dcc.deal_id = d.id AND dcc.checklist_template_id = sct.id
GROUP BY d.id, d.stage_id;

-- ============================================================
-- A15. View: invoice_payment_summary
-- ============================================================
CREATE OR REPLACE VIEW invoice_payment_summary AS
SELECT
  i.id AS invoice_id,
  i.account_id,
  i.total,
  i.amount_paid,
  i.balance_due,
  i.status,
  COALESCE(op.offline_count, 0) AS offline_payment_count,
  COALESCE(op.offline_verified, 0) AS offline_verified_amount,
  COALESCE(op.offline_pending, 0) AS offline_pending_amount,
  COALESCE(pt.online_count, 0) AS online_payment_count,
  COALESCE(pt.online_amount, 0) AS online_payment_amount
FROM invoices i
LEFT JOIN (
  SELECT invoice_id,
    COUNT(*) AS offline_count,
    COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS offline_verified,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS offline_pending
  FROM offline_payments
  GROUP BY invoice_id
) op ON op.invoice_id = i.id
LEFT JOIN (
  SELECT (metadata->>'invoice_id')::uuid AS invoice_id,
    COUNT(*) AS online_count,
    COALESCE(SUM(amount), 0) AS online_amount
  FROM payment_transactions
  WHERE status = 'success'
  GROUP BY (metadata->>'invoice_id')::uuid
) pt ON pt.invoice_id = i.id;

-- ============================================================
-- A16. Storage bucket for payment proofs
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment-proofs', 'payment-proofs', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: account-scoped uploads
CREATE POLICY "payment_proofs_account_scoped" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] LIKE 'account-%'
  );

-- ============================================================
-- A17. Update operational limits (feature_access_config)
-- ============================================================
ALTER TABLE feature_access_config
  ADD COLUMN IF NOT EXISTS max_offline_payments_per_month INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_stage_checklists INTEGER DEFAULT 20;

-- Update get_tier_defaults() to include new limits
CREATE OR REPLACE FUNCTION get_tier_defaults(p_tier TEXT)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'starter' THEN '{
      "max_contacts":500,"max_team_members":2,"max_branches":1,"max_pipelines":1,
      "max_products":50,"max_broadcasts_per_month":500,"max_campaigns":4,
      "max_automations":3,"max_whatsapp_flows":0,"max_ai_chatbot_msgs_per_month":0,
      "max_ai_queries_per_day":10,"max_invoices_per_month":20,
      "max_offline_payments_per_month":50,"max_stage_checklists":20
    }'::jsonb
    WHEN 'professional' THEN '{
      "max_contacts":2000,"max_team_members":5,"max_branches":3,"max_pipelines":3,
      "max_products":200,"max_broadcasts_per_month":2000,"max_campaigns":10,
      "max_automations":10,"max_whatsapp_flows":3,"max_ai_chatbot_msgs_per_month":100,
      "max_ai_queries_per_day":50,"max_invoices_per_month":100,
      "max_offline_payments_per_month":200,"max_stage_checklists":100
    }'::jsonb
    WHEN 'business' THEN '{
      "max_contacts":999999,"max_team_members":999999,"max_branches":999999,"max_pipelines":999999,
      "max_products":999999,"max_broadcasts_per_month":10000,"max_campaigns":14,
      "max_automations":999999,"max_whatsapp_flows":999999,"max_ai_chatbot_msgs_per_month":999999,
      "max_ai_queries_per_day":200,"max_invoices_per_month":500,
      "max_offline_payments_per_month":999999,"max_stage_checklists":999999
    }'::jsonb
    WHEN 'enterprise' THEN '{
      "max_contacts":999999,"max_team_members":999999,"max_branches":999999,"max_pipelines":999999,
      "max_products":999999,"max_broadcasts_per_month":999999,"max_campaigns":999999,
      "max_automations":999999,"max_whatsapp_flows":999999,"max_ai_chatbot_msgs_per_month":999999,
      "max_ai_queries_per_day":999999,"max_invoices_per_month":999999,
      "max_offline_payments_per_month":999999,"max_stage_checklists":999999
    }'::jsonb
    ELSE get_tier_defaults('starter')
  END;
END;
$$;

-- Update auto-provisioning trigger to include new columns
CREATE OR REPLACE FUNCTION auto_provision_feature_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  defaults jsonb;
BEGIN
  defaults := get_tier_defaults(COALESCE(NEW.subscription_tier::text, 'starter'));

  INSERT INTO feature_access_config (
    account_id, current_tier,
    max_contacts, max_team_members, max_branches, max_pipelines, max_products,
    max_broadcasts_per_month, max_campaigns, max_automations,
    max_whatsapp_flows, max_ai_chatbot_msgs_per_month,
    max_ai_queries_per_day, max_invoices_per_month,
    max_offline_payments_per_month, max_stage_checklists
  ) VALUES (
    NEW.id, COALESCE(NEW.subscription_tier::text, 'starter'),
    (defaults->>'max_contacts')::int, (defaults->>'max_team_members')::int,
    (defaults->>'max_branches')::int, (defaults->>'max_pipelines')::int,
    (defaults->>'max_products')::int, (defaults->>'max_broadcasts_per_month')::int,
    (defaults->>'max_campaigns')::int, (defaults->>'max_automations')::int,
    (defaults->>'max_whatsapp_flows')::int, (defaults->>'max_ai_chatbot_msgs_per_month')::int,
    (defaults->>'max_ai_queries_per_day')::int, (defaults->>'max_invoices_per_month')::int,
    (defaults->>'max_offline_payments_per_month')::int, (defaults->>'max_stage_checklists')::int
  ) ON CONFLICT (account_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- A18. Updated_at trigger for offline_payments
-- ============================================================
CREATE OR REPLACE FUNCTION update_offline_payments_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offline_payments_updated_at ON offline_payments;
CREATE TRIGGER trg_offline_payments_updated_at
  BEFORE UPDATE ON offline_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_offline_payments_updated_at();

-- Updated_at trigger for deal_checklist_completions
CREATE OR REPLACE FUNCTION update_deal_checklist_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deal_checklist_updated_at ON deal_checklist_completions;
CREATE TRIGGER trg_deal_checklist_updated_at
  BEFORE UPDATE ON deal_checklist_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_checklist_updated_at();

-- ============================================================
-- DONE: Migration 073 complete
-- New tables: offline_payments, stage_checklist_templates,
--             deal_checklist_completions, deal_activities
-- Altered: pipeline_stages (4 new columns), feature_access_config (2 new columns)
-- New views: deal_checklist_progress, invoice_payment_summary
-- New triggers: invoice update on payment verification,
--              deal stage change logging, auto-create checklists
-- New storage bucket: payment-proofs
-- ============================================================
