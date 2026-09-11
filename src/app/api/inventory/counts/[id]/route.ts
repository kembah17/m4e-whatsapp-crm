import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getInventoryCount, updateCountItem, finalizeCount } from '@/lib/inventory'
import type { UpdateCountItemInput } from '@/types/inventory'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/inventory/counts/[id] - get count with items
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await getCurrentAccount()
    const { id } = await ctx.params

    const count = await getInventoryCount(id)
    return NextResponse.json({ count })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// PATCH /api/inventory/counts/[id] - update count items
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await getCurrentAccount()
    await ctx.params // validate route param exists
    const body = await req.json()

    const { items } = body as { items: Array<{ id: string } & UpdateCountItemInput> }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      )
    }

    const updated = await Promise.all(
      items.map((item) => updateCountItem(item.id, {
        counted_quantity: item.counted_quantity,
        notes: item.notes,
      }))
    )

    return NextResponse.json({ items: updated })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/inventory/counts/[id] - finalize count (apply adjustments)
export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const { accountId, userId } = await getCurrentAccount()
    const { id } = await ctx.params

    await finalizeCount(id, accountId, userId)
    return NextResponse.json({ success: true, message: 'Count finalized and adjustments applied' })
  } catch (err) {
    return toErrorResponse(err)
  }
}
