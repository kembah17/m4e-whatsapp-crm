import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import {
  getInventorySummary,
  getStockByLocation,
  getAllStock,
  receiveStock,
  issueStock,
  adjustStock,
} from '@/lib/inventory'
import type { ReceiveStockInput, IssueStockInput, AdjustStockInput } from '@/types/inventory'

// GET /api/inventory - summary + optional stock by location
export async function GET(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const url = req.nextUrl.searchParams
    const locationId = url.get('location_id')
    const allStock = url.get('all_stock')

    if (locationId) {
      const stock = await getStockByLocation(accountId, locationId)
      return NextResponse.json({ stock })
    }

    if (allStock === 'true') {
      const stock = await getAllStock(accountId)
      return NextResponse.json({ stock })
    }

    const summary = await getInventorySummary(accountId)
    return NextResponse.json({ summary })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/inventory - receive, issue, or adjust stock
export async function POST(req: NextRequest) {
  try {
    const { accountId, userId } = await getCurrentAccount()
    const body = await req.json()
    const { action, ...payload } = body as { action: string } & Record<string, unknown>

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (receive, issue, adjust)' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'receive': {
        const input = payload as unknown as ReceiveStockInput
        if (!input.location_id || !input.product_id || !input.quantity) {
          return NextResponse.json(
            { error: 'location_id, product_id, and quantity are required' },
            { status: 400 }
          )
        }
        const result = await receiveStock(accountId, userId, input)
        return NextResponse.json(result, { status: 201 })
      }

      case 'issue': {
        const input = payload as unknown as IssueStockInput
        if (!input.location_id || !input.product_id || !input.quantity) {
          return NextResponse.json(
            { error: 'location_id, product_id, and quantity are required' },
            { status: 400 }
          )
        }
        const result = await issueStock(accountId, userId, input)
        return NextResponse.json(result, { status: 201 })
      }

      case 'adjust': {
        const input = payload as unknown as AdjustStockInput
        if (!input.location_id || !input.product_id || input.new_quantity === undefined || !input.reason) {
          return NextResponse.json(
            { error: 'location_id, product_id, new_quantity, and reason are required' },
            { status: 400 }
          )
        }
        const result = await adjustStock(accountId, userId, input)
        return NextResponse.json(result, { status: 201 })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use receive, issue, or adjust.` },
          { status: 400 }
        )
    }
  } catch (err) {
    return toErrorResponse(err)
  }
}
