import { NextResponse } from 'next/server'
import { createClient as createBrowserClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

/**
 * GET /api/admin/whatsapp-disconnect/history
 * Super-admin only: fetch disconnect audit log with account and user names.
 */
export async function GET() {
  try {
    // 1. Authenticate the caller
    const supabase = await createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify super-admin
    const admin = supabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 })
    }

    // 3. Fetch disconnect audit logs
    const { data: logs, error: logsError } = await admin
      .from('disconnect_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (logsError) {
      console.error('[disconnect-history] Failed to fetch logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch disconnect history' },
        { status: 500 },
      )
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ entries: [] })
    }

    // 4. Enrich with account names and disconnected-by names
    const accountIds = [...new Set(logs.map((l) => l.account_id))]
    const userIds = [...new Set(logs.map((l) => l.disconnected_by))]

    const { data: accounts } = await admin
      .from('accounts')
      .select('id, name')
      .in('id', accountIds)

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, user_id, full_name')
      .in('user_id', userIds)

    const accountMap = new Map(
      (accounts || []).map((a) => [a.id, a.name]),
    )
    // Map by user_id since disconnected_by stores auth user id
    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p.full_name]),
    )

    const entries = logs.map((log) => ({
      id: log.id,
      account_id: log.account_id,
      account_name: accountMap.get(log.account_id) || 'Unknown Account',
      disconnected_by: log.disconnected_by,
      disconnected_by_name: profileMap.get(log.disconnected_by) || 'Unknown User',
      disconnect_type: log.disconnect_type,
      reason: log.reason,
      waba_id: log.waba_id,
      phone_number_id: log.phone_number_id,
      actions_taken: log.actions_taken || [],
      actions_failed: log.actions_failed || [],
      created_at: log.created_at,
    }))

    return NextResponse.json({ entries })
  } catch (err) {
    console.error('[disconnect-history] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
