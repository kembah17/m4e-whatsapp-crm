import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { getBundlesByIndustry } from './registry'

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

export interface AutoApplyResult {
  applied: boolean
  bundleIds: string[]
  reason?: string
}

/**
 * Check if industry bundles need to be applied and apply them if needed.
 * Returns without action if bundles are already applied.
 * This is safe to call multiple times — it's idempotent.
 */
export async function autoApplyIndustryBundles(
  accountId: string,
  userId: string
): Promise<AutoApplyResult> {
  const admin = getAdmin()

  // Get account industry
  const { data: acct, error: acctErr } = await admin
    .from('accounts')
    .select('industry')
    .eq('id', accountId)
    .single()

  if (acctErr || !acct?.industry || acct.industry === 'custom') {
    return { applied: false, bundleIds: [], reason: 'No industry set' }
  }

  // Check if bundles already applied — pipelines exist for this account
  const { count: pipelineCount } = await admin
    .from('pipelines')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)

  if (pipelineCount && pipelineCount > 0) {
    return { applied: false, bundleIds: [], reason: 'Already applied' }
  }

  // Get bundles for this industry
  const bundles = getBundlesByIndustry(acct.industry)
  if (bundles.length === 0) {
    return { applied: false, bundleIds: [], reason: 'No bundles available' }
  }

  const appliedIds: string[] = []

  for (const bundle of bundles) {
    try {
      // Create pipeline
      if (bundle.pipeline) {
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
          console.error(`[AutoApply] Pipeline creation failed for ${bundle.id}:`, pipeErr)
          continue
        }

        // Create stages (pipeline_stages has no account_id — linked via pipeline_id)
        const stages = bundle.pipeline.stages.map((stage) => ({
          pipeline_id: pipeline.id,
          name: stage.name,
          color: stage.color,
          position: stage.position,
          description: stage.purpose,
        }))

        const { error: stagesErr } = await admin
          .from('pipeline_stages')
          .insert(stages)

        if (stagesErr) {
          console.error(`[AutoApply] Stages creation failed for ${bundle.id}:`, stagesErr)
          // Clean up the pipeline
          await admin.from('pipelines').delete().eq('id', pipeline.id)
          continue
        }
      }

      appliedIds.push(bundle.id)
    } catch (err) {
      console.error(`[AutoApply] Failed to apply bundle ${bundle.id}:`, err)
    }
  }

  return { applied: appliedIds.length > 0, bundleIds: appliedIds }
}
