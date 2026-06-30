import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";
import { evaluateSegmentSimple } from "@/lib/segments/segment-engine";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("segments")
      .select("*")
      .eq("id", id)
      .eq("account_id", account.accountId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    return NextResponse.json({ segment: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, description, rules } = await req.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (rules !== undefined) {
      updates.rules = rules;
      try {
        const result = await evaluateSegmentSimple(rules, account.accountId, { countOnly: true });
        updates.contact_count = result.count;
        updates.last_calculated_at = new Date().toISOString();
      } catch { /* silent */ }
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("segments")
      .update(updates)
      .eq("id", id)
      .eq("account_id", account.accountId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    return NextResponse.json({ segment: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getAdmin();
    const { error } = await supabase
      .from("segments")
      .delete()
      .eq("id", id)
      .eq("account_id", account.accountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
