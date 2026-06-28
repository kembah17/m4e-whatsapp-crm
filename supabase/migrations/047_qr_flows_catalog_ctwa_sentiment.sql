-- 047_qr_flows_catalog_ctwa_sentiment.sql
-- QR Code templates, WhatsApp Flows, Catalog Sync, CTWA Leads, Sentiment Analysis

-- Feature 1: QR Code Templates
CREATE TABLE IF NOT EXISTS qr_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  message text,
  fg_color text DEFAULT '#000000',
  bg_color text DEFAULT '#FFFFFF',
  size int DEFAULT 512,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qr_templates_account ON qr_templates(account_id);
ALTER TABLE qr_templates ENABLE ROW LEVEL SECURITY;

-- Feature 2: WhatsApp Flows
CREATE TABLE IF NOT EXISTS whatsapp_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_flow_id text,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','DEPRECATED','BLOCKED','THROTTLED')),
  flow_json jsonb,
  template_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_flows_account ON whatsapp_flows(account_id);
ALTER TABLE whatsapp_flows ENABLE ROW LEVEL SECURITY;

-- Feature 3: Catalog Sync Status
CREATE TABLE IF NOT EXISTS catalog_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  meta_product_id text,
  catalog_id text,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','error','deleted')),
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_catalog_sync_account ON catalog_sync_status(account_id);
CREATE INDEX idx_catalog_sync_product ON catalog_sync_status(product_id);
ALTER TABLE catalog_sync_status ENABLE ROW LEVEL SECURITY;

-- Feature 4: Click-to-WhatsApp Ad Leads
CREATE TABLE IF NOT EXISTS ctwa_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id uuid,
  source_url text,
  source_type text,
  source_id text,
  headline text,
  body text,
  media_type text,
  image_url text,
  ctwa_clid text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ctwa_leads_account ON ctwa_leads(account_id);
CREATE INDEX idx_ctwa_leads_source ON ctwa_leads(account_id, source_id);
ALTER TABLE ctwa_leads ENABLE ROW LEVEL SECURITY;

-- Feature 5: Message Sentiments
CREATE TABLE IF NOT EXISTS message_sentiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message_id uuid,
  conversation_id uuid,
  contact_id uuid,
  sentiment text NOT NULL CHECK (sentiment IN ('positive','neutral','negative','urgent')),
  score numeric NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  keywords text[] DEFAULT '{}',
  suggested_action text,
  analyzed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sentiments_account_sentiment ON message_sentiments(account_id, sentiment);
CREATE INDEX idx_sentiments_conversation ON message_sentiments(conversation_id);
ALTER TABLE message_sentiments ENABLE ROW LEVEL SECURITY;
