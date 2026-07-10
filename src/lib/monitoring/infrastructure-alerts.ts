import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

type AlertLevel = 'info' | 'warning' | 'critical'

export interface InfrastructureAlert {
  level: AlertLevel
  metric: string
  current: number
  threshold: number
  recommendation: string
}

export interface InfrastructureMetrics {
  databaseSizeBytes: number
  messageCount: number
  contactCount: number
  fileStorageBytes: number
  connectionCount: number
  accountCount: number
}

type InfrastructureTier = 'free' | 'pro'

function getTier(): InfrastructureTier {
  return (process.env.INFRASTRUCTURE_TIER as InfrastructureTier) ?? 'free'
}

export async function getInfrastructureMetrics(): Promise<InfrastructureMetrics> {
  const db = supabaseAdmin()

  // Run all queries in parallel
  const [dbSizeResult, messageCountResult, contactCountResult, accountCountResult] =
    await Promise.all([
      db.rpc('get_database_size').single(),
      db.from('messages').select('*', { count: 'exact', head: true }),
      db.from('contacts').select('*', { count: 'exact', head: true }),
      db.from('accounts').select('*', { count: 'exact', head: true }),
    ])

  // File storage and connection count need special handling
  let fileStorageBytes = 0
  let connectionCount = 0

  try {
    const { data: storageData } = await db.rpc('get_storage_size').single()
    fileStorageBytes = (storageData as number) ?? 0
  } catch {
    // Storage RPC may not exist yet
    fileStorageBytes = 0
  }

  try {
    const { data: connData } = await db.rpc('get_connection_count').single()
    connectionCount = (connData as number) ?? 0
  } catch {
    // Connection count RPC may not exist yet
    connectionCount = 0
  }

  return {
    databaseSizeBytes: (dbSizeResult.data as number) ?? 0,
    messageCount: messageCountResult.count ?? 0,
    contactCount: contactCountResult.count ?? 0,
    fileStorageBytes,
    connectionCount,
    accountCount: accountCountResult.count ?? 0,
  }
}

export function checkInfrastructureLimits(
  metrics: InfrastructureMetrics,
): InfrastructureAlert[] {
  const tier = getTier()
  const alerts: InfrastructureAlert[] = []

  const MB = 1024 * 1024
  const GB = 1024 * MB

  // Database size thresholds
  if (tier === 'free' && metrics.databaseSizeBytes > 400 * MB) {
    alerts.push({
      level: 'critical',
      metric: 'Database Size',
      current: metrics.databaseSizeBytes,
      threshold: 400 * MB,
      recommendation:
        'Database exceeds 400MB free tier limit. Upgrade to Pro or enable message archival to reduce size.',
    })
  } else if (tier === 'pro' && metrics.databaseSizeBytes > 6 * GB) {
    alerts.push({
      level: 'warning',
      metric: 'Database Size',
      current: metrics.databaseSizeBytes,
      threshold: 6 * GB,
      recommendation:
        'Database exceeds 6GB. Consider enabling message archival or upgrading storage add-on.',
    })
  }

  // File storage thresholds
  if (tier === 'free' && metrics.fileStorageBytes > 800 * MB) {
    alerts.push({
      level: 'critical',
      metric: 'File Storage',
      current: metrics.fileStorageBytes,
      threshold: 800 * MB,
      recommendation:
        'File storage exceeds 800MB free tier limit. Upgrade to Pro or clean up unused media.',
    })
  } else if (tier === 'pro' && metrics.fileStorageBytes > 80 * GB) {
    alerts.push({
      level: 'warning',
      metric: 'File Storage',
      current: metrics.fileStorageBytes,
      threshold: 80 * GB,
      recommendation:
        'File storage approaching Pro tier limit. Review media retention policies.',
    })
  }

  // Message count without archival
  if (metrics.messageCount > 100000) {
    alerts.push({
      level: 'warning',
      metric: 'Message Count',
      current: metrics.messageCount,
      threshold: 100000,
      recommendation:
        'Over 100K messages without archival. Enable message archival to maintain database performance.',
    })
  }

  // Connection thresholds
  if (tier === 'free' && metrics.connectionCount > 48) {
    alerts.push({
      level: 'warning',
      metric: 'Database Connections',
      current: metrics.connectionCount,
      threshold: 48,
      recommendation:
        'Connection count approaching free tier limit of 60. Upgrade to Pro for more connections.',
    })
  } else if (tier === 'pro' && metrics.connectionCount > 160) {
    alerts.push({
      level: 'warning',
      metric: 'Database Connections',
      current: metrics.connectionCount,
      threshold: 160,
      recommendation:
        'Connection count approaching Pro tier limit of 200. Review connection pooling settings.',
    })
  }

  return alerts
}

export async function saveInfrastructureSnapshot(
  metrics: InfrastructureMetrics,
): Promise<void> {
  const db = supabaseAdmin()
  await db.from('infrastructure_snapshots').insert({
    database_size_bytes: metrics.databaseSizeBytes,
    message_count: metrics.messageCount,
    contact_count: metrics.contactCount,
    file_storage_bytes: metrics.fileStorageBytes,
    connection_count: metrics.connectionCount,
    account_count: metrics.accountCount,
  })
}
