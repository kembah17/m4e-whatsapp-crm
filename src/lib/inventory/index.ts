// ============================================================
// Multi-Tier Inventory Management System - Library v2
// Double-entry ledger, multi-location, batch tracking
// ============================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  StockLocation,
  CreateLocationInput,
  UpdateLocationInput,
  LocationStock,
  StockLedgerEntry,
  LedgerEntryType,
  LedgerFilters,
  ReferenceType,
  StockBatch,
  CreateBatchInput,
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  ReceiveStockInput,
  IssueStockInput,
  TransferStockInput,
  AdjustStockInput,
  StockOperationResult,
  TransferResult,
  InventorySummary,
  LowStockItem,
  InventoryCount,
  CreateCountInput,
  InventoryCountItem,
  UpdateCountItemInput,
} from '@/types/inventory'

// ============================================================
// Location Management
// ============================================================

/**
 * Fetch all locations for an account and return as a tree.
 */
export async function getLocations(accountId: string): Promise<StockLocation[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('stock_locations')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return buildLocationTree(data ?? [])
}

/** Build a nested tree from flat location rows. */
function buildLocationTree(flat: StockLocation[]): StockLocation[] {
  const map = new Map<string, StockLocation>()
  const roots: StockLocation[] = []

  for (const loc of flat) {
    map.set(loc.id, { ...loc, children: [] })
  }

  for (const loc of flat) {
    const node = map.get(loc.id)!
    if (loc.parent_id && map.has(loc.parent_id)) {
      map.get(loc.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/** Get a flat list of all locations (no tree). */
export async function getLocationsFlat(accountId: string): Promise<StockLocation[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('stock_locations')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createLocation(
  accountId: string,
  input: CreateLocationInput
): Promise<StockLocation> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('stock_locations')
    .insert({
      account_id: accountId,
      name: input.name,
      location_type: input.location_type,
      parent_id: input.parent_id ?? null,
      address: input.address ?? null,
      metadata: input.metadata ?? {},
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLocation(
  locationId: string,
  input: UpdateLocationInput
): Promise<StockLocation> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('stock_locations')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLocation(locationId: string): Promise<void> {
  const admin = supabaseAdmin()

  // Check for stock at this location
  const { count } = await admin
    .from('location_stock')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .gt('quantity_on_hand', 0)

  if (count && count > 0) {
    throw new Error('Cannot delete location with existing stock. Transfer or adjust stock first.')
  }

  // Check for child locations
  const { count: childCount } = await admin
    .from('stock_locations')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', locationId)

  if (childCount && childCount > 0) {
    throw new Error('Cannot delete location with child locations. Remove children first.')
  }

  const { error } = await admin
    .from('stock_locations')
    .delete()
    .eq('id', locationId)

  if (error) throw error
}

// ============================================================
// Stock Operations (Double-Entry Ledger)
// ============================================================

/**
 * Helper: read current balance from location_stock, defaulting to 0.
 */
async function getCurrentBalance(
  accountId: string,
  locationId: string,
  productId: string
): Promise<{ on_hand: number; reserved: number; stockRowExists: boolean }> {
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('location_stock')
    .select('quantity_on_hand, quantity_reserved')
    .eq('account_id', accountId)
    .eq('location_id', locationId)
    .eq('product_id', productId)
    .maybeSingle()

  if (!data) return { on_hand: 0, reserved: 0, stockRowExists: false }
  return {
    on_hand: data.quantity_on_hand,
    reserved: data.quantity_reserved,
    stockRowExists: true,
  }
}

/**
 * Helper: upsert location_stock after a ledger entry.
 */
async function upsertLocationStock(
  accountId: string,
  locationId: string,
  productId: string,
  newOnHand: number,
  reserved?: number
): Promise<LocationStock> {
  const admin = supabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('location_stock')
    .upsert(
      {
        account_id: accountId,
        location_id: locationId,
        product_id: productId,
        quantity_on_hand: newOnHand,
        ...(reserved !== undefined ? { quantity_reserved: reserved } : {}),
        last_movement_at: now,
        updated_at: now,
      },
      { onConflict: 'location_id,product_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Helper: insert a ledger entry.
 */
async function insertLedgerEntry(
  accountId: string,
  locationId: string,
  productId: string,
  entryType: LedgerEntryType,
  quantity: number,
  balanceAfter: number,
  opts: {
    counterpartId?: string | null
    batchId?: string | null
    referenceType?: ReferenceType | null
    referenceId?: string | null
    notes?: string | null
    createdBy?: string | null
  } = {}
): Promise<StockLedgerEntry> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('stock_ledger')
    .insert({
      account_id: accountId,
      location_id: locationId,
      product_id: productId,
      entry_type: entryType,
      quantity,
      balance_after: balanceAfter,
      counterpart_id: opts.counterpartId ?? null,
      batch_id: opts.batchId ?? null,
      reference_type: opts.referenceType ?? null,
      reference_id: opts.referenceId ?? null,
      notes: opts.notes ?? null,
      created_by: opts.createdBy ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Receive stock into a location (purchase, return, etc.).
 */
export async function receiveStock(
  accountId: string,
  userId: string,
  input: ReceiveStockInput
): Promise<StockOperationResult> {
  const { location_id, product_id, quantity, batch_id, notes, reference_type, reference_id } = input

  if (quantity <= 0) throw new Error('Quantity must be positive')

  const balance = await getCurrentBalance(accountId, location_id, product_id)
  const newOnHand = balance.on_hand + quantity

  const ledgerEntry = await insertLedgerEntry(
    accountId, location_id, product_id,
    'receipt', quantity, newOnHand,
    { batchId: batch_id, referenceType: reference_type, referenceId: reference_id, notes, createdBy: userId }
  )

  const locationStock = await upsertLocationStock(accountId, location_id, product_id, newOnHand)

  return { ledger_entry: ledgerEntry, location_stock: locationStock }
}

/**
 * Issue stock from a location (sale, damage, etc.).
 */
export async function issueStock(
  accountId: string,
  userId: string,
  input: IssueStockInput
): Promise<StockOperationResult> {
  const { location_id, product_id, quantity, notes, reference_type, reference_id } = input

  if (quantity <= 0) throw new Error('Quantity must be positive')

  const balance = await getCurrentBalance(accountId, location_id, product_id)
  const available = balance.on_hand - balance.reserved

  if (quantity > available) {
    throw new Error(
      `Insufficient stock. Available: ${available}, Requested: ${quantity}`
    )
  }

  const newOnHand = balance.on_hand - quantity

  const ledgerEntry = await insertLedgerEntry(
    accountId, location_id, product_id,
    'issue', -quantity, newOnHand,
    { referenceType: reference_type, referenceId: reference_id, notes, createdBy: userId }
  )

  const locationStock = await upsertLocationStock(accountId, location_id, product_id, newOnHand)

  return { ledger_entry: ledgerEntry, location_stock: locationStock }
}

/**
 * Transfer stock between two locations (creates paired entries).
 */
export async function transferStock(
  accountId: string,
  userId: string,
  input: TransferStockInput
): Promise<TransferResult> {
  const { from_location_id, to_location_id, product_id, quantity, notes } = input

  if (quantity <= 0) throw new Error('Quantity must be positive')
  if (from_location_id === to_location_id) throw new Error('Source and destination must differ')

  // Check source balance
  const fromBalance = await getCurrentBalance(accountId, from_location_id, product_id)
  const available = fromBalance.on_hand - fromBalance.reserved

  if (quantity > available) {
    throw new Error(
      `Insufficient stock at source. Available: ${available}, Requested: ${quantity}`
    )
  }

  const toBalance = await getCurrentBalance(accountId, to_location_id, product_id)

  const newFromOnHand = fromBalance.on_hand - quantity
  const newToOnHand = toBalance.on_hand + quantity

  // Insert transfer_out entry
  const fromEntry = await insertLedgerEntry(
    accountId, from_location_id, product_id,
    'transfer_out', -quantity, newFromOnHand,
    { referenceType: 'manual', notes: notes ?? `Transfer to location`, createdBy: userId }
  )

  // Insert transfer_in entry with counterpart
  const toEntry = await insertLedgerEntry(
    accountId, to_location_id, product_id,
    'transfer_in', quantity, newToOnHand,
    { counterpartId: fromEntry.id, referenceType: 'manual', notes: notes ?? `Transfer from location`, createdBy: userId }
  )

  // Update the from entry with counterpart
  const admin = supabaseAdmin()
  await admin
    .from('stock_ledger')
    .update({ counterpart_id: toEntry.id })
    .eq('id', fromEntry.id)

  // Update both location_stock rows
  const fromStock = await upsertLocationStock(accountId, from_location_id, product_id, newFromOnHand)
  const toStock = await upsertLocationStock(accountId, to_location_id, product_id, newToOnHand)

  return {
    from_entry: { ...fromEntry, counterpart_id: toEntry.id },
    to_entry: toEntry,
    from_stock: fromStock,
    to_stock: toStock,
  }
}

/**
 * Adjust stock to a specific quantity (physical count correction).
 */
export async function adjustStock(
  accountId: string,
  userId: string,
  input: AdjustStockInput
): Promise<StockOperationResult> {
  const { location_id, product_id, new_quantity, reason } = input

  if (new_quantity < 0) throw new Error('Quantity cannot be negative')

  const balance = await getCurrentBalance(accountId, location_id, product_id)
  const diff = new_quantity - balance.on_hand

  if (diff === 0) {
    throw new Error('New quantity is the same as current quantity')
  }

  const ledgerEntry = await insertLedgerEntry(
    accountId, location_id, product_id,
    'adjustment', diff, new_quantity,
    { referenceType: 'manual', notes: reason, createdBy: userId }
  )

  const locationStock = await upsertLocationStock(accountId, location_id, product_id, new_quantity)

  return { ledger_entry: ledgerEntry, location_stock: locationStock }
}

// ============================================================
// Queries
// ============================================================

/** Get all locations holding a specific product. */
export async function getStockByProduct(
  accountId: string,
  productId: string
): Promise<LocationStock[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('location_stock')
    .select('*, location:stock_locations(name, location_type)')
    .eq('account_id', accountId)
    .eq('product_id', productId)
    .order('quantity_on_hand', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Get all products at a specific location. */
export async function getStockByLocation(
  accountId: string,
  locationId: string
): Promise<LocationStock[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('location_stock')
    .select('*, product:products(name, sku, price)')
    .eq('account_id', accountId)
    .eq('location_id', locationId)
    .order('quantity_on_hand', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Get all stock across all locations for an account. */
export async function getAllStock(
  accountId: string
): Promise<LocationStock[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('location_stock')
    .select('*, product:products(name, sku, price), location:stock_locations(name, location_type)')
    .eq('account_id', accountId)
    .order('quantity_on_hand', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Get paginated ledger entries with filters. */
export async function getStockLedger(
  accountId: string,
  filters: LedgerFilters = {}
): Promise<{ entries: StockLedgerEntry[]; total: number }> {
  const admin = supabaseAdmin()
  const limit = Math.min(filters.limit ?? 50, 100)
  const offset = filters.offset ?? 0

  let query = admin
    .from('stock_ledger')
    .select(
      '*, product:products(name, sku), location:stock_locations(name, location_type)',
      { count: 'exact' }
    )
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (filters.product_id) query = query.eq('product_id', filters.product_id)
  if (filters.location_id) query = query.eq('location_id', filters.location_id)
  if (filters.entry_type) query = query.eq('entry_type', filters.entry_type)
  if (filters.date_from) query = query.gte('created_at', filters.date_from)
  if (filters.date_to) query = query.lte('created_at', filters.date_to)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { entries: data ?? [], total: count ?? 0 }
}

/** Get inventory summary for dashboard. */
export async function getInventorySummary(
  accountId: string
): Promise<InventorySummary> {
  const admin = supabaseAdmin()

  // Count tracked products
  const { count: trackedCount } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('track_inventory', true)

  // Count locations
  const { count: locationCount } = await admin
    .from('stock_locations')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('is_active', true)

  // Get stock with reorder info
  const { data: stockRows } = await admin
    .from('location_stock')
    .select('quantity_on_hand, quantity_reserved, reorder_point, product:products(price)')
    .eq('account_id', accountId)

  let totalValue = 0
  let lowStock = 0
  let outOfStock = 0
  let overstocked = 0

  for (const row of stockRows ?? []) {
    const price = (row.product as unknown as { price: number })?.price ?? 0
    totalValue += row.quantity_on_hand * price

    const available = row.quantity_on_hand - (row.quantity_reserved ?? 0)
    if (available <= 0) {
      outOfStock++
    } else if (row.reorder_point && available <= row.reorder_point) {
      lowStock++
    } else if (row.reorder_point && available > row.reorder_point * 5) {
      overstocked++
    }
  }

  return {
    total_products_tracked: trackedCount ?? 0,
    total_stock_value: totalValue,
    total_locations: locationCount ?? 0,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
    overstocked_count: overstocked,
  }
}

/** Get items below reorder point. */
export async function getLowStockItems(
  accountId: string
): Promise<LowStockItem[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('location_stock')
    .select(
      'product_id, location_id, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, product:products(name, sku), location:stock_locations(name)'
    )
    .eq('account_id', accountId)
    .not('reorder_point', 'is', null)

  if (error) throw error

  return (data ?? [])
    .filter((row) => {
      const available = row.quantity_on_hand - (row.quantity_reserved ?? 0)
      return row.reorder_point !== null && available <= row.reorder_point
    })
    .map((row) => ({
      product_id: row.product_id,
      product_name: (row.product as unknown as { name: string })?.name ?? '',
      product_sku: (row.product as unknown as { sku: string | null })?.sku ?? null,
      location_id: row.location_id,
      location_name: (row.location as unknown as { name: string })?.name ?? '',
      quantity_available: row.quantity_on_hand - (row.quantity_reserved ?? 0),
      reorder_point: row.reorder_point!,
      reorder_quantity: row.reorder_quantity,
    }))
}

// ============================================================
// Batch Management
// ============================================================

export async function getBatches(
  accountId: string,
  productId?: string
): Promise<StockBatch[]> {
  const admin = supabaseAdmin()
  let query = admin
    .from('stock_batches')
    .select('*, product:products(name, sku), supplier:suppliers(name)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (productId) query = query.eq('product_id', productId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createBatch(
  accountId: string,
  input: CreateBatchInput
): Promise<StockBatch> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('stock_batches')
    .insert({
      account_id: accountId,
      product_id: input.product_id,
      batch_number: input.batch_number,
      manufactured_date: input.manufactured_date ?? null,
      expiry_date: input.expiry_date ?? null,
      supplier_id: input.supplier_id ?? null,
      cost_price: input.cost_price ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Supplier Management
// ============================================================

export async function getSuppliers(accountId: string): Promise<Supplier[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('suppliers')
    .select('*')
    .eq('account_id', accountId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createSupplier(
  accountId: string,
  input: CreateSupplierInput
): Promise<Supplier> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('suppliers')
    .insert({
      account_id: accountId,
      name: input.name,
      contact_name: input.contact_name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      payment_terms: input.payment_terms ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSupplier(
  supplierId: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('suppliers')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supplierId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  const admin = supabaseAdmin()

  // Check for linked products
  const { count } = await admin
    .from('product_suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', supplierId)

  if (count && count > 0) {
    throw new Error('Cannot delete supplier linked to products. Remove product links first.')
  }

  const { error } = await admin
    .from('suppliers')
    .delete()
    .eq('id', supplierId)

  if (error) throw error
}

// ============================================================
// Inventory Counts (Physical Stocktake)
// ============================================================

export async function getInventoryCounts(
  accountId: string
): Promise<InventoryCount[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('inventory_counts')
    .select('*, location:stock_locations(name, location_type)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createInventoryCount(
  accountId: string,
  userId: string,
  input: CreateCountInput
): Promise<InventoryCount> {
  const admin = supabaseAdmin()

  // Create the count header
  const { data: count, error: countErr } = await admin
    .from('inventory_counts')
    .insert({
      account_id: accountId,
      location_id: input.location_id,
      count_date: input.count_date,
      status: 'draft',
      notes: input.notes ?? null,
      started_by: userId,
    })
    .select()
    .single()

  if (countErr) throw countErr

  // Pre-populate count items from current stock at this location
  const { data: stockRows } = await admin
    .from('location_stock')
    .select('product_id, quantity_on_hand')
    .eq('account_id', accountId)
    .eq('location_id', input.location_id)

  if (stockRows && stockRows.length > 0) {
    const items = stockRows.map((row) => ({
      count_id: count.id,
      product_id: row.product_id,
      expected_quantity: row.quantity_on_hand,
    }))

    await admin.from('inventory_count_items').insert(items)
  }

  return count
}

export async function getInventoryCount(
  countId: string
): Promise<InventoryCount & { items: InventoryCountItem[] }> {
  const admin = supabaseAdmin()

  const { data: count, error: countErr } = await admin
    .from('inventory_counts')
    .select('*, location:stock_locations(name, location_type)')
    .eq('id', countId)
    .single()

  if (countErr) throw countErr

  const { data: items, error: itemsErr } = await admin
    .from('inventory_count_items')
    .select('*, product:products(name, sku)')
    .eq('count_id', countId)
    .order('product_id')

  if (itemsErr) throw itemsErr

  return { ...count, items: items ?? [] }
}

export async function updateCountItem(
  itemId: string,
  input: UpdateCountItemInput
): Promise<InventoryCountItem> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('inventory_count_items')
    .update({
      counted_quantity: input.counted_quantity,
      notes: input.notes ?? null,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Finalize a count: apply variances as stock adjustments.
 */
export async function finalizeCount(
  countId: string,
  accountId: string,
  userId: string
): Promise<void> {
  const admin = supabaseAdmin()

  const countData = await getInventoryCount(countId)
  if (countData.status === 'completed') throw new Error('Count already completed')
  if (countData.status === 'cancelled') throw new Error('Count was cancelled')

  // Apply adjustments for items with variance
  for (const item of countData.items) {
    if (item.counted_quantity === null) continue
    if (item.counted_quantity === item.expected_quantity) continue

    await adjustStock(accountId, userId, {
      location_id: countData.location_id,
      product_id: item.product_id,
      new_quantity: item.counted_quantity,
      reason: `Physical count adjustment (Count #${countId.slice(0, 8)})`,
    })
  }

  // Mark count as completed
  await admin
    .from('inventory_counts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', countId)
}
