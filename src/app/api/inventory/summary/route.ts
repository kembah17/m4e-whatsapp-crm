import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// GET /api/inventory/summary - inventory summary stats
export async function GET() {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()

    // Get tracked products
    const { data: products, error } = await admin
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
    const { count } = await admin
      .from('inventory_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_resolved', false)

    return NextResponse.json({
      summary: {
        totalTrackedProducts: prods.length,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        unresolvedAlerts: count ?? 0,
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
