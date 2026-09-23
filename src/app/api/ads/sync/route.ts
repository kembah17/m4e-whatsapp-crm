import { NextResponse } from 'next/server'
import {
  getCurrentAccount,
  toErrorResponse,
} from '@/lib/auth/account'
import { syncAdsData } from '@/lib/ads/ads-sync-service'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/ads/sync — trigger manual sync for the current account
export async function POST() {
  try {
    const ctx = await getCurrentAccount()
    const result = await syncAdsData(ctx.accountId)

    return NextResponse.json(result, {
      status: result.success ? 200 : 207,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
