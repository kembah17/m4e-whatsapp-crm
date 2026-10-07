// =============================================================================
// POST /api/schemas/validate — Validate a schema object server-side
// Checks required fields and envelope structure without jsonschema.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  validateEnvelope,
  isValidSchemaType,
  getMissingFields,
  calculateCompleteness,
} from '@/lib/schemas/validation';
import {
  calculateStrategicCreativeScore,
  calculateHookScore,
  calculateOverallConceptScore,
  calculateProductionScore,
  calculateChannelScore,
  checkValidationGate,
} from '@/lib/schemas/scoring';
import type { GateType } from '@/lib/schemas/scoring';

interface ValidationError {
  field: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, schema_type, gate_type } = body;

    if (!data || !schema_type) {
      return NextResponse.json(
        { error: 'Missing required fields: data, schema_type' },
        { status: 400 }
      );
    }

    if (!isValidSchemaType(schema_type)) {
      return NextResponse.json(
        { error: `Invalid schema_type: ${schema_type}` },
        { status: 400 }
      );
    }

    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // 1. Envelope validation
    const envelope = validateEnvelope(data);
    if (!envelope) {
      errors.push({
        field: 'envelope',
        message: 'Data does not conform to the schema envelope structure',
      });
    }

    // 2. Required fields check
    const missingFields = getMissingFields(data as Record<string, unknown>);
    for (const field of missingFields) {
      errors.push({
        field,
        message: `Required field '${field}' is missing or null`,
      });
    }

    // 3. Completeness
    const completeness = calculateCompleteness(data as Record<string, unknown>);
    if (completeness < 100) {
      warnings.push(
        `Schema object is ${completeness}% complete (${missingFields.length} fields missing)`
      );
    }

    // 4. Scoring (if applicable)
    let scores: Record<string, number> = {};
    let gateResult: { passed: boolean; threshold: number } | null = null;

    if (schema_type === 'CreativeConcept' && data.strategic_score !== undefined) {
      scores = {
        strategic: data.strategic_score,
        production: data.production_score ?? 0,
        overall: data.overall_score ?? 0,
      };
    }

    if (schema_type === 'Hook' && data.clarity_score !== undefined) {
      scores.hook_total = calculateHookScore({
        clarity_score: data.clarity_score,
        curiosity_score: data.curiosity_score,
        credibility_score: data.credibility_score,
        scroll_stop_score: data.scroll_stop_score,
        clickbait_risk: data.clickbait_risk,
      });
    }

    if (schema_type === 'ChannelRecommendation' && data.scores) {
      scores.channel_total = calculateChannelScore(data.scores);
    }

    // 5. Gate check
    if (gate_type && scores.overall !== undefined) {
      const validGates: GateType[] = ['concept', 'story', 'storyboard', 'asset', 'final_ad'];
      if (validGates.includes(gate_type as GateType)) {
        const passed = checkValidationGate(scores.overall, gate_type as GateType);
        gateResult = {
          passed,
          threshold: gate_type === 'concept' ? 80 : gate_type === 'final_ad' ? 90 : 85,
        };
      }
    }

    const valid = errors.length === 0;

    return NextResponse.json({
      valid,
      errors,
      warnings,
      completeness,
      scores: Object.keys(scores).length > 0 ? scores : undefined,
      gate: gateResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
