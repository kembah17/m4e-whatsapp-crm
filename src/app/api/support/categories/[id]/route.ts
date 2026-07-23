import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { updateCategory, deleteCategory } from '@/lib/support/categories'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    const category = await updateCategory(account.account_id, id, {
      name: body.name,
      description: body.description,
      icon: body.icon,
      color: body.color,
      auto_assign_to: body.auto_assign_to,
      sla_policy_id: body.sla_policy_id,
      position: body.position,
      is_active: body.is_active,
    })

    return NextResponse.json(category)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    await deleteCategory(account.account_id, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
