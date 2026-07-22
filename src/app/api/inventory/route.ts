import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { MovementType } from '@/types/business-growth'

// GET /api/inventory - list stock movements with filters
export async function GET(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const admin = supabaseAdmin()
    const url = req.nextUrl.searchParams

    const productId = url.get('product_id')
    const movementType = url.get('movement_type') as MovementType | null
    const dateFrom = url.get('date_from')
    const dateTo = url.get('date_to')
    const limit = Math.min(parseInt(url.get('limit') ?? '50'), 100)
    const offset = parseInt(url.get('offset') ?? '0')

    let query = admin
      .from('stock_movements')
      .select('*, product:products(name, sku)', { count: 'exact' })
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)
    if (movementType) query = query.eq('movement_type', movementType)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ movements: data ?? [], total: count ?? 0 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/inventory - record new stock movement
export async function POST(req: NextRequest) {
  try {
    const { accountId, userId } = await getCurrentAccount()
    const admin = supabaseAdmin()
    const body = await req.json()

    const { product_id, movement_type, quantity, notes, branch_id, reference_type, reference_id } = body

    if (!product_id || !movement_type || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'product_id, movement_type, and positive quantity are required' },
        { status: 400 }
      )
    }

    // Get current stock
    const { data: product, error: prodErr } = await admin
      .from('products')
      .select('stock_quantity')
      .eq('id', product_id)
      .eq('account_id', accountId)
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const previousQty = product.stock_quantity ?? 0
    const isAddition = ['restock', 'return'].includes(movement_type)
    const newQty = isAddition
      ? previousQty + quantity
      : Math.max(0, previousQty - quantity)

    // Insert movement
    const { data: movement, error: movErr } = await admin
      .from('stock_movements')
      .insert({
        account_id: accountId,
        product_id,
        movement_type,
        quantity,
        previous_quantity: previousQty,
        new_quantity: newQty,
        notes: notes ?? null,
        branch_id: branch_id ?? null,
        reference_type: reference_type ?? null,
        reference_id: reference_id ?? null,
        created_by: userId,
      })
      .select()
      .single()

    if (movErr) throw movErr

    // Update product stock
    const updateFields: Record<string, unknown> = {
      stock_quantity: newQty,
      updated_at: new Date().toISOString(),
    }
    if (movement_type === 'restock') {
      updateFields.last_restocked_at = new Date().toISOString()
    }

    await admin
      .from('products')
      .update(updateFields)
      .eq('id', product_id)
      .eq('account_id', accountId)

    return NextResponse.json({ movement }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
