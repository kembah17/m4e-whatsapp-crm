import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getInvoice, updateInvoice, deleteInvoice } from '@/lib/invoices'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const invoice = await getInvoice(ctx.accountId, id)
    return NextResponse.json({ invoice })
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

    const invoice = await updateInvoice(ctx.accountId, id, body)
    return NextResponse.json({ invoice })
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
    await deleteInvoice(ctx.accountId, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
