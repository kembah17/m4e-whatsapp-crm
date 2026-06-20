-- 026_create_purchase_history_table.sql
-- Purchase history records for contacts, enabling RFM analysis
-- and product-based segmentation for reactivation campaigns.

CREATE TABLE IF NOT EXISTS purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  amount decimal(12,2) NOT NULL,
  purchase_date date NOT NULL,
  quantity integer DEFAULT 1,
  channel text,
  notes text,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchases_account_id ON purchase_history(account_id);
CREATE INDEX idx_purchases_contact_id ON purchase_history(account_id, contact_id);
CREATE INDEX idx_purchases_product_id ON purchase_history(account_id, product_id);
CREATE INDEX idx_purchases_date ON purchase_history(account_id, purchase_date DESC);
CREATE INDEX idx_purchases_batch ON purchase_history(import_batch_id)
  WHERE import_batch_id IS NOT NULL;

ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Any account member can view purchase history
CREATE POLICY purchases_select ON purchase_history FOR SELECT
  USING (is_account_member(account_id));

-- Admin+ can manage purchase history
CREATE POLICY purchases_insert ON purchase_history FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY purchases_update ON purchase_history FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

CREATE POLICY purchases_delete ON purchase_history FOR DELETE
  USING (is_account_member(account_id, 'admin'));
