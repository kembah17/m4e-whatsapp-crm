import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/ai/logs
 * List AI conversation logs with filters.
 *
 * Query params:
 *   - from: ISO date string (start of range)
 *   - to: ISO date string (end of range)
 *   - contact_id: filter by contact
 *   - intent: filter by detected intent
 *   - handoff: 'true' | 'false' | 'all'
 *   - limit: max results (default 50, max 200)
 *   - offset: pagination offset
 */
export async function GET(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { searchParams } = new URL(request.url)

    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const contactId = searchParams.get('contact_id')
    const intent = searchParams.get('intent')
    const handoff = searchParams.get('handoff')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('ai_conversation_logs')
      .select(`
        *,
        contact:contacts(id, name, phone)
      `, { count: 'exact' })
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (contactId) query = query.eq('contact_id', contactId)
    if (intent) query = query.eq('detected_intent', intent)
    if (handoff === 'true') query = query.eq('was_handed_off', true)
    if (handoff === 'false') query = query.eq('was_handed_off', false)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
