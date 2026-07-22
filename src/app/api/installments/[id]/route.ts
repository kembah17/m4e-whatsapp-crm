import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getInstallmentPlan, getInstallmentSchedule, updateInstallmentPlan } from '@/lib/installments'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const plan = await getInstallmentPlan(ctx.accountId, id)
    const schedule = await getInstallmentSchedule(id)
    return NextResponse.json({ plan, schedule })
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

    const plan = await updateInstallmentPlan(ctx.accountId, id, body)
    return NextResponse.json({ plan })
  } catch (err) {
    return toErrorResponse(err)
  }
}
