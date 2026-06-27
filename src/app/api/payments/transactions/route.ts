import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/payments/transactions
 * List payment transactions for the current account.
 */
export async function GET(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10), 100)
    const offset = (page - 1) * limit

    let query = supabase
      .from('payment_transactions')
      .select(`
        *,
        provider:payment_providers(id, provider),
        contact:contacts(id, name, phone, email)
      `, { count: 'exact' })
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      transactions: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
