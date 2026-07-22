import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/contacts/[id]/trust-score - get trust score + history for contact
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()
    const { id: contactId } = await context.params

    // Get contact trust score
    const { data: contact, error: contactErr } = await admin
      .from('contacts')
      .select('id, name, trust_score, trust_score_updated_at')
      .eq('id', contactId)
      .eq('account_id', accountId)
      .single()

    if (contactErr) throw contactErr

    // Get history
    const { data: history, error: histErr } = await admin
      .from('trust_score_history')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (histErr) throw histErr

    return NextResponse.json({
      trust_score: contact?.trust_score ?? 0,
      trust_score_updated_at: contact?.trust_score_updated_at ?? null,
      history: history ?? [],
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/contacts/[id]/trust-score - trigger recalculation
export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()
    const { id: contactId } = await context.params

    // Verify contact belongs to account
    const { data: contact, error: contactErr } = await admin
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('account_id', accountId)
      .single()

    if (contactErr || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Call RPC to recalculate
    const { data: newScore, error: rpcErr } = await admin.rpc(
      'recalculate_trust_score',
      { p_account_id: accountId, p_contact_id: contactId }
    )

    if (rpcErr) throw rpcErr

    return NextResponse.json({ trust_score: newScore ?? 0 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
