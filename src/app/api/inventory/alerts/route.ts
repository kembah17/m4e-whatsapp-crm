import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// GET /api/inventory/alerts - list unresolved alerts
export async function GET() {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('inventory_alerts')
      .select('*, product:products(name, stock_quantity, reorder_point)')
      .eq('account_id', accountId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ alerts: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// PUT /api/inventory/alerts - resolve an alert
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await getCurrentAccount()
    const admin = supabaseAdmin()
    const body = await req.json()

    const { alert_id } = body
    if (!alert_id) {
      return NextResponse.json({ error: 'alert_id is required' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('inventory_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
      })
      .eq('id', alert_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ alert: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}
