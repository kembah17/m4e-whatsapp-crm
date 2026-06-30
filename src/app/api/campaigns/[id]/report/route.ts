import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCampaignReport } from '@/lib/campaigns/report-generator'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const report = await generateCampaignReport(id, supabase)
    return NextResponse.json({ report })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate report'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
