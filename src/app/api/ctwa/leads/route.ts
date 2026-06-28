import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getCTWALeads } from '@/lib/ctwa/tracker'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sourceType = searchParams.get('source_type') || undefined
    const since = searchParams.get('since') || undefined

    const result = await getCTWALeads(ctx.accountId, { limit, offset, sourceType, since })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}
