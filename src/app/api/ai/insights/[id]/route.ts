import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { dismissInsight, markActionTaken } from '@/lib/ai/business-insights'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { action } = body

    if (!action || !['dismiss', 'action_taken'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "dismiss" or "action_taken"' },
        { status: 400 }
      )
    }

    if (action === 'dismiss') {
      await dismissInsight(id)
    } else {
      await markActionTaken(id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Insight update error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update insight' },
      { status: 500 }
    )
  }
}
