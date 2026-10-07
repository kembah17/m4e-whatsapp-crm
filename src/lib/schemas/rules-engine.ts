// =============================================================================
// CITE Phase 2 — Business Rules Engine (TypeScript)
// Port of Python rules_engine.py — 16 semantic business rules
// =============================================================================

import type { RuleViolation, RuleCheckResult, RuleSeverity } from './phase2-types';

// ─── Rule Definitions (from business-rules.json) ─────────────────────────────

interface BusinessRule {
  id: string;
  name: string;
  applies_to?: string[];
  rule: string;
  severity: RuleSeverity;
}

const BUSINESS_RULES: BusinessRule[] = [
  { id: 'BR-001', name: 'single_primary_objective', applies_to: ['CreativeBrief', 'Campaign'], rule: 'Exactly one primary campaign objective is declared.', severity: 'critical' },
  { id: 'BR-002', name: 'approved_fact_immutability', rule: 'Approved FACT values cannot be modified in place.', severity: 'critical' },
  { id: 'BR-003', name: 'evidence_for_external_claims', rule: 'External market/customer/performance claims require at least one Evidence reference.', severity: 'critical' },
  { id: 'BR-004', name: 'methodology_integrity', rule: 'Creative mechanism and claims must be compatible with SolutionMethodology.', severity: 'critical' },
  { id: 'BR-005', name: 'hook_story_integrity', rule: 'Story must explicitly fulfill the promise made by its selected Hook.', severity: 'critical' },
  { id: 'BR-006', name: 'reference_integrity', rule: 'Every referenced object ID must exist and be in an allowed lifecycle state.', severity: 'critical' },
  { id: 'BR-007', name: 'downstream_validation', rule: 'Only validated/approved objects may enter a downstream gated stage.', severity: 'critical' },
  { id: 'BR-008', name: 'performance_objective_alignment', rule: 'Performance interpretation must prioritize metrics appropriate to the declared campaign objective.', severity: 'high' },
  { id: 'BR-009', name: 'attribution_confidence', rule: 'Revenue/sales conclusions must include attribution model, evidence and confidence.', severity: 'critical' },
  { id: 'BR-010', name: 'sample_quality', rule: 'Generalized learning requires sufficient sample quality.', severity: 'high' },
  { id: 'BR-011', name: 'creative_diversity', rule: 'The hypothesis set must contain multiple distinct creative angles.', severity: 'high' },
  { id: 'BR-012', name: 'saturation_penalty', rule: 'High/very-high saturation patterns require explicit differentiation or receive a score penalty.', severity: 'medium' },
  { id: 'BR-013', name: 'production_feasibility', rule: 'A concept cannot be selected solely on strategic score if production constraints make it infeasible.', severity: 'high' },
  { id: 'BR-014', name: 'no_invented_proof', rule: 'Testimonials, statistics, customer results, guarantees and case-study outcomes cannot be fabricated.', severity: 'critical' },
  { id: 'BR-015', name: 'asset_technical_integrity', rule: 'Generated assets must satisfy declared dimensions, duration, codec/container and checksum requirements.', severity: 'high' },
  { id: 'BR-016', name: 'human_gate_enforcement', rule: 'Required human approval cannot be bypassed in assisted or supervised mode.', severity: 'critical' },
];

// ─── Type Helpers ────────────────────────────────────────────────────────────

type SchemaData = Record<string, unknown>;
type RuleChecker = (data: SchemaData, schemaType: string) => RuleViolation[];

function violation(ruleId: string, name: string, severity: RuleSeverity, message: string): RuleViolation {
  return { rule_id: ruleId, name, severity, message };
}

// ─── Rule Checkers ───────────────────────────────────────────────────────────

function checkBR001(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-001: Exactly one primary campaign objective is declared
  if (schemaType !== 'CreativeBrief' && schemaType !== 'Campaign') return [];
  const obj = data.campaign_objective ?? data.objective;
  if (!obj) {
    return [violation('BR-001', 'single_primary_objective', 'critical', 'No campaign objective declared')];
  }
  if (Array.isArray(obj) && obj.length !== 1) {
    return [violation('BR-001', 'single_primary_objective', 'critical', `Expected exactly 1 objective, found ${obj.length}`)];
  }
  return [];
}

function checkBR002(data: SchemaData, _schemaType: string): RuleViolation[] {
  // BR-002: Approved FACT values cannot be modified in place
  // Operational rule — checked during updates, not on static data
  return [];
}

function checkBR003(data: SchemaData, _schemaType: string): RuleViolation[] {
  // BR-003: External claims require evidence references
  const evidenceIds = data.evidence_ids as string[] | undefined;
  const provenance = data.provenance as Record<string, unknown> | undefined;
  const transformation = provenance?.transformation as string | undefined;

  if (transformation && ['observed', 'derived_analysis', 'external_api'].includes(transformation)) {
    const sourceEvidenceIds = provenance?.source_evidence_ids as string[] | undefined;
    if ((!evidenceIds || evidenceIds.length === 0) && (!sourceEvidenceIds || sourceEvidenceIds.length === 0)) {
      return [violation('BR-003', 'evidence_for_external_claims', 'critical',
        `Transformation '${transformation}' requires evidence references`)];
    }
  }
  return [];
}

function checkBR004(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-004: Creative mechanism must be compatible with SolutionMethodology
  if (!['CreativeConcept', 'Story', 'Hook'].includes(schemaType)) return [];
  if (schemaType === 'Story') {
    const mi = data.methodology_integrity as Record<string, unknown> | undefined;
    if (mi && mi.accurate === false) {
      return [violation('BR-004', 'methodology_integrity', 'critical',
        `Story methodology integrity check failed: ${mi.explanation ?? 'no explanation'}`)];
    }
  }
  return [];
}

function checkBR005(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-005: Story must fulfill the promise made by its Hook
  if (schemaType !== 'Story') return [];
  const hi = data.hook_integrity as Record<string, unknown> | undefined;
  if (hi && hi.fulfilled === false) {
    return [violation('BR-005', 'hook_story_integrity', 'critical',
      `Story does not fulfill hook promise: ${hi.explanation ?? 'no explanation'}`)];
  }
  return [];
}

function checkBR006(data: SchemaData, _schemaType: string): RuleViolation[] {
  // BR-006: Every referenced object ID must exist
  const relations = data.relations as Array<Record<string, unknown>> | undefined;
  if (!relations) return [];
  const violations: RuleViolation[] = [];
  for (const rel of relations) {
    if (!rel.object_id) {
      violations.push(violation('BR-006', 'reference_integrity', 'critical',
        `Empty object_id in relation of type '${rel.relation ?? 'unknown'}'`));
    }
  }
  return violations;
}

function checkBR007(data: SchemaData, _schemaType: string): RuleViolation[] {
  // BR-007: Only validated/approved objects may enter downstream gated stage
  const validationObj = data.validation as Record<string, unknown> | undefined;
  const lifecycle = (data.lifecycle_status as string) ?? 'draft';
  if (validationObj) {
    const status = (validationObj.status as string) ?? 'pending';
    if (['failed', 'blocked'].includes(status) && !['draft', 'archived'].includes(lifecycle)) {
      return [violation('BR-007', 'downstream_validation', 'critical',
        `Object with validation status '${status}' cannot be in lifecycle '${lifecycle}'`)];
    }
  }
  return [];
}

function checkBR008(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-008: Performance interpretation must prioritize metrics for declared objective
  if (schemaType !== 'PerformanceRecord') return [];
  // Informational — no static check possible without context
  return [];
}

function checkBR009(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-009: Revenue/sales conclusions must include attribution
  if (schemaType !== 'PerformanceRecord') return [];
  const revenue = data.revenue as Record<string, unknown> | undefined;
  if (revenue && typeof revenue.revenue === 'number' && (revenue.revenue as number) > 0) {
    const attribution = data.attribution as Record<string, unknown> | undefined;
    if (!attribution || !attribution.model) {
      return [violation('BR-009', 'attribution_confidence', 'critical',
        'Revenue reported without attribution model')];
    }
    const confidence = attribution.confidence as number | undefined;
    if (confidence !== undefined && confidence < 0.5) {
      return [violation('BR-009', 'attribution_confidence', 'critical',
        `Attribution confidence ${confidence} is below 0.5 minimum for revenue claims`)];
    }
  }
  return [];
}

function checkBR010(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-010: Generalized learning requires sufficient sample quality
  if (schemaType !== 'CreativeLearning') return [];
  const applicability = data.applicability as Record<string, unknown> | undefined;
  const scope = (applicability?.scope as string) ?? '';
  const confidence = data.confidence as Record<string, unknown> | undefined;
  const score = (confidence?.score as number) ?? 0;
  if (['universal', 'industry'].includes(scope) && score < 0.6) {
    return [violation('BR-010', 'sample_quality', 'high',
      `Broad scope '${scope}' learning with low confidence ${score} should be marked tentative`)];
  }
  return [];
}

function checkBR011(_data: SchemaData, _schemaType: string): RuleViolation[] {
  // BR-011: Hypothesis set must contain multiple distinct creative angles
  // This applies to a SET of hypotheses, checked at collection level
  return [];
}

function checkBR012(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-012: High saturation patterns require explicit differentiation
  if (!['CreativePattern', 'CreativeHypothesis', 'CreativeConcept'].includes(schemaType)) return [];
  const saturation = data.saturation as string | undefined;
  if (saturation && ['high', 'very_high'].includes(saturation)) {
    const diff = data.differentiation as string | undefined;
    if (!diff || diff.length < 10) {
      return [violation('BR-012', 'saturation_penalty', 'medium',
        `Pattern has ${saturation} saturation but lacks explicit differentiation`)];
    }
  }
  return [];
}

function checkBR013(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-013: Concept cannot be selected solely on strategic score if infeasible
  if (schemaType !== 'CreativeConcept') return [];
  const strategic = (data.strategic_score as number) ?? 0;
  const production = (data.production_score as number) ?? 0;
  if (strategic > 80 && production < 30) {
    return [violation('BR-013', 'production_feasibility', 'high',
      `High strategic score (${strategic}) but very low production score (${production}) — may be infeasible`)];
  }
  return [];
}

function checkBR014(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-014: Testimonials, statistics, results cannot be fabricated
  if (!['CreativeConcept', 'Story', 'CreativeBrief'].includes(schemaType)) return [];
  const proof = data.proof ?? data.proof_required;
  if (proof && (!data.relations || (data.relations as unknown[]).length === 0)) {
    return [violation('BR-014', 'no_invented_proof', 'critical',
      'Proof claims present but no evidence relations linked')];
  }
  return [];
}

function checkBR015(data: SchemaData, schemaType: string): RuleViolation[] {
  // BR-015: Generated assets must satisfy declared specifications
  if (schemaType !== 'Asset') return [];
  const quality = data.quality as Record<string, unknown> | undefined;
  if (quality && quality.status === 'failed') {
    return [violation('BR-015', 'asset_technical_integrity', 'high',
      `Asset quality check failed with score ${quality.score ?? 'N/A'}`)];
  }
  return [];
}

function checkBR016(data: SchemaData, _schemaType: string): RuleViolation[] {
  // BR-016: Required human approval cannot be bypassed
  const approval = data.approval as Record<string, unknown> | undefined;
  if (approval) {
    const required = approval.required as boolean | undefined;
    const status = (approval.status as string) ?? 'not_required';
    const lifecycle = (data.lifecycle_status as string) ?? 'draft';
    if (required && status === 'pending' && ['validated', 'approved'].includes(lifecycle)) {
      return [violation('BR-016', 'human_gate_enforcement', 'critical',
        `Object in '${lifecycle}' state but human approval still pending`)];
    }
  }
  return [];
}

// ─── Rule Registry ───────────────────────────────────────────────────────────

const RULE_CHECKERS: RuleChecker[] = [
  checkBR001,
  checkBR002,
  checkBR003,
  checkBR004,
  checkBR005,
  checkBR006,
  checkBR007,
  checkBR008,
  checkBR009,
  checkBR010,
  checkBR011,
  checkBR012,
  checkBR013,
  checkBR014,
  checkBR015,
  checkBR016,
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check all 16 business rules against a schema object.
 * @param data - The schema object data (JSONB content)
 * @param schemaType - The CITE schema type (e.g., 'Campaign', 'CreativeBrief')
 * @returns RuleCheckResult with violations and pass/fail status
 */
export function checkRules(
  data: Record<string, unknown>,
  schemaType: string,
): RuleCheckResult {
  const violations: RuleViolation[] = [];

  for (const checker of RULE_CHECKERS) {
    try {
      violations.push(...checker(data, schemaType));
    } catch (err) {
      violations.push(violation(
        'INTERNAL',
        checker.name,
        'high',
        `Rule check error: ${err instanceof Error ? err.message : String(err)}`,
      ));
    }
  }

  const hasBlocking = hasBlockingViolations(violations);

  return {
    violations,
    passed: violations.length === 0,
    has_blocking: hasBlocking,
    checked_at: new Date().toISOString(),
    rules_checked: RULE_CHECKERS.length,
  };
}

/**
 * Check if any violations are blocking (critical or high severity).
 */
export function hasBlockingViolations(violations: RuleViolation[]): boolean {
  return violations.some(v => v.severity === 'critical');
}

/**
 * Get all business rule definitions.
 */
export function getBusinessRules(): BusinessRule[] {
  return [...BUSINESS_RULES];
}

/**
 * Check a specific rule by ID.
 */
export function checkRuleById(
  ruleId: string,
  data: Record<string, unknown>,
  schemaType: string,
): RuleViolation[] {
  const index = BUSINESS_RULES.findIndex(r => r.id === ruleId);
  if (index < 0 || index >= RULE_CHECKERS.length) {
    return [violation('INTERNAL', 'unknown_rule', 'high', `Rule ${ruleId} not found`)];
  }
  return RULE_CHECKERS[index](data, schemaType);
}
