import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCampaignReport, formatReportAsMarkdown } from '@/lib/campaigns/report-generator'

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
    const markdown = formatReportAsMarkdown(report)
    const safeName = report.campaign_name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="campaign-${safeName}-report.md"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate report'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
