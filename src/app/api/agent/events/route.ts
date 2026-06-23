import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for agent operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Auth: require AUTOMATION_CRON_SECRET header
function checkAuth(request: Request): boolean {
  const secret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')
  return secret === process.env.AUTOMATION_CRON_SECRET
}

// GET: Poll for pending events
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  const db = getServiceClient()
  const { data, error } = await db.rpc('claim_agent_events', { batch_size: limit })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data || [], count: data?.length || 0 })
}

// POST: Submit event result
export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 })
  }

  const db = getServiceClient()
  const { error } = await db.rpc('complete_agent_event', {
    event_id: body.event_id,
    event_result: body.result || null,
    event_error: body.error || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// PUT: Queue a new event manually (for testing or direct API use)
export async function PUT(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.event_type || !body?.account_id) {
    return NextResponse.json({ error: 'event_type and account_id required' }, { status: 400 })
  }

  const db = getServiceClient()
  const { data, error } = await db
    .from('agent_events')
    .insert({
      account_id: body.account_id,
      event_type: body.event_type,
      payload: body.payload || {},
      priority: body.priority || 5,
      contact_id: body.contact_id || null,
      automation_id: body.automation_id || null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, event_id: data.id }, { status: 201 })
}
