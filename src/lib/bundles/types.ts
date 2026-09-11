/**
 * Industry Workflow Bundle types.
 * Bundles link pipeline presets with flows, automations, and segments
 * so users get a complete, interconnected system for their industry.
 */

export interface ChecklistItem {
  text: string
  required: boolean
  description?: string
}

export interface EnhancedStage {
  name: string
  color: string
  position: number
  purpose: string
  owner_role: string
  entry_criteria: string[]
  exit_criteria: string[]
  checklist: ChecklistItem[]
  sla_hint?: string
}

export interface EnhancedPipelinePreset {
  id: string
  name: string
  icon: string
  description: string
  category: 'sales' | 'operations'
  stages: EnhancedStage[]
}

export interface SuggestedAutomation {
  slug: string
  priority: 'essential' | 'recommended' | 'optional'
  description: string
}

export interface SuggestedSegment {
  id: string
  description: string
}

export interface IndustryWorkflowBundle {
  id: string
  industry: string
  process: string
  name: string
  description: string
  icon: string
  setup_time_minutes: number
  pipeline: EnhancedPipelinePreset
  suggested_flows: string[]  // Flow template slugs
  suggested_automations: SuggestedAutomation[]
  suggested_segments: string[]  // Segment template IDs
  customization_hints: string[]
}
