import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getContactLoyalty } from '@/lib/loyalty'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contactId } = await params
    const loyalty = await getContactLoyalty(account.account_id, contactId)
    return NextResponse.json({ loyalty })
  } catch (err) {
    console.error('Contact loyalty error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get loyalty details' },
      { status: 500 }
    )
  }
}
