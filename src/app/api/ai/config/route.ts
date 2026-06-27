import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/ai/config
 * Get AI chatbot config for current account. Creates default if not exists.
 */
export async function GET() {
  try {
    const { accountId, supabase } = await getCurrentAccount()

    // Try to get existing config
    const { data: existing, error: fetchErr } = await supabase
      .from('ai_chatbot_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (fetchErr) throw fetchErr

    if (existing) {
      return NextResponse.json({ config: existing })
    }

    // Create default config
    const { data: created, error: createErr } = await supabase
      .from('ai_chatbot_config')
      .insert({ account_id: accountId })
      .select()
      .single()

    if (createErr) throw createErr
    return NextResponse.json({ config: created })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * PUT /api/ai/config
 * Update AI chatbot config.
 */
export async function PUT(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const body = await request.json()

    // Whitelist allowed fields
    const allowed: Record<string, unknown> = {}
    const fields = [
      'is_enabled', 'model', 'confidence_threshold', 'max_auto_replies',
      'handoff_message', 'greeting_message', 'system_prompt', 'business_hours',
      'excluded_labels', 'auto_greet_new_contacts', 'fallback_message',
      'max_tokens', 'temperature',
    ]
    for (const f of fields) {
      if (f in body) allowed[f] = body[f]
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Upsert: create if not exists, update if exists
    const { data: existing } = await supabase
      .from('ai_chatbot_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    let data
    let error

    if (existing) {
      const result = await supabase
        .from('ai_chatbot_config')
        .update(allowed)
        .eq('account_id', accountId)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('ai_chatbot_config')
        .insert({ account_id: accountId, ...allowed })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error
    return NextResponse.json({ config: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}
