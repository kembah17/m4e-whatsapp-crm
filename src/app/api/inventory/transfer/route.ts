import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { transferStock } from '@/lib/inventory'
import type { TransferStockInput } from '@/types/inventory'

// POST /api/inventory/transfer
export async function POST(req: NextRequest) {
  try {
    const { accountId, userId } = await getCurrentAccount()
    const body = (await req.json()) as TransferStockInput

    if (!body.from_location_id || !body.to_location_id || !body.product_id || !body.quantity) {
      return NextResponse.json(
        { error: 'from_location_id, to_location_id, product_id, and quantity are required' },
        { status: 400 }
      )
    }

    const result = await transferStock(accountId, userId, body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
