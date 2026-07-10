import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import {
  getInfrastructureMetrics,
  checkInfrastructureLimits,
  saveInfrastructureSnapshot,
} from '@/lib/monitoring/infrastructure-alerts'

export async function GET() {
  const db = supabaseAdmin()

  try {
    // Get current metrics
    const metrics = await getInfrastructureMetrics()

    // Check alerts
    const alerts = checkInfrastructureLimits(metrics)

    // Save snapshot for trend tracking
    await saveInfrastructureSnapshot(metrics)

    // Get archival status
    const archivalEnabled = process.env.ARCHIVAL_ENABLED === 'true'
    const retentionDays = parseInt(process.env.ARCHIVAL_RETENTION_DAYS ?? '180', 10)

    const { data: lastArchival } = await db
      .from('archived_messages')
      .select('created_at, message_count')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: archivalTotals } = await db
      .from('archived_messages')
      .select('message_count')

    const totalArchived = (archivalTotals ?? []).reduce(
      (sum: number, row: { message_count: number }) =>
        sum + (row.message_count ?? 0),
      0,
    )

    // Get recent snapshots for trend
    const { data: snapshots } = await db
      .from('infrastructure_snapshots')
      .select('*')
      .order('snapshot_at', { ascending: false })
      .limit(30)

    const tier = process.env.INFRASTRUCTURE_TIER ?? 'free'

    return NextResponse.json({
      metrics,
      alerts,
      archival: {
        enabled: archivalEnabled,
        retentionDays,
        lastRun: lastArchival?.created_at ?? null,
        lastRunCount: lastArchival?.message_count ?? 0,
        totalArchived,
      },
      tier,
      snapshots: snapshots ?? [],
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[infrastructure] API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch infrastructure data' },
      { status: 500 },
    )
  }
}
