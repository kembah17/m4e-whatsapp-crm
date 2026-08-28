import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// Onboarding steps for platform-only subscribers
export const ONBOARDING_STEPS = [
  {
    step: 1,
    key: 'welcome',
    title: 'Welcome to Your Business Growth Engine',
    description: 'Quick overview of what the platform can do for your business',
    estimatedMinutes: 2,
    action: 'watch_video',
  },
  {
    step: 2,
    key: 'import_contacts',
    title: 'Import Your Customer Database',
    description: 'Upload your existing contacts from Excel, CSV, or your phone',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/data-center',
  },
  {
    step: 3,
    key: 'connect_whatsapp',
    title: 'Connect Your WhatsApp Business',
    description: 'Link your WhatsApp Business number to start messaging customers',
    estimatedMinutes: 10,
    action: 'navigate',
    targetPath: '/settings',
  },
  {
    step: 4,
    key: 'create_template',
    title: 'Create Your First Message Template',
    description: 'Set up a reusable message template for customer outreach',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/templates',
  },
  {
    step: 5,
    key: 'setup_pipeline',
    title: 'Set Up Your Sales Pipeline',
    description: 'Organise your sales process with customisable stages',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/pipelines',
  },
  {
    step: 6,
    key: 'send_first_message',
    title: 'Send Your First Message',
    description: 'Reach out to a customer using WhatsApp or email',
    estimatedMinutes: 3,
    action: 'navigate',
    targetPath: '/contacts',
  },
  {
    step: 7,
    key: 'create_campaign',
    title: 'Launch Your First Campaign',
    description: 'Create a reactivation campaign to win back dormant customers',
    estimatedMinutes: 10,
    action: 'navigate',
    targetPath: '/campaigns',
  },
  {
    step: 8,
    key: 'explore_automation',
    title: 'Explore Automation',
    description: 'Set up automated workflows to save time on repetitive tasks',
    estimatedMinutes: 5,
    action: 'navigate',
    targetPath: '/automations',
  },
] as const

export type OnboardingStepKey = typeof ONBOARDING_STEPS[number]['key']

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
}

/**
 * Get or create onboarding progress for an account
 */
export async function getOnboardingProgress(
  accountId: string
): Promise<OnboardingProgress> {
  const db = supabaseAdmin()

  const { data: existing } = await db
    .from('platform_onboarding')
    .select('*')
    .eq('account_id', accountId)
    .single()

  if (existing) {
    return formatProgress(existing)
  }

  // Create new onboarding record
  const { data: newRecord } = await db
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

  return formatProgress(newRecord!)
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

  // Check contacts imported
  const { count: contactCount } = await db
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  if (contactCount && contactCount > 0) completed.push('import_contacts')

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

  // Check pipeline exists
  const { count: pipelineCount } = await db
    .from('pipeline_stages')
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
  const totalSteps = (raw.total_steps as number) || ONBOARDING_STEPS.length

  return {
    id: raw.id as string,
    accountId: raw.account_id as string,
    onboardingType: raw.onboarding_type as OnboardingProgress['onboardingType'],
    currentStep: raw.current_step as number,
    totalSteps,
    stepsCompleted,
    isComplete: raw.is_complete as boolean,
    completedAt: raw.completed_at as string | null,
    skippedSteps: (raw.skipped_steps as string[]) || [],
    timeSpentMinutes: (raw.time_spent_minutes as number) || 0,
    percentComplete: Math.round((stepsCompleted.length / totalSteps) * 100),
  }
}
