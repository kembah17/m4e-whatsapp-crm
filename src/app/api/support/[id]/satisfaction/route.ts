import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { sendSatisfactionSurvey, recordSatisfactionResponse } from '@/lib/support/satisfaction'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('ticket_satisfaction')
      .select('*')
      .eq('ticket_id', id)
      .eq('account_id', account.account_id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    if (body.action === 'send_survey') {
      await sendSatisfactionSurvey(account.account_id, id)
      return NextResponse.json({ success: true, message: 'Survey sent' })
    }

    if (body.rating) {
      const satisfaction = await recordSatisfactionResponse(
        account.account_id,
        id,
        body.rating,
        body.feedback
      )
      return NextResponse.json(satisfaction)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
