import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { confirmReceipt } from '@/lib/ai/receipt-scanner'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const {
      action,
      matched_debt_id,
      matched_invoice_id,
      matched_installment_id,
    } = body

    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "confirm" or "reject"' },
        { status: 400 }
      )
    }

    const receipt = await confirmReceipt(
      id,
      account.user_id,
      action,
      matched_debt_id,
      matched_invoice_id,
      matched_installment_id
    )

    return NextResponse.json({ receipt })
  } catch (err) {
    console.error('Receipt confirm error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update receipt' },
      { status: 500 }
    )
  }
}
