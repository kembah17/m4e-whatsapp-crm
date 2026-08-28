import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
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

    const progress = await getOnboardingProgress(account.account_id)

    // Auto-detect completed steps
    const autoCompleted = await autoDetectCompletedSteps(account.account_id)

    return NextResponse.json({
      ...progress,
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
