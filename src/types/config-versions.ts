// Config Version History types

export interface ConfigVersion {
  id: string
  entity_type: 'package_config' | 'campaign_template'
  entity_id: string
  version_number: number
  snapshot: Record<string, unknown>
  change_summary: string | null
  changed_by: string
  created_at: string
}

export interface VersionDiff {
  field: string
  old_value: unknown
  new_value: unknown
  change_type: 'added' | 'removed' | 'modified'
}
