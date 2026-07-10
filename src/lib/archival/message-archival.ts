import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { uploadArchive, downloadArchive } from './r2-client'

interface ArchiveSummary {
  archiveId: string
  accountId: string
  messageCount: number
  sizeBytes: number
  dateRangeStart: string
  dateRangeEnd: string
  storageProvider: string
}

const BATCH_SIZE = 1000

export async function archiveOldMessages(
  accountId: string,
  retentionDays: number,
): Promise<ArchiveSummary | null> {
  const db = supabaseAdmin()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffISO = cutoffDate.toISOString()

  // Count messages to archive
  const { count } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .lt('created_at', cutoffISO)

  if (!count || count === 0) return null

  // Fetch all messages in batches
  const allMessages: Record<string, unknown>[] = []
  let offset = 0
  while (offset < count) {
    const { data } = await db
      .from('messages')
      .select('*')
      .eq('account_id', accountId)
      .lt('created_at', cutoffISO)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (!data || data.length === 0) break
    allMessages.push(...data)
    offset += BATCH_SIZE
  }

  if (allMessages.length === 0) return null

  // Serialize to JSON
  const jsonData = JSON.stringify(allMessages)
  const buffer = Buffer.from(jsonData, 'utf-8')

  // Determine date range
  const firstMsg = allMessages[0] as { created_at: string }
  const lastMsg = allMessages[allMessages.length - 1] as { created_at: string }
  const dateRangeStart = firstMsg.created_at
  const dateRangeEnd = lastMsg.created_at

  // Upload archive
  const archiveKey = `archives/${accountId}/${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
  const { provider } = await uploadArchive(archiveKey, buffer)

  // Save metadata to Supabase
  const { data: archiveRecord, error: insertError } = await db
    .from('archived_messages')
    .insert({
      account_id: accountId,
      archive_path: archiveKey,
      storage_provider: provider,
      message_count: allMessages.length,
      size_bytes: buffer.byteLength,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(`Failed to save archive metadata: ${insertError.message}`)
  }

  // Delete archived messages from messages table in batches
  const messageIds = allMessages.map((m) => (m as { id: string }).id)
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE)
    const { error: deleteError } = await db
      .from('messages')
      .delete()
      .in('id', batch)

    if (deleteError) {
      console.error(`[archival] Failed to delete batch ${i}: ${deleteError.message}`)
    }
  }

  return {
    archiveId: archiveRecord.id,
    accountId,
    messageCount: allMessages.length,
    sizeBytes: buffer.byteLength,
    dateRangeStart,
    dateRangeEnd,
    storageProvider: provider,
  }
}

export async function retrieveArchivedMessages(
  archiveId: string,
): Promise<Record<string, unknown>[]> {
  const db = supabaseAdmin()

  const { data: archive, error } = await db
    .from('archived_messages')
    .select('archive_path')
    .eq('id', archiveId)
    .single()

  if (error || !archive) throw new Error(`Archive not found: ${archiveId}`)

  const buffer = await downloadArchive(archive.archive_path)
  return JSON.parse(buffer.toString('utf-8')) as Record<string, unknown>[]
}
