import { createClient } from '@/lib/supabase/client'
import type {
  StockMovement,
  InventoryAlert,
  MovementType,
} from '@/types/business-growth'

// ============================================================
// Stock Movements
// ============================================================

export interface StockMovementFilters {
  productId?: string
  movementType?: MovementType
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export async function getStockMovements(
  accountId: string,
  filters: StockMovementFilters = {}
): Promise<{ data: StockMovement[]; count: number }> {
  const supabase = createClient()
  let query = supabase
    .from('stock_movements')
    .select('*, product:products(name, sku)', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (filters.productId) query = query.eq('product_id', filters.productId)
  if (filters.movementType) query = query.eq('movement_type', filters.movementType)
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: (data ?? []) as StockMovement[], count: count ?? 0 }
}

export interface RecordMovementData {
  product_id: string
  movement_type: MovementType
  quantity: number
  notes?: string
  branch_id?: string
  reference_type?: string
  reference_id?: string
}

export async function recordStockMovement(
  accountId: string,
  data: RecordMovementData
): Promise<StockMovement> {
  const supabase = createClient()

  // Get current stock
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', data.product_id)
    .eq('account_id', accountId)
    .single()

  if (prodErr) throw prodErr

  const previousQty = product?.stock_quantity ?? 0
  const isAddition = ['restock', 'return'].includes(data.movement_type)
  const newQty = isAddition
    ? previousQty + data.quantity
    : Math.max(0, previousQty - data.quantity)

  // Insert movement
  const { data: movement, error: movErr } = await supabase
    .from('stock_movements')
    .insert({
      account_id: accountId,
      product_id: data.product_id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      previous_quantity: previousQty,
      new_quantity: newQty,
      notes: data.notes ?? null,
      branch_id: data.branch_id ?? null,
      reference_type: data.reference_type ?? null,
      reference_id: data.reference_id ?? null,
    })
    .select()
    .single()

  if (movErr) throw movErr

  // Update product stock
  const updateFields: Record<string, unknown> = {
    stock_quantity: newQty,
    updated_at: new Date().toISOString(),
  }
  if (data.movement_type === 'restock') {
    updateFields.last_restocked_at = new Date().toISOString()
  }

  await supabase
    .from('products')
    .update(updateFields)
    .eq('id', data.product_id)
    .eq('account_id', accountId)

  return movement as StockMovement
}

// ============================================================
// Inventory Alerts
// ============================================================

export async function getInventoryAlerts(
  accountId: string,
  unresolvedOnly = true
): Promise<InventoryAlert[]> {
  const supabase = createClient()
  let query = supabase
    .from('inventory_alerts')
    .select('*, product:products(name, stock_quantity, reorder_point)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (unresolvedOnly) query = query.eq('is_resolved', false)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as InventoryAlert[]
}

export async function resolveAlert(
  alertId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('inventory_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq('id', alertId)
  if (error) throw error
}

export async function checkLowStock(
  accountId: string
): Promise<InventoryAlert[]> {
  const supabase = createClient()

  // Get all tracked products with stock below reorder point
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, stock_quantity, reorder_point')
    .eq('account_id', accountId)
    .eq('track_inventory', true)
    .not('reorder_point', 'is', null)

  if (error) throw error

  const alerts: InventoryAlert[] = []
  for (const p of products ?? []) {
    const qty = p.stock_quantity ?? 0
    const reorder = p.reorder_point ?? 0
    if (qty > reorder) continue

    // Check if unresolved alert already exists
    const { data: existing } = await supabase
      .from('inventory_alerts')
      .select('id')
      .eq('account_id', accountId)
      .eq('product_id', p.id)
      .eq('is_resolved', false)
      .maybeSingle()

    if (existing) continue

    const alertType = qty === 0 ? 'out_of_stock' : 'low_stock'
    const severity = qty === 0 ? 'critical' : 'warning'
    const message = qty === 0
      ? `${p.name} is out of stock`
      : `${p.name} stock (${qty}) is below reorder point (${reorder})`

    const { data: alert, error: alertErr } = await supabase
      .from('inventory_alerts')
      .insert({
        account_id: accountId,
        product_id: p.id,
        alert_type: alertType,
        severity,
        message,
      })
      .select()
      .single()

    if (!alertErr && alert) alerts.push(alert as InventoryAlert)
  }

  return alerts
}

// ============================================================
// Inventory Summary
// ============================================================

export interface InventorySummary {
  totalTrackedProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  unresolvedAlerts: number
}

export async function getInventorySummary(
  accountId: string
): Promise<InventorySummary> {
  const supabase = createClient()

  // Get tracked products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, stock_quantity, reorder_point, price, cost')
    .eq('account_id', accountId)
    .eq('track_inventory', true)

  if (error) throw error

  const prods = products ?? []
  let totalStockValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const p of prods) {
    const qty = p.stock_quantity ?? 0
    const unitValue = p.cost ?? p.price ?? 0
    totalStockValue += qty * unitValue

    if (qty === 0) outOfStockCount++
    else if (p.reorder_point && qty <= p.reorder_point) lowStockCount++
  }

  // Count unresolved alerts
  const { count } = await supabase
    .from('inventory_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('is_resolved', false)

  return {
    totalTrackedProducts: prods.length,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    unresolvedAlerts: count ?? 0,
  }
}
