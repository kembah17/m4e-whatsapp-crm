import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import {
  scanReceipt,
  getUnmatchedReceipts,
  matchReceiptToDebt,
} from '@/lib/ai/receipt-scanner'

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { media_url, contact_id, source, message_id } = body

    if (!media_url) {
      return NextResponse.json({ error: 'media_url is required' }, { status: 400 })
    }

    const receipt = await scanReceipt(
      media_url,
      account.account_id,
      contact_id || null,
      source || 'manual',
      message_id || null
    )

    // Try auto-matching
    const matchResult = await matchReceiptToDebt(receipt.id)

    return NextResponse.json({ receipt, match: matchResult })
  } catch (err) {
    console.error('Receipt scan error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const receipts = await getUnmatchedReceipts(account.account_id, limit)
    return NextResponse.json({ receipts, total: receipts.length })
  } catch (err) {
    console.error('Receipt list error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list receipts' },
      { status: 500 }
    )
  }
}
