import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { analyzeSentiment } from '@/lib/ai/sentiment-analyzer'

export async function POST(request: Request) {
  try {
    await requireRole('admin')
    const body = await request.json()
    const { messageText, contactName, conversationContext } = body

    if (!messageText) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 })
    }

    const result = await analyzeSentiment({ messageText, contactName, conversationContext })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}
