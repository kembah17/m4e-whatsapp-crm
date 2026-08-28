import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { trackActivity, trackPageView, trackFeatureAction, getActivitySummary } from '@/lib/subscriber-monitoring/activity-tracker'

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventType, eventCategory, pagePath, featureUsed, metadata, sessionId } = body

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    // Fire-and-forget tracking
    await trackActivity({
      accountId: account.account_id,
      userId: account.user_id,
      eventType,
      eventCategory: eventCategory || 'general',
      pagePath,
      featureUsed,
      metadata,
      sessionId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Activity API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const summary = await getActivitySummary(account.account_id, days)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[Activity API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
