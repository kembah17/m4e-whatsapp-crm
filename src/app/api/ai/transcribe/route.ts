import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import {
  transcribeVoiceNote,
  getTranscription,
  searchTranscriptions,
} from '@/lib/ai/voice-transcription'

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { message_id, media_url, contact_id } = body

    if (!message_id || !media_url) {
      return NextResponse.json(
        { error: 'message_id and media_url are required' },
        { status: 400 }
      )
    }

    const result = await transcribeVoiceNote(
      media_url,
      account.account_id,
      message_id,
      contact_id || null
    )

    return NextResponse.json({ transcription: result })
  } catch (err) {
    console.error('Transcription error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('message_id')
    const query = searchParams.get('query')

    if (messageId) {
      const transcription = await getTranscription(messageId)
      return NextResponse.json({ transcription })
    }

    if (query) {
      const limit = parseInt(searchParams.get('limit') || '20', 10)
      const results = await searchTranscriptions(account.account_id, query, limit)
      return NextResponse.json({ transcriptions: results, total: results.length })
    }

    return NextResponse.json(
      { error: 'Provide message_id or query parameter' },
      { status: 400 }
    )
  } catch (err) {
    console.error('Transcription search error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 }
    )
  }
}
