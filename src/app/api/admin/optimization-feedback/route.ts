import { NextResponse, type NextRequest } from 'next/server'
import {
  getFeedbackSummary,
  getInsights,
  updateInsightStatus,
  saveInsights,
  generateInsights,
  analyzePerformanceGaps,
  detectTrends,
  getTemplatePerformance,
  getPackagePerformance,
} from '@/lib/admin/feedback-engine'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { ABTest } from '@/types/optimization-feedback'

// GET /api/admin/optimization-feedback
// Query params: entity_type, entity_id, entity_name, action
// Actions: summary (default), insights, refresh, ab_tests
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const entityType = params.get('entity_type') as 'package_config' | 'campaign_template' | null
    const entityId = params.get('entity_id')
    const entityName = params.get('entity_name') || 'Unknown'
    const action = params.get('action') || 'summary'

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'summary': {
        // Get expected rates for campaign templates
        let expectedRates: { open_rate?: number | null; reply_rate?: number | null; conversion_rate?: number | null } | undefined

        if (entityType === 'campaign_template') {
          const db = supabaseAdmin()
          const { data: template } = await db
            .from('campaign_templates')
            .select('expected_open_rate, expected_reply_rate, expected_conversion_rate')
            .eq('id', entityId)
            .single()

          if (template) {
            expectedRates = {
              open_rate: template.expected_open_rate,
              reply_rate: template.expected_reply_rate,
              conversion_rate: template.expected_conversion_rate,
            }
          }
        }

        const summary = await getFeedbackSummary(entityType, entityId, entityName, expectedRates)
        return NextResponse.json({ summary })
      }

      case 'insights': {
        const statusFilter = params.get('status')?.split(',') || undefined
        const insights = await getInsights(entityType, entityId, statusFilter)
        return NextResponse.json({ insights })
      }

      case 'refresh': {
        // Force regenerate insights
        if (entityType === 'campaign_template') {
          const db = supabaseAdmin()
          const { data: template } = await db
            .from('campaign_templates')
            .select('expected_open_rate, expected_reply_rate, expected_conversion_rate')
            .eq('id', entityId)
            .single()

          const perf = await getTemplatePerformance(entityId)

          if (perf.actual.total_sent > 0 && template) {
            const gaps = analyzePerformanceGaps(
              {
                open_rate: template.expected_open_rate,
                reply_rate: template.expected_reply_rate,
                conversion_rate: template.expected_conversion_rate,
              },
              perf.actual
            )
            const trends = detectTrends(perf.snapshots)
            const newInsights = generateInsights({
              gaps,
              trends,
              entityName,
              entityType,
            })

            if (newInsights.length > 0) {
              await saveInsights(entityType, entityId, entityName, newInsights)
            }
          }
        }

        const insights = await getInsights(entityType, entityId, ['open'])
        return NextResponse.json({ insights, refreshed: true })
      }

      case 'ab_tests': {
        const db = supabaseAdmin()
        const { data, error } = await db
          .from('ab_tests')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        return NextResponse.json({ ab_tests: (data ?? []) as ABTest[] })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[admin/optimization-feedback GET] error:', err)
    return NextResponse.json(
      { error: 'Failed to get optimization feedback' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/optimization-feedback
// Update insight status or create A/B test
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case 'update_insight': {
        const { insight_id, status, applied_by, dismissed_reason } = body as {
          insight_id: string
          status: 'acknowledged' | 'applied' | 'dismissed'
          applied_by?: string
          dismissed_reason?: string
        }

        if (!insight_id || !status) {
          return NextResponse.json(
            { error: 'insight_id and status are required' },
            { status: 400 }
          )
        }

        await updateInsightStatus(insight_id, status, { applied_by, dismissed_reason })
        return NextResponse.json({ success: true })
      }

      case 'create_ab_test': {
        const db = supabaseAdmin()
        const { name, description, entity_type, entity_id, variant_a_version_id, variant_b_version_id, primary_metric, min_sample_size } = body as {
          name: string
          description?: string
          entity_type: string
          entity_id: string
          variant_a_version_id?: string
          variant_b_version_id?: string
          primary_metric: string
          min_sample_size?: number
        }

        const { data, error } = await db
          .from('ab_tests')
          .insert({
            name,
            description: description || null,
            entity_type,
            entity_id,
            variant_a_version_id: variant_a_version_id || null,
            variant_b_version_id: variant_b_version_id || null,
            primary_metric,
            min_sample_size: min_sample_size || 100,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ ab_test: data }, { status: 201 })
      }

      case 'update_ab_test': {
        const db = supabaseAdmin()
        const { test_id, ...updates } = body as { test_id: string; [key: string]: unknown }
        delete updates.action

        const { data, error } = await db
          .from('ab_tests')
          .update(updates)
          .eq('id', test_id)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ ab_test: data })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[admin/optimization-feedback PATCH] error:', err)
    return NextResponse.json(
      { error: 'Failed to update optimization feedback' },
      { status: 500 }
    )
  }
}
