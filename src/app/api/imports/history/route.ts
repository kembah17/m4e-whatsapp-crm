import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const db = await createClient()

    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
    const status = url.searchParams.get('status')

    let query = db
      .from('import_sessions')
      .select('*', { count: 'exact' })
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({
      sessions: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
