import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.AUTOMATION_CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const now = new Date()
    const threeDaysOut = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10)
    const todayStr = now.toISOString().slice(0, 10)

    // Find upcoming installment payments due within 3 days
    const { data: upcoming } = await db
      .from('installment_schedule')
      .select(`
        id, installment_plan_id, due_date, amount, status,
        installment_plans!inner(account_id, contact_id, status)
      `)
      .eq('status', 'pending')
      .gte('due_date', todayStr)
      .lte('due_date', threeDaysOut)

    if (!upcoming || upcoming.length === 0) {
      return NextResponse.json({ message: 'No upcoming installments', processed: 0 })
    }

    let processed = 0
    const results: Array<{ id: string; due_date: string; status: string }> = []

    for (const entry of upcoming) {
      const plan = entry.installment_plans as Record<string, unknown> | null
      if (!plan || plan.status !== 'active') continue

      // Check if reminder already sent (use notes field as simple flag)
      const { data: existing } = await db
        .from('installment_schedule')
        .select('notes')
        .eq('id', entry.id)
        .single()

      const notes = (existing?.notes as string) || ''
      if (notes.includes('reminder_sent')) continue

      // Mark reminder as sent
      await db
        .from('installment_schedule')
        .update({
          notes: notes ? `${notes}; reminder_sent:${todayStr}` : `reminder_sent:${todayStr}`,
        })
        .eq('id', entry.id)

      processed++
      results.push({
        id: entry.id,
        due_date: entry.due_date,
        status: 'reminder_logged',
      })
    }

    return NextResponse.json({
      message: `Processed ${processed} installment reminders`,
      processed,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
