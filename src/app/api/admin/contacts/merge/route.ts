import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = supabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()
    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { primaryContactId, secondaryContactId, accountId } = body

    if (!primaryContactId || !secondaryContactId || !accountId) {
      return NextResponse.json(
        { error: 'primaryContactId, secondaryContactId, and accountId are required' },
        { status: 400 }
      )
    }

    if (primaryContactId === secondaryContactId) {
      return NextResponse.json(
        { error: 'Cannot merge a contact with itself' },
        { status: 400 }
      )
    }

    // Verify both contacts exist and belong to the account
    const [{ data: primary }, { data: secondary }] = await Promise.all([
      db.from('contacts').select('*').eq('id', primaryContactId).eq('account_id', accountId).single(),
      db.from('contacts').select('*').eq('id', secondaryContactId).eq('account_id', accountId).single(),
    ])

    if (!primary || !secondary) {
      return NextResponse.json(
        { error: 'One or both contacts not found in this account' },
        { status: 404 }
      )
    }

    // 1. Move conversations from secondary to primary
    const { count: convCount } = await db
      .from('conversations')
      .update({ contact_id: primaryContactId })
      .eq('contact_id', secondaryContactId)
      .eq('account_id', accountId)
      .select('*', { count: 'exact', head: true })

    // 2. Move messages from secondary to primary
    const { count: msgCount } = await db
      .from('messages')
      .update({ contact_id: primaryContactId })
      .eq('contact_id', secondaryContactId)
      .select('*', { count: 'exact', head: true })

    // 3. Move deals from secondary to primary
    const { count: dealCount } = await db
      .from('deals')
      .update({ contact_id: primaryContactId })
      .eq('contact_id', secondaryContactId)
      .select('*', { count: 'exact', head: true })

    // 4. Copy tags from secondary that primary doesn't have
    const primaryTags: string[] = primary.tags || []
    const secondaryTags: string[] = secondary.tags || []
    const newTags = secondaryTags.filter((t: string) => !primaryTags.includes(t))
    const mergedTags = [...primaryTags, ...newTags]

    // 5. Update primary with missing identifiers from secondary
    const identifierUpdates: Record<string, unknown> = {}
    if (!primary.bsuid && secondary.bsuid) identifierUpdates.bsuid = secondary.bsuid
    if (!primary.whatsapp_username && secondary.whatsapp_username) identifierUpdates.whatsapp_username = secondary.whatsapp_username
    if (!primary.email && secondary.email) identifierUpdates.email = secondary.email
    if (!primary.phone && secondary.phone) identifierUpdates.phone = secondary.phone

    await db.from('contacts').update({
      ...identifierUpdates,
      tags: mergedTags,
      updated_at: new Date().toISOString(),
    }).eq('id', primaryContactId)

    // 6. Delete secondary contact
    await db.from('contacts').delete().eq('id', secondaryContactId)

    // 7. Log the merge
    await db.from('system_logs').insert({
      level: 'info',
      category: 'contacts',
      message: `Contact merge: ${secondaryContactId} merged into ${primaryContactId}`,
      metadata: {
        primary_contact_id: primaryContactId,
        secondary_contact_id: secondaryContactId,
        conversations_moved: convCount ?? 0,
        messages_moved: msgCount ?? 0,
        deals_moved: dealCount ?? 0,
        tags_added: newTags,
        identifiers_copied: Object.keys(identifierUpdates),
      },
      user_id: user.id,
      account_id: accountId,
    })

    // Fetch updated primary
    const { data: merged } = await db
      .from('contacts')
      .select('*')
      .eq('id', primaryContactId)
      .single()

    return NextResponse.json({
      merged,
      summary: {
        conversations_moved: convCount ?? 0,
        messages_moved: msgCount ?? 0,
        deals_moved: dealCount ?? 0,
        tags_added: newTags.length,
        identifiers_copied: Object.keys(identifierUpdates).length,
      },
    })
  } catch (err) {
    console.error('[contact-merge] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
