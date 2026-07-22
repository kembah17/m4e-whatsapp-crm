import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getInvoices, createInvoice } from '@/lib/invoices'
import type { DocType, InvoiceStatus, DiscountType } from '@/types/business-growth'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const doc_type = searchParams.get('doc_type') as DocType | null
    const status = searchParams.get('status') as InvoiceStatus | null
    const contact_id = searchParams.get('contact_id') || undefined
    const search = searchParams.get('search') || undefined
    const date_from = searchParams.get('date_from') || undefined
    const date_to = searchParams.get('date_to') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getInvoices(ctx.accountId, {
      doc_type: doc_type ?? undefined,
      status: status ?? undefined,
      contact_id,
      search,
      date_from,
      date_to,
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
      contact_id, doc_type, items, discount_type, discount_value,
      tax_rate, currency, due_date, valid_until, notes, terms,
      footer_text, business_name, business_address, business_phone,
      business_email, business_logo_url, business_bank_details,
      deal_id, tags,
    } = body

    if (!contact_id || !doc_type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'contact_id, doc_type, and at least one item are required' },
        { status: 400 },
      )
    }

    const invoice = await createInvoice(ctx.accountId, {
      contact_id,
      doc_type: doc_type as DocType,
      items,
      discount_type: (discount_type as DiscountType) || 'none',
      discount_value: discount_value ? Number(discount_value) : 0,
      tax_rate: tax_rate ? Number(tax_rate) : 0,
      currency,
      due_date: due_date ?? null,
      valid_until: valid_until ?? null,
      notes: notes ?? null,
      terms: terms ?? null,
      footer_text: footer_text ?? null,
      business_name: business_name ?? null,
      business_address: business_address ?? null,
      business_phone: business_phone ?? null,
      business_email: business_email ?? null,
      business_logo_url: business_logo_url ?? null,
      business_bank_details: business_bank_details ?? null,
      deal_id: deal_id ?? null,
      tags,
      created_by: ctx.userId,
    })
    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
