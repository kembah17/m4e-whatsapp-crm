import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { getBundleById } from '@/lib/bundles/registry'
import { getFlowTemplate } from '@/lib/flows/templates'
import { getTemplate } from '@/lib/automations/templates'
import { insertSteps, type BuilderStepInput } from '@/lib/automations/steps-tree'
import { SEGMENT_TEMPLATES } from '@/lib/segments/presets'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

// Allow up to 60s for bundle provisioning (many sequential DB operations)
export const maxDuration = 60

// Lazy admin client — bypasses RLS for bundle provisioning.
let _admin: SupabaseClient | null = null
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _admin
}

// ── Types ───────────────────────────────────────────────────

interface CreatedPipeline {
  id: string
  name: string
  stageCount: number
}

interface CreatedItem {
  id: string
  name: string
}

interface FailedItem {
  slug: string
  error: string
}

// ── Individual creation helpers (for parallel execution) ────

async function createFlow(
  admin: SupabaseClient,
  userId: string,
  accountId: string,
  slug: string,
): Promise<{ created?: CreatedItem; failed?: FailedItem }> {
  try {
    const template = getFlowTemplate(slug)
    if (!template) {
      return { failed: { slug, error: `Template "${slug}" not found` } }
    }

    const { data: flow, error: flowErr } = await admin
      .from('flows')
      .insert({
        user_id: userId,
        account_id: accountId,
        name: template.name,
        description: template.description,
        status: 'draft',
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        entry_node_id: template.entry_node_id,
      })
      .select()
      .single()

    if (flowErr || !flow) {
      return { failed: { slug, error: flowErr?.message ?? 'Insert failed' } }
    }

    if (template.nodes.length > 0) {
      const { error: nodesErr } = await admin.from('flow_nodes').insert(
        template.nodes.map((n) => ({
          flow_id: flow.id,
          node_key: n.node_key,
          node_type: n.node_type,
          config: n.config,
        })),
      )
      if (nodesErr) {
        await admin.from('flows').delete().eq('id', flow.id)
        return { failed: { slug, error: nodesErr.message } }
      }
    }

    return { created: { id: flow.id, name: flow.name } }
  } catch (err) {
    return {
      failed: {
        slug,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

async function createAutomation(
  admin: SupabaseClient,
  userId: string,
  accountId: string,
  slug: string,
): Promise<{ created?: CreatedItem; failed?: FailedItem }> {
  try {
    const template = getTemplate(slug)
    if (!template) {
      return { failed: { slug, error: `Template "${slug}" not found` } }
    }

    const { data: automation, error: autoErr } = await admin
      .from('automations')
      .insert({
        user_id: userId,
        account_id: accountId,
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        is_active: false,
      })
      .select()
      .single()

    if (autoErr || !automation) {
      return {
        failed: { slug, error: autoErr?.message ?? 'Insert failed' },
      }
    }

    if (template.steps && template.steps.length > 0) {
      const stepsErr = await insertSteps(
        automation.id,
        template.steps as unknown as BuilderStepInput[],
      )
      if (stepsErr) {
        await admin.from('automations').delete().eq('id', automation.id)
        return { failed: { slug, error: stepsErr } }
      }
    }

    return { created: { id: automation.id, name: automation.name } }
  } catch (err) {
    return {
      failed: {
        slug,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

async function createSegment(
  admin: SupabaseClient,
  accountId: string,
  segmentId: string,
): Promise<{ created?: CreatedItem; failed?: FailedItem }> {
  try {
    const preset = SEGMENT_TEMPLATES.find((t) => t.id === segmentId)
    if (!preset) {
      return {
        failed: {
          slug: segmentId,
          error: `Segment preset "${segmentId}" not found`,
        },
      }
    }

    const { data: segment, error: segErr } = await admin
      .from('segments')
      .insert({
        account_id: accountId,
        name: preset.name,
        description: preset.description,
        rules: preset.rules,
        contact_count: 0,
        last_calculated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (segErr || !segment) {
      return {
        failed: {
          slug: segmentId,
          error: segErr?.message ?? 'Insert failed',
        },
      }
    }

    return { created: { id: segment.id, name: segment.name } }
  } catch (err) {
    return {
      failed: {
        slug: segmentId,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

// ── POST /api/bundles/apply ─────────────────────────────────

export async function POST(request: Request) {
  try {
    // Rate limit
    const rlIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const rl = checkRateLimit(`bundles:${rlIp}`, RATE_LIMITS.general)
    if (!rl.success) return rateLimitResponse(rl)

    // Auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    // Parse body
    const body = (await request.json().catch(() => null)) as {
      bundleId?: string
    } | null
    if (!body?.bundleId) {
      return NextResponse.json(
        { error: 'bundleId is required' },
        { status: 400 },
      )
    }

    // Load bundle
    const bundle = getBundleById(body.bundleId)
    if (!bundle) {
      return NextResponse.json(
        { error: `Unknown bundle "${body.bundleId}"` },
        { status: 404 },
      )
    }

    const admin = getAdmin()
    const userId = user.id

    // ── 1. Create Pipeline + Stages (sequential — stages need pipeline ID)
    let createdPipeline: CreatedPipeline | null = null
    try {
      const { data: pipeline, error: pipeErr } = await admin
        .from('pipelines')
        .insert({
          user_id: userId,
          account_id: accountId,
          name: bundle.pipeline.name,
        })
        .select()
        .single()

      if (pipeErr || !pipeline) {
        throw new Error(pipeErr?.message ?? 'Pipeline insert failed')
      }

      const stagesPayload = bundle.pipeline.stages.map((s) => ({
        pipeline_id: pipeline.id,
        name: s.name,
        color: s.color,
        position: s.position,
        description: s.purpose,
      }))

      const { error: stagesErr } = await admin
        .from('pipeline_stages')
        .insert(stagesPayload)

      if (stagesErr) {
        await admin.from('pipelines').delete().eq('id', pipeline.id)
        throw new Error(stagesErr.message)
      }

      createdPipeline = {
        id: pipeline.id,
        name: pipeline.name,
        stageCount: bundle.pipeline.stages.length,
      }
    } catch (err) {
      console.error('[BUNDLE_APPLY] Pipeline creation failed:', err)
    }

    // ── 2. Create Flows, Automations, Segments IN PARALLEL ──
    // These are completely independent of each other and of the pipeline.
    const [flowResults, automationResults, segmentResults] = await Promise.all([
      // All flows in parallel
      Promise.all(
        bundle.suggested_flows.map((slug) =>
          createFlow(admin, userId, accountId, slug),
        ),
      ),
      // All automations in parallel
      Promise.all(
        bundle.suggested_automations.map((suggested) =>
          createAutomation(admin, userId, accountId, suggested.slug),
        ),
      ),
      // All segments in parallel
      Promise.all(
        bundle.suggested_segments.map((segmentId) =>
          createSegment(admin, accountId, segmentId),
        ),
      ),
    ])

    // Collect results
    const createdFlows: CreatedItem[] = []
    const failedFlows: FailedItem[] = []
    for (const r of flowResults) {
      if (r.created) createdFlows.push(r.created)
      if (r.failed) failedFlows.push(r.failed)
    }

    const createdAutomations: CreatedItem[] = []
    const failedAutomations: FailedItem[] = []
    for (const r of automationResults) {
      if (r.created) createdAutomations.push(r.created)
      if (r.failed) failedAutomations.push(r.failed)
    }

    const createdSegments: CreatedItem[] = []
    const failedSegments: FailedItem[] = []
    for (const r of segmentResults) {
      if (r.created) createdSegments.push(r.created)
      if (r.failed) failedSegments.push(r.failed)
    }

    // ── 3. Build response ─────────────────────────────────
    const failures = [
      ...failedFlows.map((f) => ({ type: 'flow' as const, ...f })),
      ...failedAutomations.map((f) => ({ type: 'automation' as const, ...f })),
      ...failedSegments.map((f) => ({ type: 'segment' as const, ...f })),
    ]

    return NextResponse.json(
      {
        success: true,
        bundleId: bundle.id,
        bundleName: bundle.name,
        created: {
          pipeline: createdPipeline,
          flows: createdFlows,
          automations: createdAutomations,
          segments: createdSegments,
        },
        failures: failures.length > 0 ? failures : undefined,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[BUNDLE_APPLY] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
