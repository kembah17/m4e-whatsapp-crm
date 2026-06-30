import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("accounts")
      .select(
        "website_sync_enabled, website_sync_api_key, website_sync_config, website_sync_webhook_url, website_sync_last_at"
      )
      .eq("id", account.accountId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      enabled: data?.website_sync_enabled ?? false,
      apiKey: data?.website_sync_api_key ?? "",
      config: data?.website_sync_config ?? { products: true, testimonials: true, stats: true },
      webhookUrl: data?.website_sync_webhook_url ?? "",
      lastSyncAt: data?.website_sync_last_at ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.enabled !== undefined) updates.website_sync_enabled = !!body.enabled;
    if (body.apiKey !== undefined) updates.website_sync_api_key = body.apiKey || null;
    if (body.config !== undefined) updates.website_sync_config = body.config;
    if (body.webhookUrl !== undefined) updates.website_sync_webhook_url = body.webhookUrl || null;

    const supabase = getAdmin();
    const { error } = await supabase
      .from("accounts")
      .update(updates)
      .eq("id", account.accountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
