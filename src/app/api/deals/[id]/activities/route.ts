import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import type { CreateDealActivityPayload } from "@/types/offline-operations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getCurrentAccount();
    const { id: dealId } = await params;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("deal_activities")
      .select(
        `*, performed_by_profile:profiles!deal_activities_performed_by_fkey(full_name, email),
         old_stage:pipeline_stages!deal_activities_old_stage_id_fkey(name, color),
         new_stage:pipeline_stages!deal_activities_new_stage_id_fkey(name, color)`,
        { count: "exact" }
      )
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, supabase, userId } = await getCurrentAccount();
    const { id: dealId } = await params;
    const body = (await req.json()) as CreateDealActivityPayload;

    if (!body.activity_type || !body.title) {
      return NextResponse.json(
        { error: "activity_type and title are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("deal_activities")
      .insert({
        deal_id: dealId,
        account_id: accountId,
        activity_type: body.activity_type,
        title: body.title,
        description: body.description || null,
        performed_by: userId,
        contact_id: body.contact_id || null,
        attachment_url: body.attachment_url || null,
        attachment_storage_path: body.attachment_storage_path || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
