-- ============================================================
-- Migration 084: Industry-Aware Product Architecture
-- ============================================================
-- Adds item_type, item_role, and metadata to products table.
-- Creates product_components (BOM) and product_availability tables.
-- Enables flexible product/inventory handling across all 10+ industries.
--
-- Key design principles:
--   1. item_type is NOT locked to industry — any business can use any type
--   2. Industry bundles set DEFAULTS, not restrictions
--   3. A clinic can have pharmacy items; a hotel can have restaurant items
--   4. metadata JSONB stores industry-specific fields without schema changes
--   5. product_components enables BOM (recipe/material tracking)
--   6. product_availability enables date-based booking (rooms, appointments)
--
-- Date: 2026-09-18
-- ============================================================

-- ============================================================
-- 1. ITEM TYPE & ROLE ENUMS
-- ============================================================
-- Using TEXT with CHECK constraints (not ENUMs) for easier extensibility.
-- New item types can be added by altering the CHECK constraint.

-- item_type: WHAT the item fundamentally is
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product'
  CHECK (item_type IN (
    'product',       -- Physical goods for sale (retail, pharmacy, agriculture)
    'service',       -- Services for sale (consulting, delivery, consultation)
    'menu_item',     -- Prepared items for sale (restaurant meals, bar drinks)
    'ingredient',    -- Raw inputs consumed in production/preparation
    'supply',        -- Operational consumables (gloves, packaging, cleaning)
    'asset',         -- Bookable assets (rooms, vehicles, equipment, spaces)
    'programme',     -- Educational programmes, classes, courses
    'property',      -- Unique real estate listings
    'package',       -- Bundled offerings (combo meals, service packages)
    'subscription'   -- Recurring service/product (retainers, memberships)
  ));

-- item_role: HOW the item relates to revenue
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS item_role TEXT NOT NULL DEFAULT 'revenue'
  CHECK (item_role IN (
    'revenue',       -- Directly generates revenue (what you sell to customers)
    'operational',   -- Supports operations (what you consume/use internally)
    'both'           -- Both revenue and operational (pharmacy drugs: sold AND used)
  ));

-- metadata: Industry-specific fields stored as flexible JSONB
-- Examples:
--   Restaurant menu_item: {"prep_time_minutes": 25, "serves": 1, "allergens": ["nuts"], "spice_level": "medium"}
--   Hotel asset:          {"room_count": 5, "max_occupancy": 2, "amenities": ["wifi", "ac", "pool"], "floor": 3}
--   Property:             {"bedrooms": 3, "bathrooms": 2, "sqm": 150, "location": "Lekki Phase 1", "property_type": "flat"}
--   Pharmacy product:     {"dosage_form": "tablet", "strength": "500mg", "nafdac_no": "A4-1234", "controlled": false}
--   Education programme:  {"term": "2026/2027", "class_capacity": 30, "duration_weeks": 12}
--   Agriculture product:  {"grade": "A", "harvest_season": "Oct-Dec", "origin_state": "Ogun"}
--   Manufacturing:        {"material": "polypropylene", "weight_kg": 2.5, "son_certified": true}
--   Logistics service:    {"sla_hours": 24, "coverage_area": "Lagos-Ibadan", "max_weight_kg": 50}
--   Professional service: {"rate_type": "hourly", "practice_area": "tax_advisory", "min_engagement_hours": 10}
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- display_name_override: Allows businesses to customise what items are called
-- e.g., a hotel might call their assets "Room Types" instead of "Assets"
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS display_label TEXT;

-- ============================================================
-- 2. INDEXES FOR NEW COLUMNS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_item_type
  ON products(account_id, item_type);

CREATE INDEX IF NOT EXISTS idx_products_item_role
  ON products(account_id, item_role);

CREATE INDEX IF NOT EXISTS idx_products_type_role
  ON products(account_id, item_type, item_role);

-- GIN index on metadata for JSONB queries
CREATE INDEX IF NOT EXISTS idx_products_metadata
  ON products USING GIN(metadata);

-- ============================================================
-- 3. PRODUCT COMPONENTS (Bill of Materials)
-- ============================================================
-- Links a parent item to its component inputs.
-- Use cases:
--   Restaurant: Jollof Rice → 200g rice + 150g tomatoes + 50ml oil + ...
--   Manufacturing: Plastic Chair → 2kg polypropylene + 4 screws + ...
--   Pharmacy: Compounded medication → Drug A + Drug B + ...
--   Hotel F&B: Cocktail → 60ml gin + 30ml tonic + lime + ice
--   Package: "Family Combo" → Jollof Rice + Chicken + Drink

CREATE TABLE IF NOT EXISTS product_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- The finished/parent item (what you sell)
  parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- The component/input item (what goes into it)
  component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- How much of the component is needed per unit of parent
  quantity_required DECIMAL(12,4) NOT NULL DEFAULT 1.0
    CHECK (quantity_required > 0),

  -- Unit for the quantity (must match component's unit_of_measure ideally)
  unit TEXT NOT NULL DEFAULT 'pieces',

  -- Whether this component is optional (e.g., extra cheese on pizza)
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,

  -- Waste factor: multiplier to account for prep waste (1.0 = no waste, 1.1 = 10% waste)
  waste_factor DECIMAL(5,3) NOT NULL DEFAULT 1.000
    CHECK (waste_factor >= 1.0),

  -- Sort order for display
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Notes (e.g., "use Grade A only", "substitute with palm oil if unavailable")
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate component entries for same parent
  UNIQUE(parent_product_id, component_product_id),

  -- Prevent self-referencing (item can't be its own component)
  CHECK (parent_product_id != component_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_components_parent
  ON product_components(parent_product_id);

CREATE INDEX IF NOT EXISTS idx_product_components_component
  ON product_components(component_product_id);

CREATE INDEX IF NOT EXISTS idx_product_components_account
  ON product_components(account_id);

-- RLS: Account members can view, admins can manage
ALTER TABLE product_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_components_select" ON product_components
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "product_components_insert" ON product_components
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY "product_components_update" ON product_components
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

CREATE POLICY "product_components_delete" ON product_components
  FOR DELETE USING (is_account_member(account_id, 'admin'));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON product_components;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON product_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. PRODUCT AVAILABILITY (Date-Based Booking)
-- ============================================================
-- Tracks availability of bookable assets by date.
-- Use cases:
--   Hotels: Room availability per night (5 Deluxe rooms, 3 booked on Oct 15)
--   Education: Class capacity per term
--   Events: Venue availability per date
--   Logistics: Fleet capacity per day
--   Healthcare: Appointment slots per day

CREATE TABLE IF NOT EXISTS product_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- The bookable asset/service
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- The specific date
  date DATE NOT NULL,

  -- Total capacity for this date (e.g., 5 Deluxe rooms total)
  total_capacity INTEGER NOT NULL DEFAULT 1
    CHECK (total_capacity >= 0),

  -- Currently booked/reserved
  booked INTEGER NOT NULL DEFAULT 0
    CHECK (booked >= 0),

  -- Price override for this specific date (dynamic pricing)
  -- NULL means use the product's base price
  price_override DECIMAL(12,2),

  -- Minimum stay/booking duration (in days, for hotels)
  min_duration INTEGER DEFAULT 1
    CHECK (min_duration >= 1),

  -- Whether this date is blocked (maintenance, renovation, holiday)
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,

  -- Block reason (if blocked)
  block_reason TEXT,

  -- Notes for internal use
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One record per product per date
  UNIQUE(product_id, date),

  -- Can't book more than capacity
  CHECK (booked <= total_capacity)
);

CREATE INDEX IF NOT EXISTS idx_product_availability_product_date
  ON product_availability(product_id, date);

CREATE INDEX IF NOT EXISTS idx_product_availability_account_date
  ON product_availability(account_id, date);

CREATE INDEX IF NOT EXISTS idx_product_availability_available
  ON product_availability(product_id, date)
  WHERE is_blocked = FALSE AND booked < total_capacity;

-- RLS: Account members can view, admins can manage
ALTER TABLE product_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_availability_select" ON product_availability
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "product_availability_insert" ON product_availability
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY "product_availability_update" ON product_availability
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

CREATE POLICY "product_availability_delete" ON product_availability
  FOR DELETE USING (is_account_member(account_id, 'admin'));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON product_availability;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON product_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Get available capacity for a product on a date range
CREATE OR REPLACE FUNCTION get_product_availability(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_capacity INTEGER,
  booked INTEGER,
  available INTEGER,
  price DECIMAL(12,2),
  is_blocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date::DATE,
    COALESCE(pa.total_capacity, 0)::INTEGER,
    COALESCE(pa.booked, 0)::INTEGER,
    (COALESCE(pa.total_capacity, 0) - COALESCE(pa.booked, 0))::INTEGER AS available,
    COALESCE(pa.price_override, p.price) AS price,
    COALESCE(pa.is_blocked, FALSE) AS is_blocked
  FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(date)
  LEFT JOIN product_availability pa
    ON pa.product_id = p_product_id AND pa.date = d.date::DATE
  LEFT JOIN products p ON p.id = p_product_id
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Calculate component cost for a product (BOM cost rollup)
CREATE OR REPLACE FUNCTION get_component_cost(
  p_product_id UUID
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  total_cost DECIMAL(12,2) := 0;
BEGIN
  SELECT COALESCE(SUM(
    pc.quantity_required * pc.waste_factor * COALESCE(comp.cost, comp.price, 0)
  ), 0)
  INTO total_cost
  FROM product_components pc
  JOIN products comp ON comp.id = pc.component_product_id
  WHERE pc.parent_product_id = p_product_id
    AND pc.is_optional = FALSE;

  RETURN total_cost;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a product can be fulfilled based on component stock
-- Returns the maximum number of units that can be produced
CREATE OR REPLACE FUNCTION get_max_producible(
  p_product_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  max_units INTEGER := 2147483647; -- Start with max int
  component RECORD;
BEGIN
  FOR component IN
    SELECT
      pc.component_product_id,
      pc.quantity_required * pc.waste_factor AS qty_needed,
      COALESCE(
        CASE
          WHEN p_location_id IS NOT NULL THEN
            (SELECT ls.quantity_available FROM location_stock ls
             WHERE ls.product_id = pc.component_product_id
               AND ls.location_id = p_location_id)
          ELSE
            (SELECT SUM(ls.quantity_available) FROM location_stock ls
             WHERE ls.product_id = pc.component_product_id
               AND ls.account_id = pc.account_id)
        END,
        0
      ) AS stock_available
    FROM product_components pc
    WHERE pc.parent_product_id = p_product_id
      AND pc.is_optional = FALSE
  LOOP
    IF component.qty_needed > 0 THEN
      max_units := LEAST(max_units, FLOOR(component.stock_available / component.qty_needed)::INTEGER);
    END IF;
  END LOOP;

  -- If no components found, return -1 (no BOM defined)
  IF max_units = 2147483647 THEN
    RETURN -1;
  END IF;

  RETURN max_units;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 6. INDUSTRY ITEM TYPE CONFIGURATION TABLE
-- ============================================================
-- Stores per-account configuration for how item types are labelled
-- and which types are enabled. This allows flexibility:
--   - A hotel can enable menu_item and ingredient types for their bar
--   - A clinic can enable product type for their pharmacy
--   - Labels can be customised ("Room Types" instead of "Assets")

CREATE TABLE IF NOT EXISTS account_item_type_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- The item_type this config applies to
  item_type TEXT NOT NULL,

  -- Whether this type is enabled for this account
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Custom display label (e.g., "Menu Items" instead of default)
  display_label TEXT,

  -- Custom display label for plural (e.g., "Menu Items")
  display_label_plural TEXT,

  -- Icon override (emoji or icon name)
  icon TEXT,

  -- Sort order in UI
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Default metadata schema hint for this type
  -- Helps the form know which metadata fields to show
  metadata_schema JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(account_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_account_item_type_config_account
  ON account_item_type_config(account_id);

ALTER TABLE account_item_type_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_item_type_config_select" ON account_item_type_config
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "account_item_type_config_insert" ON account_item_type_config
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY "account_item_type_config_update" ON account_item_type_config
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

CREATE POLICY "account_item_type_config_delete" ON account_item_type_config
  FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON account_item_type_config;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON account_item_type_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. DATA FIELD MAPPING TABLE
-- ============================================================
-- Stores per-account field mappings for flexible data import.
-- When a client provides a spreadsheet, this table remembers
-- how their column names map to BGE fields.
-- Supports the user's requirement: "easily match their respective
-- databases with relevant industry data specifications"

CREATE TABLE IF NOT EXISTS import_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Name of this mapping profile (e.g., "POS Export", "Shopify Products")
  profile_name TEXT NOT NULL,

  -- Which entity this mapping is for
  entity_type TEXT NOT NULL DEFAULT 'product'
    CHECK (entity_type IN ('product', 'contact', 'purchase_history')),

  -- The actual field mappings: source_column → target_field
  -- Example: {"Item Name": "name", "Selling Price": "price", "Item Group": "category",
  --           "Stock Qty": "stock_quantity", "Cost Price": "cost"}
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Default item_type to assign when importing with this profile
  default_item_type TEXT,

  -- Default item_role to assign
  default_item_role TEXT,

  -- Default metadata template to merge
  default_metadata JSONB DEFAULT '{}'::jsonb,

  -- Whether this is the default mapping for this entity type
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Usage count (for suggesting most-used mappings)
  use_count INTEGER NOT NULL DEFAULT 0,

  -- Last used timestamp
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_field_mappings_account
  ON import_field_mappings(account_id, entity_type);

ALTER TABLE import_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_field_mappings_select" ON import_field_mappings
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "import_field_mappings_insert" ON import_field_mappings
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY "import_field_mappings_update" ON import_field_mappings
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

CREATE POLICY "import_field_mappings_delete" ON import_field_mappings
  FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON import_field_mappings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON import_field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. SET DEFAULTS FOR EXISTING DATA
-- ============================================================
-- All existing products default to item_type='product', item_role='revenue'
-- which is correct for the generic case. No data migration needed.
-- The ALTER TABLE ... DEFAULT clauses above handle this.

-- ============================================================
-- 9. GRANT EXECUTE ON FUNCTIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION get_product_availability(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_component_cost(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_max_producible(UUID, UUID) TO authenticated;
