import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// GET /api/contacts/trust-score - get trust score config for account
export async function GET() {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('trust_score_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ config: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// PUT /api/contacts/trust-score - update trust score config
export async function PUT(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()
    const body = await req.json()

    const allowedFields = [
      'weight_payment_speed',
      'weight_order_frequency',
      'weight_order_value',
      'weight_communication',
      'weight_referrals',
      'weight_returns',
      'weight_loyalty',
      'high_trust_threshold',
      'low_trust_threshold',
      'auto_recalculate',
      'recalculate_interval_days',
    ] as const

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Upsert
    const { data: existing } = await admin
      .from('trust_score_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    let config
    if (existing) {
      const { data, error } = await admin
        .from('trust_score_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('account_id', accountId)
        .select()
        .single()
      if (error) throw error
      config = data
    } else {
      const { data, error } = await admin
        .from('trust_score_config')
        .insert({ account_id: accountId, ...updates })
        .select()
        .single()
      if (error) throw error
      config = data
    }

    return NextResponse.json({ config })
  } catch (err) {
    return toErrorResponse(err)
  }
}
