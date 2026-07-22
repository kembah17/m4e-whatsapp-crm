import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { recordInstallmentPayment } from '@/lib/installments'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin')
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { schedule_entry_id, amount, payment_method, payment_reference, proof_url, notes } = body
    if (!schedule_entry_id || !amount) {
      return NextResponse.json(
        { error: 'schedule_entry_id and amount are required' },
        { status: 400 },
      )
    }

    // Note: id param is the plan_id, but we use schedule_entry_id for the actual payment
    void id // plan_id available for validation if needed
    const result = await recordInstallmentPayment(schedule_entry_id, {
      amount: Number(amount),
      payment_method: payment_method ?? null,
      payment_reference: payment_reference ?? null,
      proof_url: proof_url ?? null,
      notes: notes ?? null,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
