// =============================================================================
// CITE Phase 2 — Evidence & Provenance Tracker
// Records what patterns/research/hypotheses informed each campaign
// =============================================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client';
import type {
  EvidenceSource,
  CampaignProvenance,
  CampaignEvidenceRecord,
  ProvenanceResult,
} from './phase2-types';
import type { PatternType } from './types';

// ─── Track Evidence ──────────────────────────────────────────────────────────

/**
 * Record what patterns, learnings, research, or hypotheses informed a campaign.
 * Creates campaign_evidence records and updates campaign provenance.
 */
export async function trackEvidence(
  campaignId: string,
  accountId: string,
  sources: EvidenceSource[],
  relationship: CampaignEvidenceRecord['relationship'] = 'informed_by',
  createdBy: string = 'system',
): Promise<CampaignEvidenceRecord[]> {
  const admin = supabaseAdmin();
  const records: CampaignEvidenceRecord[] = [];

  // 1. Insert evidence records
  for (const source of sources) {
    const record: CampaignEvidenceRecord = {
      campaign_id: campaignId,
      account_id: accountId,
      source_type: source.source_type,
      source_id: source.source_id,
      relationship,
      notes: source.description,
    };

    const { data, error } = await admin
      .from('campaign_evidence')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error(`Failed to track evidence for source ${source.source_id}:`, error.message);
      continue;
    }

    records.push(data as CampaignEvidenceRecord);
  }

  // 2. Update campaign provenance
  const patternIds = sources
    .filter(s => s.source_type === 'pattern')
    .map(s => s.source_id);
  const learningIds = sources
    .filter(s => s.source_type === 'learning')
    .map(s => s.source_id);
  const hypothesisIds = sources
    .filter(s => s.source_type === 'hypothesis')
    .map(s => s.source_id);
  const researchIds = sources
    .filter(s => s.source_type === 'research')
    .map(s => s.source_id);

  const provenance: CampaignProvenance = {
    created_by: createdBy,
    created_at: new Date().toISOString(),
    based_on_patterns: patternIds,
    based_on_learnings: learningIds,
    based_on_hypotheses: hypothesisIds,
    based_on_research: researchIds,
  };

  const evidenceSummary = {
    total_sources: sources.length,
    pattern_count: patternIds.length,
    learning_count: learningIds.length,
    hypothesis_count: hypothesisIds.length,
    research_count: researchIds.length,
    tracked_at: new Date().toISOString(),
  };

  await admin
    .from('campaigns')
    .update({
      provenance,
      evidence_summary: evidenceSummary,
      pattern_sources: patternIds,
    })
    .eq('id', campaignId)
    .eq('account_id', accountId);

  return records;
}

// ─── Get Provenance ──────────────────────────────────────────────────────────

/**
 * Returns the full provenance chain for a campaign:
 * what patterns, learnings, hypotheses, and research informed it.
 */
export async function getProvenance(
  campaignId: string,
  accountId: string,
): Promise<ProvenanceResult> {
  const admin = supabaseAdmin();

  // 1. Fetch campaign provenance
  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('provenance, evidence_summary, pattern_sources, hypothesis_id')
    .eq('id', campaignId)
    .eq('account_id', accountId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Campaign not found: ${campaignError?.message || 'no data'}`);
  }

  const provenance = (campaign.provenance as CampaignProvenance) || {
    created_by: 'unknown',
    created_at: '',
    based_on_patterns: [],
    based_on_learnings: [],
    based_on_hypotheses: [],
    based_on_research: [],
  };

  // 2. Fetch evidence chain
  const { data: evidenceRecords } = await admin
    .from('campaign_evidence')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  const evidenceChain = (evidenceRecords || []) as CampaignEvidenceRecord[];

  // 3. Fetch pattern details
  const patternIds = provenance.based_on_patterns || [];
  let patternsUsed: Array<{ id: string; name: string; pattern_type: PatternType }> = [];
  if (patternIds.length > 0) {
    const { data: patterns } = await admin
      .from('creative_patterns')
      .select('id, name, pattern_type')
      .in('id', patternIds);
    patternsUsed = (patterns || []) as Array<{ id: string; name: string; pattern_type: PatternType }>;
  }

  // 4. Fetch learning details
  const learningIds = provenance.based_on_learnings || [];
  let learningsUsed: Array<{ id: string; observation: string }> = [];
  if (learningIds.length > 0) {
    const { data: learnings } = await admin
      .from('creative_learnings')
      .select('id, observation')
      .in('id', learningIds);
    learningsUsed = (learnings || []) as Array<{ id: string; observation: string }>;
  }

  // 5. Fetch hypothesis details (from schema_objects)
  const hypothesisIds = provenance.based_on_hypotheses || [];
  let hypothesesTested: Array<{ id: string; statement: string }> = [];
  if (hypothesisIds.length > 0) {
    const { data: hypotheses } = await admin
      .from('schema_objects')
      .select('id, data')
      .in('id', hypothesisIds);
    hypothesesTested = (hypotheses || []).map((h) => ({
      id: h.id,
      statement: (h.data as Record<string, unknown>)?.statement as string || 'Unknown hypothesis',
    }));
  }

  return {
    campaign_id: campaignId,
    provenance,
    evidence_chain: evidenceChain,
    patterns_used: patternsUsed,
    learnings_used: learningsUsed,
    hypotheses_tested: hypothesesTested,
  };
}

// ─── Auto-populate Provenance on Campaign Creation ───────────────────────────

/**
 * Call this when a campaign is created with pattern/hypothesis context.
 * Automatically records the evidence trail.
 */
export async function autoPopulateProvenance(
  campaignId: string,
  accountId: string,
  context: {
    selectedPatternIds?: string[];
    selectedHypothesisIds?: string[];
    selectedLearningIds?: string[];
    createdBy?: string;
    decisionRationale?: string;
  },
): Promise<void> {
  const sources: EvidenceSource[] = [];

  for (const id of context.selectedPatternIds || []) {
    sources.push({ source_type: 'pattern', source_id: id });
  }
  for (const id of context.selectedHypothesisIds || []) {
    sources.push({ source_type: 'hypothesis', source_id: id });
  }
  for (const id of context.selectedLearningIds || []) {
    sources.push({ source_type: 'learning', source_id: id });
  }

  if (sources.length > 0) {
    await trackEvidence(
      campaignId,
      accountId,
      sources,
      'informed_by',
      context.createdBy || 'system',
    );
  }

  // Update decision rationale if provided
  if (context.decisionRationale) {
    const admin = supabaseAdmin();
    const { data: campaign } = await admin
      .from('campaigns')
      .select('provenance')
      .eq('id', campaignId)
      .single();

    const existing = (campaign?.provenance as CampaignProvenance) || {
      created_by: context.createdBy || 'system',
      created_at: new Date().toISOString(),
      based_on_patterns: [],
      based_on_learnings: [],
      based_on_hypotheses: [],
      based_on_research: [],
    };

    await admin
      .from('campaigns')
      .update({
        provenance: {
          ...existing,
          decision_rationale: context.decisionRationale,
        },
      })
      .eq('id', campaignId);
  }
}

// ─── Post-Campaign Evidence Update ───────────────────────────────────────────

/**
 * After pattern extraction, link the campaign back to the patterns it validated/contradicted.
 */
export async function updatePostCampaignEvidence(
  campaignId: string,
  accountId: string,
  validatedPatternIds: string[],
  contradictedPatternIds: string[],
): Promise<void> {
  const validatedSources: EvidenceSource[] = validatedPatternIds.map(id => ({
    source_type: 'pattern',
    source_id: id,
    description: 'Pattern validated by campaign results',
  }));

  const contradictedSources: EvidenceSource[] = contradictedPatternIds.map(id => ({
    source_type: 'pattern',
    source_id: id,
    description: 'Pattern contradicted by campaign results',
  }));

  if (validatedSources.length > 0) {
    await trackEvidence(campaignId, accountId, validatedSources, 'validated_pattern');
  }
  if (contradictedSources.length > 0) {
    await trackEvidence(campaignId, accountId, contradictedSources, 'contradicted_pattern');
  }
}
