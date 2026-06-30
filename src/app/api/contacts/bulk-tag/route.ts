import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createClient } from '@supabase/supabase-js'
import { suggestTagsForContacts } from '@/lib/ai/bulk-tagger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/contacts/bulk-tag
 * Body: { contactIds: string[] }
 * Returns AI tag suggestions for the given contacts.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const contactIds: string[] = body.contactIds

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'contactIds array required' }, { status: 400 })
    }

    if (contactIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 contacts per batch' }, { status: 400 })
    }

    // Fetch contact data
    const { data: contacts, error: contactsErr } = await supabaseAdmin
      .from('contacts')
      .select(`
        id, name, phone, notes, status,
        contact_tags ( tag_id, tags ( id, name ) )
      `)
      .eq('account_id', ctx.accountId)
      .in('id', contactIds)

    if (contactsErr) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Fetch recent messages for each contact
    const contactsWithMessages = await Promise.all(
      (contacts || []).map(async (contact) => {
        const { data: messages } = await supabaseAdmin
          .from('messages')
          .select('body, direction')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(5)

        const existingTags = (contact.contact_tags as unknown as Array<{ tags: { name: string } | null }>)
          ?.map((ct) => ct.tags?.name)
          .filter(Boolean) as string[] || []

        return {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          notes: contact.notes,
          status: contact.status,
          existingTags,
          recentMessages: (messages || []).map((m) => `${m.direction}: ${m.body}`).join('\n'),
        }
      })
    )

    // Fetch all existing tags for the account
    const { data: allTags } = await supabaseAdmin
      .from('tags')
      .select('id, name')
      .eq('account_id', ctx.accountId)

    const existingTagNames = (allTags || []).map((t) => t.name)

    // Get AI suggestions
    const suggestions = await suggestTagsForContacts(
      contactsWithMessages,
      existingTagNames,
      ctx.accountId,
    )

    return NextResponse.json({ suggestions })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * PUT /api/contacts/bulk-tag
 * Body: { assignments: Array<{ contactId: string, tags: string[] }> }
 * Applies accepted tag suggestions to contacts.
 */
export async function PUT(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const assignments: Array<{ contactId: string; tags: string[] }> = body.assignments

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'assignments array required' }, { status: 400 })
    }

    // Fetch existing tags for the account
    const { data: existingTags } = await supabaseAdmin
      .from('tags')
      .select('id, name')
      .eq('account_id', ctx.accountId)

    const tagMap = new Map((existingTags || []).map((t) => [t.name.toLowerCase(), t.id]))

    let applied = 0

    for (const assignment of assignments) {
      for (const tagName of assignment.tags) {
        let tagId = tagMap.get(tagName.toLowerCase())

        // Create tag if it doesn't exist
        if (!tagId) {
          const { data: newTag, error: tagErr } = await supabaseAdmin
            .from('tags')
            .insert({ account_id: ctx.accountId, name: tagName })
            .select('id')
            .single()

          if (tagErr || !newTag) continue
          tagId = newTag.id
          tagMap.set(tagName.toLowerCase(), tagId)
        }

        // Link tag to contact (upsert to avoid duplicates)
        const { error: linkErr } = await supabaseAdmin
          .from('contact_tags')
          .upsert(
            { contact_id: assignment.contactId, tag_id: tagId },
            { onConflict: 'contact_id,tag_id' }
          )

        if (!linkErr) applied++
      }
    }

    // Log the AI tag suggestions as applied
    await supabaseAdmin
      .from('ai_tag_suggestions')
      .insert(
        assignments.map((a) => ({
          account_id: ctx.accountId,
          contact_id: a.contactId,
          suggested_tags: a.tags,
          confidence: 1,
          reasoning: 'Applied by user',
          status: 'applied',
        }))
      )

    return NextResponse.json({ applied, total: assignments.length })
  } catch (err) {
    return toErrorResponse(err)
  }
}
