import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ------------------------------------------------------------------ */
/*  GET — Fetch funnel config for current account                     */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("funnel_configs")
      .select("*")
      .eq("account_id", account.accountId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({ config: data ?? null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST — Create new funnel config                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("funnel_configs")
      .insert({
        account_id: account.accountId,
        name: body.name ?? "Default Funnel",
        industry_preset: body.industry_preset ?? "custom",
        channels: body.channels ?? [],
        social_platforms: body.social_platforms ?? [],
        ad_budget_daily_ngn: body.ad_budget_daily_ngn ?? 5000,
        nurture_length_days: body.nurture_length_days ?? 7,
        nurture_max_touchpoints: body.nurture_max_touchpoints ?? 4,
        escalate_after_unanswered: body.escalate_after_unanswered ?? 3,
        close_mechanism: body.close_mechanism ?? "hybrid",
        cart_recovery_delay_minutes: body.cart_recovery_delay_minutes ?? 60,
        max_discount_percent: body.max_discount_percent ?? 10,
        cod_confirmation_enabled: body.cod_confirmation_enabled ?? true,
        review_request_delay_days: body.review_request_delay_days ?? 3,
        dormancy_threshold_days: body.dormancy_threshold_days ?? 60,
        referral_enabled: body.referral_enabled ?? true,
        lookalike_auto_sync: body.lookalike_auto_sync ?? false,
        lookalike_seed_minimum: body.lookalike_seed_minimum ?? 100,
        lookalike_sync_frequency: body.lookalike_sync_frequency ?? "weekly",
        report_frequency: body.report_frequency ?? "biweekly",
        report_delivery_channels: body.report_delivery_channels ?? ["whatsapp", "email", "dashboard"],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT — Update existing funnel config with change logging           */
/* ------------------------------------------------------------------ */

const TRACKABLE_FIELDS = [
  "nurture_length_days",
  "nurture_max_touchpoints",
  "escalate_after_unanswered",
  "close_mechanism",
  "cart_recovery_delay_minutes",
  "max_discount_percent",
  "dormancy_threshold_days",
  "report_frequency",
  "ad_budget_daily_ngn",
  "industry_preset",
] as const;

export async function PUT(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { change_reason, ...configFields } = body;

    const supabase = getAdmin();

    // Fetch current config
    const { data: current, error: fetchErr } = await supabase
      .from("funnel_configs")
      .select("*")
      .eq("account_id", account.accountId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!current)
      return NextResponse.json(
        { error: "No funnel config found for this account" },
        { status: 404 },
      );

    // Build change log entries for trackable fields
    const changeLogs: Array<{
      account_id: string;
      funnel_config_id: string;
      parameter_name: string;
      old_value: string;
      new_value: string;
      changed_by: string;
      reason: string | null;
    }> = [];

    for (const field of TRACKABLE_FIELDS) {
      if (field in configFields) {
        const oldVal = String(current[field] ?? "");
        const newVal = String(configFields[field] ?? "");
        if (oldVal !== newVal) {
          changeLogs.push({
            account_id: account.accountId,
            funnel_config_id: current.id,
            parameter_name: field,
            old_value: oldVal,
            new_value: newVal,
            changed_by: account.userId,
            reason: change_reason ?? null,
          });
        }
      }
    }

    // Insert change log entries (if any)
    if (changeLogs.length > 0) {
      const { error: logErr } = await supabase
        .from("preset_change_log")
        .insert(changeLogs);

      if (logErr) throw new Error(logErr.message);
    }

    // Update the config
    const { data: updated, error: updateErr } = await supabase
      .from("funnel_configs")
      .update({
        ...configFields,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", account.accountId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ config: updated, changes_logged: changeLogs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
