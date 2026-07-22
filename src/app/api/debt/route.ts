import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getDebtEntries, createDebtEntry } from '@/lib/debt'
import type { DebtStatus } from '@/types/business-growth'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as DebtStatus | null
    const contact_id = searchParams.get('contact_id') || undefined
    const overdue = searchParams.get('overdue') === 'true'
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getDebtEntries(ctx.accountId, {
      status: status ?? undefined,
      contact_id,
      overdue,
      search,
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

    const { contact_id, entry_type, description, original_amount, due_date,
      currency, reminder_enabled, reminder_frequency_days, max_reminders,
      invoice_id, deal_id, product_id, notes, tags } = body

    if (!contact_id || !description || !original_amount) {
      return NextResponse.json(
        { error: 'contact_id, description, and original_amount are required' },
        { status: 400 },
      )
    }

    const entry = await createDebtEntry(ctx.accountId, {
      contact_id,
      entry_type: entry_type || 'credit_sale',
      description,
      original_amount: Number(original_amount),
      due_date: due_date ?? null,
      currency,
      reminder_enabled,
      reminder_frequency_days,
      max_reminders,
      invoice_id,
      deal_id,
      product_id,
      notes,
      tags,
      created_by: ctx.userId,
    })
    return NextResponse.json({ entry }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
