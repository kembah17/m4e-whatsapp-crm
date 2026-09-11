// ============================================================
// Multi-Tier Inventory Management System - Types
// ============================================================

// --- Location Types ---

export type LocationType = 'warehouse' | 'store' | 'zone' | 'shelf' | 'bin' | 'transit' | 'virtual'

export interface StockLocation {
  id: string
  account_id: string
  parent_id: string | null
  name: string
  location_type: LocationType
  address: string | null
  metadata: Record<string, unknown>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // Virtual fields for tree rendering
  children?: StockLocation[]
  depth?: number
}

export interface CreateLocationInput {
  name: string
  location_type: LocationType
  parent_id?: string | null
  address?: string | null
  metadata?: Record<string, unknown>
  sort_order?: number
}

export interface UpdateLocationInput {
  name?: string
  location_type?: LocationType
  address?: string | null
  metadata?: Record<string, unknown>
  is_active?: boolean
  sort_order?: number
}

// --- Stock Balance Types ---

export interface LocationStock {
  id: string
  account_id: string
  location_id: string
  product_id: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number // generated column
  reorder_point: number | null
  reorder_quantity: number | null
  last_movement_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  product?: { name: string; sku: string | null; price: number }
  location?: { name: string; location_type: LocationType }
}

// --- Ledger Types ---

export type LedgerEntryType =
  | 'receipt'
  | 'issue'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'return'
  | 'damage'
  | 'count_adjustment'

export type ReferenceType = 'purchase_order' | 'sale' | 'manual' | 'count' | 'return'

export interface StockLedgerEntry {
  id: string
  account_id: string
  location_id: string
  product_id: string
  entry_type: LedgerEntryType
  quantity: number
  balance_after: number
  counterpart_id: string | null
  batch_id: string | null
  reference_type: ReferenceType | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  // Joined fields
  product?: { name: string; sku: string | null }
  location?: { name: string; location_type: LocationType }
  batch?: { batch_number: string; expiry_date: string | null }
}

export interface LedgerFilters {
  product_id?: string
  location_id?: string
  entry_type?: LedgerEntryType
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

// --- Batch Types ---

export interface StockBatch {
  id: string
  account_id: string
  product_id: string
  batch_number: string
  manufactured_date: string | null
  expiry_date: string | null
  supplier_id: string | null
  cost_price: number | null
  notes: string | null
  created_at: string
  // Joined fields
  product?: { name: string; sku: string | null }
  supplier?: { name: string }
}

export interface CreateBatchInput {
  product_id: string
  batch_number: string
  manufactured_date?: string | null
  expiry_date?: string | null
  supplier_id?: string | null
  cost_price?: number | null
  notes?: string | null
}

// --- Supplier Types ---

export interface Supplier {
  id: string
  account_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupplierInput {
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  payment_terms?: string | null
  notes?: string | null
}

export interface UpdateSupplierInput {
  name?: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  payment_terms?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface ProductSupplier {
  id: string
  product_id: string
  supplier_id: string
  is_primary: boolean
  supplier_sku: string | null
  lead_time_days: number | null
  min_order_quantity: number | null
  unit_cost: number | null
  created_at: string
  // Joined fields
  supplier?: Supplier
  product?: { name: string; sku: string | null }
}

// --- Inventory Count Types ---

export type CountStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

export interface InventoryCount {
  id: string
  account_id: string
  location_id: string
  count_date: string
  status: CountStatus
  notes: string | null
  started_by: string | null
  completed_at: string | null
  created_at: string
  // Joined fields
  location?: { name: string; location_type: LocationType }
  items?: InventoryCountItem[]
}

export interface CreateCountInput {
  location_id: string
  count_date: string
  notes?: string | null
}

export interface InventoryCountItem {
  id: string
  count_id: string
  product_id: string
  expected_quantity: number
  counted_quantity: number | null
  variance: number | null // generated column
  notes: string | null
  // Joined fields
  product?: { name: string; sku: string | null }
}

export interface UpdateCountItemInput {
  counted_quantity: number
  notes?: string | null
}

// --- Stock Operation Inputs ---

export interface ReceiveStockInput {
  location_id: string
  product_id: string
  quantity: number
  batch_id?: string | null
  notes?: string | null
  reference_type?: ReferenceType | null
  reference_id?: string | null
}

export interface IssueStockInput {
  location_id: string
  product_id: string
  quantity: number
  notes?: string | null
  reference_type?: ReferenceType | null
  reference_id?: string | null
}

export interface TransferStockInput {
  from_location_id: string
  to_location_id: string
  product_id: string
  quantity: number
  notes?: string | null
}

export interface AdjustStockInput {
  location_id: string
  product_id: string
  new_quantity: number
  reason: string
}

// --- Summary Types ---

export interface InventorySummary {
  total_products_tracked: number
  total_stock_value: number
  total_locations: number
  low_stock_count: number
  out_of_stock_count: number
  overstocked_count: number
}

export interface LowStockItem {
  product_id: string
  product_name: string
  product_sku: string | null
  location_id: string
  location_name: string
  quantity_available: number
  reorder_point: number
  reorder_quantity: number | null
}

// --- Industry Preset Types ---

export interface PresetLocation {
  name: string
  type: LocationType
  children?: PresetLocation[]
}

export interface IndustryPreset {
  industry: string
  description: string
  defaultLocations: PresetLocation[]
  defaultCategories: string[]
  unitOfMeasure: string
  reorderDefaults: { point: number; quantity: number }
  batchTrackingEnabled: boolean
  expiryTrackingEnabled: boolean
}

// --- API Response Types ---

export interface StockOperationResult {
  ledger_entry: StockLedgerEntry
  location_stock: LocationStock
}

export interface TransferResult {
  from_entry: StockLedgerEntry
  to_entry: StockLedgerEntry
  from_stock: LocationStock
  to_stock: LocationStock
}
