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
/*  GET — List lookalike sync entries                                 */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("lookalike_sync_log")
      .select("*")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ syncs: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST — Trigger a new lookalike sync (placeholder)                 */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { segment_name, segment_rules, contact_count } = body;

    if (!segment_name || typeof segment_name !== "string" || segment_name.trim() === "") {
      return NextResponse.json(
        { error: "segment_name is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("lookalike_sync_log")
      .insert({
        account_id: account.accountId,
        segment_name: segment_name.trim(),
        segment_rules: segment_rules ?? {},
        contact_count: contact_count ?? 0,
        sync_status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Note: Actual Meta API integration will be added later
    return NextResponse.json({ sync: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
