import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getPaymentHistory, recordPayment } from '@/lib/debt'
import type { PaymentMethod } from '@/types/business-growth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const payments = await getPaymentHistory(ctx.accountId, id)
    return NextResponse.json({ payments })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { amount, payment_method, payment_reference, payment_date, proof_url, notes } = body
    if (!amount || !payment_method) {
      return NextResponse.json(
        { error: 'amount and payment_method are required' },
        { status: 400 },
      )
    }

    const payment = await recordPayment(ctx.accountId, id, {
      amount: Number(amount),
      payment_method: payment_method as PaymentMethod,
      payment_reference,
      payment_date,
      proof_url,
      notes,
      created_by: ctx.userId,
    })
    return NextResponse.json({ payment }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
