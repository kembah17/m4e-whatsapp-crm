import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import {
  getOnboardingProgress,
  completeStep,
  skipStep,
  resetOnboarding,
  autoDetectCompletedSteps,
} from '@/lib/subscriber-monitoring/onboarding'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check the accounts table first - if onboarding_completed is true there,
    // respect it even if platform_onboarding has no record or shows incomplete
    const supabase = await createClient()
    const { data: accountData } = await supabase
      .from('accounts')
      .select('onboarding_completed')
      .eq('id', account.account_id)
      .single()

    const accountOnboardingDone = accountData?.onboarding_completed === true

    const progress = await getOnboardingProgress(account.account_id)

    // Auto-detect completed steps
    const autoCompleted = await autoDetectCompletedSteps(account.account_id)

    return NextResponse.json({
      ...progress,
      // Include both field names for compatibility with DashboardShell
      onboarding_completed: progress.isComplete || accountOnboardingDone,
      autoDetectedSteps: autoCompleted,
    })
  } catch (error) {
    console.error('[Onboarding API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, stepKey, type } = body

    switch (action) {
      case 'complete': {
        if (!stepKey) {
          return NextResponse.json({ error: 'stepKey is required' }, { status: 400 })
        }
        const progress = await completeStep(account.account_id, stepKey)
        return NextResponse.json(progress)
      }

      case 'skip': {
        if (!stepKey) {
          return NextResponse.json({ error: 'stepKey is required' }, { status: 400 })
        }
        const progress = await skipStep(account.account_id, stepKey)
        return NextResponse.json(progress)
      }

      case 'reset': {
        const progress = await resetOnboarding(account.account_id, type || 'self_service')
        return NextResponse.json(progress)
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: complete, skip, reset' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Onboarding API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
