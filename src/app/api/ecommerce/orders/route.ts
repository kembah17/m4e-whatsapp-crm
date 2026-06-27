import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/ecommerce/orders
 * List orders with filters.
 */
export async function GET(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10), 100)
    const offset = (page - 1) * limit

    let query = supabase
      .from('ecommerce_orders')
      .select('*, contact:contacts(id, name, phone, email)', { count: 'exact' })
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (paymentStatus) query = query.eq('payment_status', paymentStatus)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%`,
      )
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      orders: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
