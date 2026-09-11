-- Migration 081: Multi-Tier Inventory Management System
-- Replaces flat stock_movements with double-entry ledger,
-- multi-location hierarchy, batch tracking, suppliers, and stocktake.
-- Date: 2026-09-11

-- ============================================================
-- 0. DROP OLD TABLES & COLUMNS
-- ============================================================

-- Drop old index on products that references columns we're removing
DROP INDEX IF EXISTS idx_products_low_stock;

-- Drop old tables
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;

-- Remove old stock columns from products
ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity;
ALTER TABLE products DROP COLUMN IF EXISTS reorder_point;
ALTER TABLE products DROP COLUMN IF EXISTS reorder_quantity;
ALTER TABLE products DROP COLUMN IF EXISTS track_inventory;
ALTER TABLE products DROP COLUMN IF EXISTS unit_of_measure;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_name;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_phone;
ALTER TABLE products DROP COLUMN IF EXISTS last_restocked_at;

-- Re-add the two columns we still need on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'pieces';
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;

-- ============================================================
-- 1. SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_account ON suppliers(account_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_account" ON suppliers
  FOR ALL USING (is_account_member(account_id));

DROP TRIGGER IF EXISTS set_updated_at ON suppliers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. PRODUCT_SUPPLIERS (many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  supplier_sku TEXT,
  lead_time_days INTEGER,
  min_order_quantity INTEGER,
  unit_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers(supplier_id);

ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
-- RLS via product -> account
CREATE POLICY "product_suppliers_account" ON product_suppliers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_suppliers.product_id
        AND is_account_member(p.account_id)
    )
  );

-- ============================================================
-- 3. STOCK_LOCATIONS (recursive hierarchy)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN (
    'warehouse', 'store', 'zone', 'shelf', 'bin', 'transit', 'virtual'
  )),
  address TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_account ON stock_locations(account_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_parent ON stock_locations(parent_id);

ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_locations_account" ON stock_locations
  FOR ALL USING (is_account_member(account_id));

DROP TRIGGER IF EXISTS set_updated_at ON stock_locations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON stock_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. STOCK_BATCHES (lot/batch tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufactured_date DATE,
  expiry_date DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  cost_price DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, product_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_batches_account ON stock_batches(account_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_product ON stock_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_expiry ON stock_batches(expiry_date)
  WHERE expiry_date IS NOT NULL;

ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_batches_account" ON stock_batches
  FOR ALL USING (is_account_member(account_id));

-- ============================================================
-- 5. LOCATION_STOCK (materialized balances per product per location)
-- ============================================================

CREATE TABLE IF NOT EXISTS location_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_point INTEGER,
  reorder_quantity INTEGER,
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_location_stock_account ON location_stock(account_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_product ON location_stock(account_id, product_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_low
  ON location_stock(quantity_on_hand, reorder_point)
  WHERE reorder_point IS NOT NULL;

ALTER TABLE location_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "location_stock_account" ON location_stock
  FOR ALL USING (is_account_member(account_id));

DROP TRIGGER IF EXISTS set_updated_at ON location_stock;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON location_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. STOCK_LEDGER (double-entry, replaces stock_movements)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'receipt', 'issue', 'transfer_out', 'transfer_in',
    'adjustment', 'return', 'damage', 'count_adjustment'
  )),
  quantity INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  counterpart_id UUID REFERENCES stock_ledger(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
  reference_type TEXT CHECK (reference_type IS NULL OR reference_type IN (
    'purchase_order', 'sale', 'manual', 'count', 'return'
  )),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_account_product
  ON stock_ledger(account_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_location_product
  ON stock_ledger(location_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_counterpart
  ON stock_ledger(counterpart_id)
  WHERE counterpart_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created
  ON stock_ledger(account_id, created_at DESC);

ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_ledger_account" ON stock_ledger
  FOR ALL USING (is_account_member(account_id));

-- ============================================================
-- 7. INVENTORY_COUNTS (physical stocktake)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
  count_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'in_progress', 'completed', 'cancelled'
  )),
  notes TEXT,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_account
  ON inventory_counts(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_location
  ON inventory_counts(location_id);

ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_counts_account" ON inventory_counts
  FOR ALL USING (is_account_member(account_id));

-- ============================================================
-- 8. INVENTORY_COUNT_ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  expected_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  notes TEXT,
  UNIQUE(count_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_count_items_count
  ON inventory_count_items(count_id);

ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;
-- RLS via count -> account
CREATE POLICY "inventory_count_items_account" ON inventory_count_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inventory_counts c
      WHERE c.id = inventory_count_items.count_id
        AND is_account_member(c.account_id)
    )
  );

-- ============================================================
-- DONE
-- ============================================================
