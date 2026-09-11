import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getStockLedger } from '@/lib/inventory'
import type { LedgerEntryType } from '@/types/inventory'

// GET /api/inventory/ledger - paginated ledger entries
export async function GET(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const url = req.nextUrl.searchParams

    const result = await getStockLedger(accountId, {
      product_id: url.get('product_id') ?? undefined,
      location_id: url.get('location_id') ?? undefined,
      entry_type: (url.get('entry_type') as LedgerEntryType) ?? undefined,
      date_from: url.get('date_from') ?? undefined,
      date_to: url.get('date_to') ?? undefined,
      limit: url.get('limit') ? parseInt(url.get('limit')!) : undefined,
      offset: url.get('offset') ? parseInt(url.get('offset')!) : undefined,
    })

    return NextResponse.json({ entries: result.entries, total: result.total })
  } catch (err) {
    return toErrorResponse(err)
  }
}
