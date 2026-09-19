import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const body = await req.json()
    const { tagName } = body

    if (!tagName || typeof tagName !== 'string') {
      return NextResponse.json(
        { error: 'tagName is required' },
        { status: 400 }
      )
    }

    const db = await createClient()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Find contacts with this import tag that were created in the last 5 minutes
    // and haven't been modified since import
    const { data: contacts, error: fetchError } = await db
      .from('contacts')
      .select('id, created_at, updated_at')
      .eq('account_id', ctx.accountId)
      .contains('tags', [tagName])
      .gte('created_at', fiveMinutesAgo)

    if (fetchError) throw fetchError

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No eligible contacts found. Undo is only available within 5 minutes of import.' },
        { status: 404 }
      )
    }

    // Filter to only contacts that haven't been modified since creation
    // (updated_at should be null or equal to created_at)
    const undoable = contacts.filter((c) => {
      if (!c.updated_at) return true
      const created = new Date(c.created_at).getTime()
      const updated = new Date(c.updated_at).getTime()
      return Math.abs(updated - created) < 2000 // within 2 seconds tolerance
    })

    if (undoable.length === 0) {
      return NextResponse.json(
        { error: 'Contacts have been modified since import and cannot be undone.' },
        { status: 409 }
      )
    }

    const ids = undoable.map((c) => c.id)

    // Delete the contacts
    const { error: deleteError } = await db
      .from('contacts')
      .delete()
      .eq('account_id', ctx.accountId)
      .in('id', ids)

    if (deleteError) throw deleteError

    return NextResponse.json({
      undone: ids.length,
      message: `Successfully removed ${ids.length} imported contact${ids.length !== 1 ? 's' : ''}.`,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
