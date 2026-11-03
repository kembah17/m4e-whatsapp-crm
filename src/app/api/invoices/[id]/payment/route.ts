import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { recordInvoicePayment, getInvoicePayments } from '@/lib/invoices'

function toErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const body = await request.json()

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }
    if (!body.payment_method) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    const result = await recordInvoicePayment(ctx.accountId, id, {
      amount: Number(body.amount),
      payment_method: body.payment_method,
      payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
      reference: body.reference || undefined,
      notes: body.notes || undefined,
      recorded_by: ctx.userId || undefined,
    })

    return NextResponse.json({ invoice: result })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const payments = await getInvoicePayments(ctx.accountId, id)
    return NextResponse.json({ payments })
  } catch (err) {
    return toErrorResponse(err)
  }
}
