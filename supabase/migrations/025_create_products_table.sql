-- 025_create_products_table.sql
-- Product catalog for customer reactivation campaigns.
-- Each account maintains its own product catalog.

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'discontinued', 'seasonal')),
  category text,
  description text,
  short_pitch text,
  cost decimal(12,2),
  image_url text,
  sku text,
  lead_magnet_eligible boolean DEFAULT false,
  lead_magnet_cost decimal(12,2),
  upsell_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  seasonal_start date,
  seasonal_end date,
  tags text[] DEFAULT '{}',
  ai_generated_fields jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_account_id ON products(account_id);
CREATE INDEX idx_products_category ON products(account_id, category);
CREATE INDEX idx_products_status ON products(account_id, status);
CREATE INDEX idx_products_tags ON products USING GIN(tags);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Any account member can view products
CREATE POLICY products_select ON products FOR SELECT
  USING (is_account_member(account_id));

-- Admin+ can manage products
CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY products_update ON products FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

CREATE POLICY products_delete ON products FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Auto-update updated_at (reuses function from migration 001)
DROP TRIGGER IF EXISTS set_updated_at ON products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
