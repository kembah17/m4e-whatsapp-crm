import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getInstallmentPlans, createInstallmentPlan } from '@/lib/installments'
import type { InstallmentPlanStatus, InstallmentFrequency, LateFeeType } from '@/types/business-growth'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as InstallmentPlanStatus | null
    const contact_id = searchParams.get('contact_id') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getInstallmentPlans(ctx.accountId, {
      status: status ?? undefined,
      contact_id,
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

    const {
      contact_id, plan_name, total_amount, down_payment,
      number_of_installments, frequency, currency,
      grace_period_days, late_fee_type, late_fee_amount,
      product_id, deal_id, debt_entry_id, notes,
    } = body

    if (!contact_id || !plan_name || !total_amount || !number_of_installments || !frequency) {
      return NextResponse.json(
        { error: 'contact_id, plan_name, total_amount, number_of_installments, and frequency are required' },
        { status: 400 },
      )
    }

    const plan = await createInstallmentPlan(ctx.accountId, {
      contact_id,
      plan_name,
      total_amount: Number(total_amount),
      down_payment: down_payment ? Number(down_payment) : 0,
      number_of_installments: Number(number_of_installments),
      frequency: frequency as InstallmentFrequency,
      currency,
      grace_period_days: grace_period_days ? Number(grace_period_days) : undefined,
      late_fee_type: late_fee_type as LateFeeType | undefined,
      late_fee_amount: late_fee_amount ? Number(late_fee_amount) : undefined,
      product_id: product_id ?? null,
      deal_id: deal_id ?? null,
      debt_entry_id: debt_entry_id ?? null,
      notes: notes ?? null,
      created_by: ctx.userId,
    })
    return NextResponse.json({ plan }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
