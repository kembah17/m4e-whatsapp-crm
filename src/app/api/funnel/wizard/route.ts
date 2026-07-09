import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";
import { generateConfigFromWizard } from "@/lib/funnel/presets";
import type { CustomIndustryWizardAnswers } from "@/types/funnel";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const VALID_BUSINESS_TYPES = [
  "physical_products",
  "digital_products",
  "services",
  "venue",
  "marketplace",
] as const;

const VALID_SALES_CYCLES = [
  "same_day",
  "1_7_days",
  "1_4_weeks",
  "1_3_months",
  "3_plus_months",
] as const;

const VALID_AVG_TRANSACTIONS = [
  "under_10k",
  "10k_100k",
  "100k_1m",
  "1m_10m",
  "over_10m",
] as const;

const VALID_CLOSE_MECHANISMS = [
  "online_payment",
  "cod",
  "bank_transfer",
  "booking",
  "walk_in",
  "hybrid",
] as const;

const VALID_REPEAT_FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "annually",
  "one_time",
] as const;

/* ------------------------------------------------------------------ */
/*  POST — Generate config from wizard answers                        */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const answers = body as CustomIndustryWizardAnswers;

    // Validate required fields
    const errors: string[] = [];

    if (!answers.business_type || !VALID_BUSINESS_TYPES.includes(answers.business_type)) {
      errors.push("business_type is required and must be one of: " + VALID_BUSINESS_TYPES.join(", "));
    }
    if (!answers.industry_name || typeof answers.industry_name !== "string" || answers.industry_name.trim() === "") {
      errors.push("industry_name is required and must be a non-empty string");
    }
    if (!answers.sales_cycle || !VALID_SALES_CYCLES.includes(answers.sales_cycle)) {
      errors.push("sales_cycle is required and must be one of: " + VALID_SALES_CYCLES.join(", "));
    }
    if (!answers.avg_transaction || !VALID_AVG_TRANSACTIONS.includes(answers.avg_transaction)) {
      errors.push("avg_transaction is required and must be one of: " + VALID_AVG_TRANSACTIONS.join(", "));
    }
    if (!Array.isArray(answers.customer_channels) || answers.customer_channels.length === 0) {
      errors.push("customer_channels is required and must be a non-empty array");
    }
    if (!answers.close_mechanism || !VALID_CLOSE_MECHANISMS.includes(answers.close_mechanism)) {
      errors.push("close_mechanism is required and must be one of: " + VALID_CLOSE_MECHANISMS.join(", "));
    }
    if (!answers.repeat_frequency || !VALID_REPEAT_FREQUENCIES.includes(answers.repeat_frequency)) {
      errors.push("repeat_frequency is required and must be one of: " + VALID_REPEAT_FREQUENCIES.join(", "));
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    // Generate config from wizard answers
    const generatedConfig = generateConfigFromWizard(answers);

    // Save to custom_industry_configs table
    const supabase = getAdmin();
    const { data: inserted, error: insertErr } = await supabase
      .from("custom_industry_configs")
      .insert({
        industry_name: answers.industry_name.trim(),
        business_type: answers.business_type,
        sales_cycle: answers.sales_cycle,
        avg_transaction: answers.avg_transaction,
        customer_channels: answers.customer_channels,
        close_mechanism: answers.close_mechanism,
        repeat_frequency: answers.repeat_frequency,
        generated_config: generatedConfig,
      })
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json(
      { config: generatedConfig, wizard_record_id: inserted.id },
      { status: 201 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
