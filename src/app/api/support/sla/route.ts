import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getSLAPolicies, createSLAPolicy, seedDefaultSLAs } from '@/lib/support/sla'

export async function GET() {
  try {
    const account = await getCurrentAccount()

    // Seed defaults if none exist
    await seedDefaultSLAs(account.account_id).catch(() => {})

    const policies = await getSLAPolicies(account.account_id)
    return NextResponse.json(policies)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    const body = await req.json()

    const policy = await createSLAPolicy(account.account_id, {
      name: body.name,
      description: body.description,
      priority: body.priority,
      first_response_minutes: body.first_response_minutes,
      resolution_minutes: body.resolution_minutes,
      escalation_minutes: body.escalation_minutes,
      escalate_to: body.escalate_to,
      is_default: body.is_default,
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
