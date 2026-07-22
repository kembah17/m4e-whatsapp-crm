import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getNegotiations, createNegotiation } from '@/lib/negotiations'
import type { NegotiationOutcome } from '@/types/business-growth'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const contact_id = searchParams.get('contact_id') || undefined
    const product_id = searchParams.get('product_id') || undefined
    const outcome = searchParams.get('outcome') as NegotiationOutcome | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getNegotiations(ctx.accountId, {
      contact_id,
      product_id,
      outcome: outcome ?? undefined,
      limit,
      offset,
    })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { contact_id, product_id, original_price, offered_price, final_price, outcome, channel, notes } = body
    if (!contact_id || !original_price || !offered_price) {
      return NextResponse.json(
        { error: 'contact_id, original_price, and offered_price are required' },
        { status: 400 },
      )
    }

    const negotiation = await createNegotiation(ctx.accountId, {
      contact_id,
      product_id: product_id ?? null,
      original_price: Number(original_price),
      offered_price: Number(offered_price),
      final_price: final_price ? Number(final_price) : null,
      outcome: outcome as NegotiationOutcome | undefined,
      channel: channel ?? null,
      notes: notes ?? null,
      created_by: ctx.userId,
    })
    return NextResponse.json({ negotiation }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
