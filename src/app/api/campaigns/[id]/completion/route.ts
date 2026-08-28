import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, extension_weeks } = body

    // Get user's account_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    // Verify campaign belongs to this account
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, status, account_id, template_slug, created_at, completed_at')
      .eq('id', id)
      .eq('account_id', profile.account_id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    switch (action) {
      case 'extend': {
        // Extend campaign by reactivating it with new end date
        const weeks = extension_weeks ?? 2
        const newEndDate = new Date()
        newEndDate.setDate(newEndDate.getDate() + weeks * 7)

        const { error: updateErr } = await supabase
          .from('campaigns')
          .update({
            status: 'active',
            completed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateErr) throw updateErr

        // Log the extension event
        await supabase.from('campaign_events').insert({
          campaign_id: id,
          account_id: profile.account_id,
          event_type: 'campaign_extended',
          event_data: { extension_weeks: weeks, new_end_date: newEndDate.toISOString() },
        })

        return NextResponse.json({ success: true, message: `Campaign extended by ${weeks} weeks` })
      }

      case 'clone': {
        // Create a new campaign from the same template
        const { data: newCampaign, error: cloneErr } = await supabase
          .from('campaigns')
          .insert({
            account_id: profile.account_id,
            name: `${campaign.name} (Copy)`,
            status: 'draft',
            template_slug: campaign.template_slug,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (cloneErr) throw cloneErr

        return NextResponse.json({
          success: true,
          message: 'Campaign cloned as draft',
          new_campaign_id: newCampaign?.id,
        })
      }

      case 'transition': {
        // Create a transition recommendation
        const { error: transErr } = await supabase
          .from('package_transitions')
          .insert({
            account_id: profile.account_id,
            transition_type: 'campaign_completion',
            recommendation: 'recommend',
            recommendation_text: `Campaign "${campaign.name}" completed successfully. Consider transitioning to the next package tier for continued growth.`,
            quantitative_scores: {},
            qualitative_scores: {},
            created_by: user.id,
          })

        if (transErr) throw transErr

        return NextResponse.json({ success: true, message: 'Transition recommendation saved' })
      }

      case 'archive': {
        // Archive the campaign
        const { error: archiveErr } = await supabase
          .from('campaigns')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (archiveErr) throw archiveErr

        // Log archive event
        await supabase.from('campaign_events').insert({
          campaign_id: id,
          account_id: profile.account_id,
          event_type: 'campaign_archived',
          event_data: { archived_at: new Date().toISOString() },
        })

        return NextResponse.json({ success: true, message: 'Campaign archived' })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action failed'
    console.error('[campaigns/completion POST] error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
