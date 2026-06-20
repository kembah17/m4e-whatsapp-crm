-- 028_add_product_id_to_deals.sql
-- Link deals to products for product-level pipeline analytics.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_id uuid
  REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_product_id ON deals(product_id)
  WHERE product_id IS NOT NULL;
