// Version history utilities for config tracking
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { ConfigVersion, VersionDiff } from '@/types/config-versions'

type EntityType = 'package_config' | 'campaign_template'

// Fields to ignore when computing diffs
const IGNORE_FIELDS = ['id', 'created_at', 'updated_at']

/**
 * Compute differences between two config snapshots
 */
export function computeDiff(
  oldSnapshot: Record<string, unknown>,
  newSnapshot: Record<string, unknown>
): VersionDiff[] {
  const diffs: VersionDiff[] = []
  const allKeys = new Set([
    ...Object.keys(oldSnapshot),
    ...Object.keys(newSnapshot),
  ])

  for (const key of allKeys) {
    if (IGNORE_FIELDS.includes(key)) continue

    const oldVal = oldSnapshot[key]
    const newVal = newSnapshot[key]

    if (!(key in oldSnapshot)) {
      diffs.push({ field: key, old_value: undefined, new_value: newVal, change_type: 'added' })
    } else if (!(key in newSnapshot)) {
      diffs.push({ field: key, old_value: oldVal, new_value: undefined, change_type: 'removed' })
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ field: key, old_value: oldVal, new_value: newVal, change_type: 'modified' })
    }
  }

  return diffs
}

/**
 * Generate a human-readable change summary from diffs
 */
export function generateChangeSummary(diffs: VersionDiff[]): string {
  if (diffs.length === 0) return 'No changes detected'

  const parts: string[] = []
  for (const diff of diffs) {
    const label = diff.field.replace(/_/g, ' ')
    switch (diff.change_type) {
      case 'added':
        parts.push(`Added ${label}`)
        break
      case 'removed':
        parts.push(`Removed ${label}`)
        break
      case 'modified': {
        // For arrays, show count change
        if (Array.isArray(diff.old_value) && Array.isArray(diff.new_value)) {
          const oldLen = diff.old_value.length
          const newLen = diff.new_value.length
          if (oldLen !== newLen) {
            parts.push(`${label}: ${oldLen} \u2192 ${newLen} items`)
          } else {
            parts.push(`Updated ${label}`)
          }
        } else if (typeof diff.old_value === 'boolean') {
          parts.push(`${label}: ${diff.old_value} \u2192 ${diff.new_value}`)
        } else if (typeof diff.old_value === 'number' || typeof diff.new_value === 'number') {
          parts.push(`${label}: ${diff.old_value} \u2192 ${diff.new_value}`)
        } else if (typeof diff.old_value === 'string' && typeof diff.new_value === 'string') {
          if (diff.old_value.length > 50 || diff.new_value.length > 50) {
            parts.push(`Updated ${label}`)
          } else {
            parts.push(`${label}: "${diff.old_value}" \u2192 "${diff.new_value}"`)
          }
        } else {
          parts.push(`Updated ${label}`)
        }
        break
      }
    }
  }

  return parts.join('; ')
}

/**
 * Save a version snapshot before an update
 */
export async function saveVersion(
  entityType: EntityType,
  entityId: string,
  snapshot: Record<string, unknown>,
  changeSummary?: string,
  changedBy: string = 'admin'
): Promise<ConfigVersion | null> {
  try {
    const db = supabaseAdmin()

    // Get the next version number
    const { data: latest } = await db
      .from('config_versions')
      .select('version_number')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (latest?.version_number ?? 0) + 1

    const { data, error } = await db
      .from('config_versions')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        version_number: nextVersion,
        snapshot,
        change_summary: changeSummary ?? null,
        changed_by: changedBy,
      })
      .select()
      .single()

    if (error) {
      console.error('[saveVersion] error:', error)
      return null
    }

    return data as ConfigVersion
  } catch (err) {
    console.error('[saveVersion] unexpected error:', err)
    return null
  }
}

/**
 * List version history for an entity
 */
export async function listVersions(
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<ConfigVersion[]> {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('config_versions')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('version_number', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[listVersions] error:', error)
      return []
    }

    return (data ?? []) as ConfigVersion[]
  } catch (err) {
    console.error('[listVersions] unexpected error:', err)
    return []
  }
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string): Promise<ConfigVersion | null> {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('config_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (error) {
      console.error('[getVersion] error:', error)
      return null
    }

    return data as ConfigVersion
  } catch (err) {
    console.error('[getVersion] unexpected error:', err)
    return null
  }
}
