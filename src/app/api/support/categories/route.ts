import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getCategories, createCategory, seedDefaultCategories } from '@/lib/support/categories'

export async function GET() {
  try {
    const account = await getCurrentAccount()

    // Seed defaults if none exist
    await seedDefaultCategories(account.account_id).catch(() => {})

    const categories = await getCategories(account.account_id)
    return NextResponse.json(categories)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    const body = await req.json()

    const category = await createCategory(account.account_id, {
      name: body.name,
      description: body.description,
      icon: body.icon,
      color: body.color,
      auto_assign_to: body.auto_assign_to,
      sla_policy_id: body.sla_policy_id,
      position: body.position,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
