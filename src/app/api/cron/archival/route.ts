import { NextResponse } from 'next/server'
import { archiveOldMessages } from '@/lib/archival/message-archival'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if archival is enabled
  const archivalEnabled = process.env.ARCHIVAL_ENABLED === 'true'
  if (!archivalEnabled) {
    return NextResponse.json({ message: 'Archival is disabled', archived: [] })
  }

  const retentionDays = parseInt(process.env.ARCHIVAL_RETENTION_DAYS ?? '180', 10)
  const db = supabaseAdmin()

  try {
    // Get all accounts
    const { data: accounts } = await db.from('accounts').select('id')
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: 'No accounts found', archived: [] })
    }

    const results: Array<{ accountId: string; messageCount: number; status: string }> = []

    for (const account of accounts) {
      try {
        const summary = await archiveOldMessages(account.id, retentionDays)
        if (summary) {
          results.push({
            accountId: account.id,
            messageCount: summary.messageCount,
            status: 'archived',
          })
        } else {
          results.push({
            accountId: account.id,
            messageCount: 0,
            status: 'no_messages_to_archive',
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({
          accountId: account.id,
          messageCount: 0,
          status: `error: ${errorMessage}`,
        })
      }
    }

    // Log to system_logs (uses category field per schema)
    try {
      await db.from('system_logs').insert({
        level: 'info',
        category: 'cron:archival',
        message: `Archival completed for ${accounts.length} accounts`,
        metadata: { results, retentionDays },
      })
    } catch {
      console.log('[cron:archival] Could not write to system_logs')
    }

    return NextResponse.json({
      message: 'Archival complete',
      retentionDays,
      archived: results,
    })
  } catch (err) {
    console.error('[cron:archival] Error:', err)
    return NextResponse.json(
      { error: 'Archival failed' },
      { status: 500 },
    )
  }
}
