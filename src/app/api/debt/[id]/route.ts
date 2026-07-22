import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getDebtEntry, updateDebtEntry, deleteDebtEntry, getPaymentHistory } from '@/lib/debt'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const entry = await getDebtEntry(ctx.accountId, id)
    const payments = await getPaymentHistory(ctx.accountId, id)
    return NextResponse.json({ entry, payments })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const entry = await updateDebtEntry(ctx.accountId, id, body)
    return NextResponse.json({ entry })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    await deleteDebtEntry(ctx.accountId, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
