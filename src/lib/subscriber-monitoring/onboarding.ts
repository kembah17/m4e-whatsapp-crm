import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// ── Step Categories ─────────────────────────────────────────
export type StepCategory = 'setup' | 'data' | 'engagement' | 'growth'

export interface OnboardingStepDef {
  step: number
  key: string
  title: string
  description: string
  category: StepCategory
  estimatedMinutes: number
  action: 'watch_video' | 'navigate'
  targetPath: string
  helpUrl: string
}

// Onboarding steps for platform subscribers
// Categories: setup (initial config), data (import & organize),
//             engagement (connect & message), growth (campaigns & automation)
export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  {
    step: 1,
    key: 'welcome',
    title: 'Welcome to Your Business Growth Engine',
    description: 'Quick overview of what the platform can do for your business',
    category: 'setup',
    estimatedMinutes: 2,
    action: 'watch_video',
    targetPath: '/getting-started',
    helpUrl: '/help#welcome',
  },
  {
    step: 2,
    key: 'setup_industry',
    title: 'Set Up Your Industry Defaults',
    description: 'Apply industry-specific pipelines, workflows, and templates to your account',
    category: 'setup',
    estimatedMinutes: 3,
    action: 'navigate',
    targetPath: '/industry-setup',
    helpUrl: '/help#industry-setup',
  },
  {
    step: 3,
    key: 'import_data',
    title: 'Import Your Business Data',
    description: 'Upload your customer contacts and product catalog from Excel, CSV, or your phone',
    category: 'data',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/data-center',
    helpUrl: '/help#import-data',
  },
  {
    step: 4,
    key: 'connect_whatsapp',
    title: 'Connect Your WhatsApp Business',
    description: 'Connect your WhatsApp Business number to start messaging customers',
    category: 'setup',
    estimatedMinutes: 10,
    action: 'navigate',
    targetPath: '/settings',
    helpUrl: '/help#whatsapp-setup',
  },
  {
    step: 5,
    key: 'create_template',
    title: 'Create Your First Message Template',
    description: 'Set up a reusable message template for customer outreach',
    category: 'engagement',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/templates',
    helpUrl: '/help#templates',
  },
  {
    step: 6,
    key: 'setup_pipeline',
    title: 'Set Up Your Sales Pipeline',
    description: 'Organise your sales process with customisable stages',
    category: 'setup',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/pipelines',
    helpUrl: '/help#pipelines',
  },
  {
    step: 7,
    key: 'send_first_message',
    title: 'Send Your First Message',
    description: 'Reach out to a customer using WhatsApp or email',
    category: 'engagement',
    estimatedMinutes: 3,
    action: 'navigate',
    targetPath: '/contacts',
    helpUrl: '/help#messaging',
  },
  {
    step: 8,
    key: 'create_campaign',
    title: 'Launch Your First Campaign',
    description: 'Create a reactivation campaign to win back dormant customers',
    category: 'growth',
    estimatedMinutes: 10,
    action: 'navigate',
    targetPath: '/campaigns',
    helpUrl: '/help#campaigns',
  },
  {
    step: 9,
    key: 'explore_automation',
    title: 'Explore Automation',
    description: 'Set up automated workflows to save time on repetitive tasks',
    category: 'growth',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/automations',
    helpUrl: '/help#automations',
  },
] as const

export type OnboardingStepKey = typeof ONBOARDING_STEPS[number]['key']

// ── Enriched step (includes runtime status) ─────────────────
export interface EnrichedStep {
  key: string
  title: string
  description: string
  category: StepCategory
  estimatedMinutes: number
  helpUrl: string
  targetPath: string
  status: 'pending' | 'completed' | 'skipped'
  completedAt: string | null
}

export interface OnboardingProgress {
  id: string
  accountId: string
  onboardingType: 'self_service' | 'post_package' | 'referral'
  currentStep: number
  totalSteps: number
  stepsCompleted: { key: string; completedAt: string }[]
  isComplete: boolean
  completedAt: string | null
  skippedSteps: string[]
  timeSpentMinutes: number
  percentComplete: number
  /** Full step objects with status — ready for frontend rendering */
  steps: EnrichedStep[]
  /** True when data is synthetic (DB unreachable) */
  fallback?: boolean
}

/**
 * Build a synthetic progress object from ONBOARDING_STEPS.
 * Used when the database is unreachable so the page always renders.
 */
export function buildFallbackProgress(accountId: string): OnboardingProgress {
  const steps: EnrichedStep[] = ONBOARDING_STEPS.map(def => ({
    key: def.key,
    title: def.title,
    description: def.description,
    category: def.category,
    estimatedMinutes: def.estimatedMinutes,
    helpUrl: def.helpUrl,
    targetPath: def.targetPath,
    status: 'pending' as const,
    completedAt: null,
  }))

  return {
    id: 'fallback',
    accountId,
    onboardingType: 'self_service',
    currentStep: 1,
    totalSteps: ONBOARDING_STEPS.length,
    stepsCompleted: [],
    isComplete: false,
    completedAt: null,
    skippedSteps: [],
    timeSpentMinutes: 0,
    percentComplete: 0,
    steps,
    fallback: true,
  }
}

/**
 * Get or create onboarding progress for an account.
 * Falls back to synthetic progress if the database is unreachable.
 */
export async function getOnboardingProgress(
  accountId: string
): Promise<OnboardingProgress> {
  try {
    const db = supabaseAdmin()

    const { data: existing, error } = await db
      .from('platform_onboarding')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Onboarding] DB query error:', error)
      // Fall through to create new record
    }

    if (existing) {
      return formatProgress(existing)
    }

    // Create new onboarding record
    const { data: newRecord, error: insertError } = await db
      .from('platform_onboarding')
      .insert({
        account_id: accountId,
        onboarding_type: 'self_service',
        current_step: 1,
        total_steps: ONBOARDING_STEPS.length,
        steps_completed: [],
        is_complete: false,
      })
      .select()
      .single()

    if (insertError || !newRecord) {
      console.error('[Onboarding] Insert error:', insertError)
      return buildFallbackProgress(accountId)
    }

    return formatProgress(newRecord)
  } catch (err) {
    console.error('[Onboarding] Unexpected error:', err)
    return buildFallbackProgress(accountId)
  }
}

/**
 * Mark a step as completed
 */
export async function completeStep(
  accountId: string,
  stepKey: string
): Promise<OnboardingProgress> {
  const db = supabaseAdmin()
  const progress = await getOnboardingProgress(accountId)

  // Check if already completed
  if (progress.stepsCompleted.some(s => s.key === stepKey)) {
    return progress
  }

  const updatedSteps = [
    ...progress.stepsCompleted,
    { key: stepKey, completedAt: new Date().toISOString() },
  ]

  const stepIndex = ONBOARDING_STEPS.findIndex(s => s.key === stepKey)
  const nextStep = Math.min(stepIndex + 2, ONBOARDING_STEPS.length) // +2 because steps are 1-indexed
  const isComplete = updatedSteps.length >= ONBOARDING_STEPS.length

  const { data } = await db
    .from('platform_onboarding')
    .update({
      steps_completed: updatedSteps,
      current_step: isComplete ? ONBOARDING_STEPS.length : nextStep,
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('account_id', accountId)
    .select()
    .single()

  return formatProgress(data!)
}

/**
 * Skip a step
 */
export async function skipStep(
  accountId: string,
  stepKey: string
): Promise<OnboardingProgress> {
  const db = supabaseAdmin()
  const progress = await getOnboardingProgress(accountId)

  if (progress.skippedSteps.includes(stepKey)) {
    return progress
  }

  const updatedSkipped = [...progress.skippedSteps, stepKey]
  const stepIndex = ONBOARDING_STEPS.findIndex(s => s.key === stepKey)
  const nextStep = Math.min(stepIndex + 2, ONBOARDING_STEPS.length)

  const totalHandled = progress.stepsCompleted.length + updatedSkipped.length
  const isComplete = totalHandled >= ONBOARDING_STEPS.length

  const { data } = await db
    .from('platform_onboarding')
    .update({
      skipped_steps: updatedSkipped,
      current_step: isComplete ? ONBOARDING_STEPS.length : nextStep,
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('account_id', accountId)
    .select()
    .single()

  return formatProgress(data!)
}

/**
 * Reset onboarding (for re-onboarding)
 */
export async function resetOnboarding(
  accountId: string,
  type: 'self_service' | 'post_package' | 'referral' = 'self_service'
): Promise<OnboardingProgress> {
  const db = supabaseAdmin()

  const { data } = await db
    .from('platform_onboarding')
    .upsert({
      account_id: accountId,
      onboarding_type: type,
      current_step: 1,
      total_steps: ONBOARDING_STEPS.length,
      steps_completed: [],
      is_complete: false,
      completed_at: null,
      skipped_steps: [],
      time_spent_minutes: 0,
    })
    .select()
    .single()

  return formatProgress(data!)
}

/**
 * Check if a specific feature has been used (for auto-completing steps)
 */
export async function autoDetectCompletedSteps(
  accountId: string
): Promise<string[]> {
  const db = supabaseAdmin()
  const completed: string[] = []

  // Check if industry bundles have been applied (pipelines exist for this account)
  const { count: pipeCount } = await db
    .from('pipelines')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (pipeCount && pipeCount > 0) completed.push('setup_industry')

  // Check contacts imported
  const { count: contactCount } = await db
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (contactCount && contactCount > 0) completed.push('import_data')

  // Check products imported (also counts for import_data)
  const { count: productCount } = await db
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (productCount && productCount > 0 && !completed.includes('import_data')) {
    completed.push('import_data')
  }

  // Check WhatsApp connected
  const { data: waConfig } = await db
    .from('whatsapp_config')
    .select('id')
    .eq('account_id', accountId)
    .limit(1)
  if (waConfig && waConfig.length > 0) completed.push('connect_whatsapp')

  // Check templates created
  const { count: templateCount } = await db
    .from('message_templates')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (templateCount && templateCount > 0) completed.push('create_template')

  // Check pipeline exists (also counts for setup_pipeline)
  const { count: pipelineCount } = await db
    .from('pipelines')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (pipelineCount && pipelineCount > 0) completed.push('setup_pipeline')

  // Check messages sent
  const { count: msgCount } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('direction', 'outbound')
  if (msgCount && msgCount > 0) completed.push('send_first_message')

  // Check campaigns created
  const { count: campaignCount } = await db
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (campaignCount && campaignCount > 0) completed.push('create_campaign')

  // Check automations created
  const { count: autoCount } = await db
    .from('automations')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (autoCount && autoCount > 0) completed.push('explore_automation')

  return completed
}

// ============================================================
// Helpers
// ============================================================

function formatProgress(raw: Record<string, unknown>): OnboardingProgress {
  const stepsCompleted = (raw.steps_completed as { key: string; completedAt: string }[]) || []
  const skippedSteps = (raw.skipped_steps as string[]) || []
  const totalSteps = (raw.total_steps as number) || ONBOARDING_STEPS.length

  // Build enriched steps array with status
  const completedKeys = new Set(stepsCompleted.map(s => s.key))
  const skippedKeys = new Set(skippedSteps)

  const steps: EnrichedStep[] = ONBOARDING_STEPS.map(def => {
    let status: EnrichedStep['status'] = 'pending'
    let completedAt: string | null = null

    if (completedKeys.has(def.key)) {
      status = 'completed'
      const match = stepsCompleted.find(s => s.key === def.key)
      completedAt = match?.completedAt ?? null
    } else if (skippedKeys.has(def.key)) {
      status = 'skipped'
    }

    return {
      key: def.key,
      title: def.title,
      description: def.description,
      category: def.category,
      estimatedMinutes: def.estimatedMinutes,
      helpUrl: def.helpUrl,
      targetPath: def.targetPath,
      status,
      completedAt,
    }
  })

  return {
    id: raw.id as string,
    accountId: raw.account_id as string,
    onboardingType: raw.onboarding_type as OnboardingProgress['onboardingType'],
    currentStep: raw.current_step as number,
    totalSteps,
    stepsCompleted,
    isComplete: raw.is_complete as boolean,
    completedAt: raw.completed_at as string | null,
    skippedSteps,
    timeSpentMinutes: (raw.time_spent_minutes as number) || 0,
    percentComplete: Math.round((stepsCompleted.length / totalSteps) * 100),
    steps,
  }
}
