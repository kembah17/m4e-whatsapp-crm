// =============================================================================
// CITE Scoring Engine (TypeScript)
// Implements all 6 scoring formulas from scoring-formulas.json
// All scores return 0-100 range
// =============================================================================

import type { Confidence } from './types';

// ─── Utility ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Strategic Creative Score ────────────────────────────────────────────────

export const STRATEGIC_WEIGHTS: Record<string, number> = {
  icp_fit: 0.15,
  problem_desire_fit: 0.15,
  awareness_fit: 0.10,
  channel_fit: 0.10,
  methodology_alignment: 0.15,
  differentiation: 0.10,
  credibility: 0.10,
  hook_strength: 0.10,
  visual_potential: 0.05,
};

export interface StrategicScoreInput {
  icp_fit?: number;
  problem_desire_fit?: number;
  awareness_fit?: number;
  channel_fit?: number;
  methodology_alignment?: number;
  differentiation?: number;
  credibility?: number;
  hook_strength?: number;
  visual_potential?: number;
}

export function calculateStrategicCreativeScore(
  concept: StrategicScoreInput
): number {
  let total = 0;
  for (const [dimension, weight] of Object.entries(STRATEGIC_WEIGHTS)) {
    const value = (concept as Record<string, number | undefined>)[dimension] ?? 0;
    total += weight * clamp(value, 0, 100);
  }
  return round2(clamp(total, 0, 100));
}

// ─── Channel Score ───────────────────────────────────────────────────────────

export const CHANNEL_WEIGHTS: Record<string, number> = {
  audience_fit: 0.15,
  icp_density: 0.10,
  pain_intensity: 0.10,
  awareness_fit: 0.10,
  solution_fit: 0.15,
  commercial_potential: 0.15,
  cost_efficiency: 0.10,
  creative_opportunity: 0.10,
  measurement_quality: 0.05,
};

export interface ChannelScoreInput {
  audience_fit?: number;
  icp_density?: number;
  pain_intensity?: number;
  awareness_fit?: number;
  solution_fit?: number;
  commercial_potential?: number;
  cost_efficiency?: number;
  creative_opportunity?: number;
  measurement_quality?: number;
}

export function calculateChannelScore(channel: ChannelScoreInput): number {
  let total = 0;
  for (const [dimension, weight] of Object.entries(CHANNEL_WEIGHTS)) {
    const value = (channel as Record<string, number | undefined>)[dimension] ?? 0;
    total += weight * clamp(value, 0, 100);
  }
  return round2(clamp(total, 0, 100));
}

// ─── Hook Score ──────────────────────────────────────────────────────────────

export const HOOK_WEIGHTS: Record<string, number> = {
  clarity_score: 0.20,
  curiosity_score: 0.25,
  credibility_score: 0.20,
  scroll_stop_score: 0.25,
};

export const HOOK_CLICKBAIT_WEIGHT = 0.10;

export interface HookScoreInput {
  clarity_score?: number;
  curiosity_score?: number;
  credibility_score?: number;
  scroll_stop_score?: number;
  clickbait_risk?: number;
}

export function calculateHookScore(hook: HookScoreInput): number {
  let total = 0;
  for (const [dimension, weight] of Object.entries(HOOK_WEIGHTS)) {
    const value = (hook as Record<string, number | undefined>)[dimension] ?? 0;
    total += weight * clamp(value, 0, 100);
  }
  // Clickbait risk is inverted: lower risk = higher score
  const clickbaitRisk = hook.clickbait_risk ?? 50;
  total += HOOK_CLICKBAIT_WEIGHT * (100 - clamp(clickbaitRisk, 0, 100));
  return round2(clamp(total, 0, 100));
}

// ─── Overall Concept Score ───────────────────────────────────────────────────

export function calculateOverallConceptScore(
  strategicScore: number,
  productionScore: number,
  confidenceScore: number // 0-1 scale
): number {
  const confidencePercent = clamp(confidenceScore, 0, 1) * 100;
  const total =
    0.55 * clamp(strategicScore, 0, 100) +
    0.25 * clamp(productionScore, 0, 100) +
    0.20 * confidencePercent;
  return round2(clamp(total, 0, 100));
}

// ─── Production Score ────────────────────────────────────────────────────────

export const PRODUCTION_DIFFICULTY_WEIGHTS: Record<string, number> = {
  visual_complexity: 0.15,
  character_complexity: 0.10,
  location_complexity: 0.10,
  scene_count: 0.10,
  image_generation_difficulty: 0.15,
  video_generation_difficulty: 0.15,
  editing_complexity: 0.10,
  asset_availability: 0.05,
  estimated_cost: 0.10,
};

export interface ProductionScoreInput {
  visual_complexity?: number;
  character_complexity?: number;
  location_complexity?: number;
  scene_count?: number;
  image_generation_difficulty?: number;
  video_generation_difficulty?: number;
  editing_complexity?: number;
  asset_availability?: number;
  estimated_cost?: number;
}

export function calculateProductionScore(spec: ProductionScoreInput): number {
  let weightedDifficulty = 0;
  for (const [factor, weight] of Object.entries(PRODUCTION_DIFFICULTY_WEIGHTS)) {
    const value = (spec as Record<string, number | undefined>)[factor] ?? 50;
    weightedDifficulty += weight * clamp(value, 0, 100);
  }
  return round2(clamp(100 - weightedDifficulty, 0, 100));
}

// ─── Validation Gates ────────────────────────────────────────────────────────

export type GateType = 'concept' | 'story' | 'storyboard' | 'asset' | 'final_ad';

export const VALIDATION_GATE_DEFAULTS: Record<GateType, number> = {
  concept: 80,
  story: 85,
  storyboard: 85,
  asset: 85,
  final_ad: 90,
};

export function checkValidationGate(
  score: number,
  gateType: GateType,
  customThreshold?: number
): boolean {
  const threshold = customThreshold ?? VALIDATION_GATE_DEFAULTS[gateType];
  if (threshold === undefined) {
    throw new Error(
      `Unknown gate type '${gateType}'. Valid: ${Object.keys(VALIDATION_GATE_DEFAULTS).join(', ')}`
    );
  }
  return score >= threshold;
}

// ─── Commercial Priority ────────────────────────────────────────────────────

export const COMMERCIAL_PRIORITY_HIERARCHY: string[] = [
  'revenue',
  'sales',
  'qualified_leads',
  'leads',
  'engagement',
  'attention',
];

export function getCommercialPriorityRank(metric: string): number {
  const index = COMMERCIAL_PRIORITY_HIERARCHY.indexOf(metric);
  return index >= 0 ? index : 999;
}

// ─── Confidence Helpers ──────────────────────────────────────────────────────

export function scoreToConfidenceLevel(
  score: number
): Confidence['level'] {
  if (score >= 0.8) return 'very_high';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'very_low';
}
