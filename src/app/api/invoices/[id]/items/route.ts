import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getInvoiceItems, addInvoiceItem, updateInvoiceItem, deleteInvoiceItem } from '@/lib/invoices'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getCurrentAccount()
    const { id } = await params
    const items = await getInvoiceItems(id)
    return NextResponse.json({ items })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin')
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { product_id, description, quantity, unit_price, discount_percent, tax_rate, notes } = body
    if (!description || !quantity || !unit_price) {
      return NextResponse.json(
        { error: 'description, quantity, and unit_price are required' },
        { status: 400 },
      )
    }

    const item = await addInvoiceItem(id, {
      product_id: product_id ?? null,
      description,
      quantity: Number(quantity),
      unit_price: Number(unit_price),
      discount_percent: discount_percent ? Number(discount_percent) : 0,
      tax_rate: tax_rate ? Number(tax_rate) : 0,
      notes: notes ?? null,
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole('admin')
    const body = await request.json().catch(() => null)
    if (!body || !body.item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    const { item_id, ...updates } = body
    const item = await updateInvoiceItem(item_id, updates)
    return NextResponse.json({ item })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole('admin')
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')
    if (!itemId) {
      return NextResponse.json({ error: 'item_id query param required' }, { status: 400 })
    }

    await deleteInvoiceItem(itemId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
