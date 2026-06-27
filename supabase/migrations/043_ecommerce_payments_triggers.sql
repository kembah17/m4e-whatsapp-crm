-- 043_ecommerce_payments_triggers.sql
-- E-commerce integrations, payment providers, and campaign trigger engine
-- Enables Shopify/WooCommerce sync, Paystack/Flutterwave stubs, and event-driven campaigns

-- ============================================================
-- 1. E-Commerce Integrations (Shopify, WooCommerce)
-- ============================================================
CREATE TABLE IF NOT EXISTS ecommerce_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'woocommerce')),
  store_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_token_encrypted TEXT,
  sync_products BOOLEAN DEFAULT true,
  sync_orders BOOLEAN DEFAULT true,
  sync_customers BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ecommerce_integrations_account ON ecommerce_integrations(account_id);
CREATE INDEX idx_ecommerce_integrations_platform ON ecommerce_integrations(account_id, platform);

ALTER TABLE ecommerce_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ecommerce_integrations_select ON ecommerce_integrations FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_integrations_insert ON ecommerce_integrations FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY ecommerce_integrations_update ON ecommerce_integrations FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_integrations_delete ON ecommerce_integrations FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 2. E-Commerce Products (synced from external stores)
-- ============================================================
CREATE TABLE IF NOT EXISTS ecommerce_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES ecommerce_integrations(id) ON DELETE CASCADE,
  external_product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'NGN',
  image_url TEXT,
  inventory_quantity INTEGER,
  variant_id TEXT,
  variant_title TEXT,
  status TEXT DEFAULT 'active',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(integration_id, external_product_id)
);

CREATE INDEX idx_ecommerce_products_account ON ecommerce_products(account_id);
CREATE INDEX idx_ecommerce_products_integration ON ecommerce_products(integration_id);
CREATE INDEX idx_ecommerce_products_status ON ecommerce_products(account_id, status);

ALTER TABLE ecommerce_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY ecommerce_products_select ON ecommerce_products FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_products_insert ON ecommerce_products FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY ecommerce_products_update ON ecommerce_products FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_products_delete ON ecommerce_products FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 3. E-Commerce Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS ecommerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES ecommerce_integrations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  external_order_id TEXT NOT NULL,
  order_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','partially_paid','refunded','failed')),
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled','partial','fulfilled','returned')),
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'NGN',
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB,
  line_items JSONB DEFAULT '[]',
  payment_method TEXT,
  notes TEXT,
  external_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(integration_id, external_order_id)
);

CREATE INDEX idx_ecommerce_orders_account ON ecommerce_orders(account_id);
CREATE INDEX idx_ecommerce_orders_integration ON ecommerce_orders(integration_id);
CREATE INDEX idx_ecommerce_orders_contact ON ecommerce_orders(contact_id);
CREATE INDEX idx_ecommerce_orders_status ON ecommerce_orders(account_id, status);
CREATE INDEX idx_ecommerce_orders_payment ON ecommerce_orders(account_id, payment_status);

ALTER TABLE ecommerce_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY ecommerce_orders_select ON ecommerce_orders FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_orders_insert ON ecommerce_orders FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY ecommerce_orders_update ON ecommerce_orders FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_orders_delete ON ecommerce_orders FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 4. E-Commerce Carts (for abandoned cart recovery)
-- ============================================================
CREATE TABLE IF NOT EXISTS ecommerce_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES ecommerce_integrations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  external_cart_id TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  line_items JSONB DEFAULT '[]',
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'NGN',
  cart_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','recovered','abandoned','completed')),
  abandoned_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(integration_id, external_cart_id)
);

CREATE INDEX idx_ecommerce_carts_account ON ecommerce_carts(account_id);
CREATE INDEX idx_ecommerce_carts_integration ON ecommerce_carts(integration_id);
CREATE INDEX idx_ecommerce_carts_contact ON ecommerce_carts(contact_id);
CREATE INDEX idx_ecommerce_carts_status ON ecommerce_carts(account_id, status);

ALTER TABLE ecommerce_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ecommerce_carts_select ON ecommerce_carts FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_carts_insert ON ecommerce_carts FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY ecommerce_carts_update ON ecommerce_carts FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY ecommerce_carts_delete ON ecommerce_carts FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 5. Payment Providers (Paystack, Flutterwave)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  public_key_encrypted TEXT,
  secret_key_encrypted TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  supported_channels JSONB DEFAULT '["card","bank_transfer","ussd"]'::jsonb,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, provider)
);

CREATE INDEX idx_payment_providers_account ON payment_providers(account_id);

ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_providers_select ON payment_providers FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY payment_providers_insert ON payment_providers FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY payment_providers_update ON payment_providers FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY payment_providers_delete ON payment_providers FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 6. Payment Transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES payment_providers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES ecommerce_orders(id) ON DELETE SET NULL,
  external_reference TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned','reversed')),
  payment_channel TEXT,
  provider_response JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_transactions_account ON payment_transactions(account_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider_id);
CREATE INDEX idx_payment_transactions_contact ON payment_transactions(contact_id);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(account_id, status);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_transactions_select ON payment_transactions FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY payment_transactions_insert ON payment_transactions FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY payment_transactions_update ON payment_transactions FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY payment_transactions_delete ON payment_transactions FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 7. Campaign Triggers (event-driven campaign execution)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  campaign_template_id UUID REFERENCES campaign_templates(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'order_placed','order_shipped','order_delivered','order_cancelled',
    'payment_confirmed','payment_failed',
    'cart_abandoned',
    'contact_birthday','contact_anniversary',
    'purchase_milestone','no_purchase_period',
    'review_requested','referral_made',
    'manual'
  )),
  conditions JSONB DEFAULT '{}',
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_triggers_account ON campaign_triggers(account_id);
CREATE INDEX idx_campaign_triggers_event ON campaign_triggers(account_id, trigger_event);
CREATE INDEX idx_campaign_triggers_template ON campaign_triggers(campaign_template_id);

ALTER TABLE campaign_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_triggers_select ON campaign_triggers FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY campaign_triggers_insert ON campaign_triggers FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY campaign_triggers_update ON campaign_triggers FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY campaign_triggers_delete ON campaign_triggers FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 8. Campaign Executions (queued + sent messages from triggers)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES campaign_triggers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','cancelled')),
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  channel TEXT DEFAULT 'whatsapp',
  message_content JSONB,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_executions_account ON campaign_executions(account_id);
CREATE INDEX idx_campaign_executions_trigger ON campaign_executions(trigger_id);
CREATE INDEX idx_campaign_executions_campaign ON campaign_executions(campaign_id);
CREATE INDEX idx_campaign_executions_contact ON campaign_executions(contact_id);
CREATE INDEX idx_campaign_executions_status ON campaign_executions(account_id, status);
CREATE INDEX idx_campaign_executions_scheduled ON campaign_executions(status, scheduled_for)
  WHERE status = 'queued';

ALTER TABLE campaign_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_executions_select ON campaign_executions FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY campaign_executions_insert ON campaign_executions FOR INSERT
  WITH CHECK (is_account_member(account_id));
CREATE POLICY campaign_executions_update ON campaign_executions FOR UPDATE
  USING (is_account_member(account_id));
CREATE POLICY campaign_executions_delete ON campaign_executions FOR DELETE
  USING (is_account_member(account_id));

-- ============================================================
-- 9. RPC: Increment campaign trigger execution count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_campaign_trigger_count(p_trigger_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaign_triggers
  SET execution_count = execution_count + 1,
      last_executed_at = now(),
      updated_at = now()
  WHERE id = p_trigger_id;
END;
$$;
