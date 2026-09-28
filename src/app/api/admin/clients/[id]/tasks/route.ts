import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

async function verifySuperAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 })
  }
  return { userId: user.id }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const admin = supabaseAdmin()

    const { data: tasks, error } = await admin
      .from('client_onboarding_tasks')
      .select('*')
      .eq('account_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks || [] })
  } catch (err) {
    console.error('[admin/clients/[id]/tasks] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const admin = supabaseAdmin()

    const { taskId, status, notes } = body as {
      taskId: string
      status: 'pending' | 'in_progress' | 'completed' | 'skipped'
      notes?: string
    }

    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId and status are required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    if (status === 'completed') {
      updates.completed_by = auth.userId
      updates.completed_at = new Date().toISOString()
    } else {
      updates.completed_by = null
      updates.completed_at = null
    }

    const { data: updated, error: updateErr } = await admin
      .from('client_onboarding_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('account_id', id)
      .select()
      .maybeSingle()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log the task update
    await admin.from('client_provisioning_log').insert({
      account_id: id,
      action: 'task_status_changed',
      performed_by: auth.userId,
      details: { task_id: taskId, new_status: status },
    })

    return NextResponse.json({ task: updated })
  } catch (err) {
    console.error('[admin/clients/[id]/tasks] PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
