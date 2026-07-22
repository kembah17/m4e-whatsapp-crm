import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { updateNegotiation } from '@/lib/negotiations'
import type { NegotiationOutcome } from '@/types/business-growth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { final_price, outcome, notes } = body
    const negotiation = await updateNegotiation(ctx.accountId, id, {
      final_price: final_price !== undefined ? (final_price !== null ? Number(final_price) : null) : undefined,
      outcome: outcome as NegotiationOutcome | undefined,
      notes,
    })
    return NextResponse.json({ negotiation })
  } catch (err) {
    return toErrorResponse(err)
  }
}
