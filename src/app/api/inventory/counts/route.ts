import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getInventoryCounts, createInventoryCount } from '@/lib/inventory'
import type { CreateCountInput } from '@/types/inventory'

// GET /api/inventory/counts
export async function GET() {
  try {
    const { accountId } = await getCurrentAccount()
    const counts = await getInventoryCounts(accountId)
    return NextResponse.json({ counts })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/inventory/counts - create a new physical count
export async function POST(req: NextRequest) {
  try {
    const { accountId, userId } = await getCurrentAccount()
    const body = (await req.json()) as CreateCountInput

    if (!body.location_id || !body.count_date) {
      return NextResponse.json(
        { error: 'location_id and count_date are required' },
        { status: 400 }
      )
    }

    const count = await createInventoryCount(accountId, userId, body)
    return NextResponse.json({ count }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
