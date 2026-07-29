import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getCurrentAccount();
    const { id: dealId } = await params;

    // Get deal to know current stage
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("id, stage_id")
      .eq("id", dealId)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Get checklist templates for current stage
    const { data: templates } = await supabase
      .from("stage_checklist_templates")
      .select("*")
      .eq("stage_id", deal.stage_id)
      .order("position");

    // Get completions for this deal
    const { data: completions } = await supabase
      .from("deal_checklist_completions")
      .select(
        `*, completed_by_profile:profiles!deal_checklist_completions_completed_by_fkey(full_name, email)`
      )
      .eq("deal_id", dealId);

    // Get progress from view
    const { data: progress } = await supabase
      .from("deal_checklist_progress")
      .select("*")
      .eq("deal_id", dealId)
      .single();

    // Merge templates with completions
    const completionMap = new Map(
      (completions ?? []).map((c) => [c.checklist_template_id, c])
    );

    const items = (templates ?? []).map((t) => ({
      template: t,
      completion: completionMap.get(t.id) || null,
    }));

    return NextResponse.json({
      items,
      progress: progress || {
        deal_id: dealId,
        stage_id: deal.stage_id,
        total_items: templates?.length ?? 0,
        required_items: templates?.filter((t) => t.is_required).length ?? 0,
        completed_items: 0,
        required_completed: 0,
        completion_percent: templates?.length ? 0 : 100,
        all_required_complete: !templates?.some((t) => t.is_required),
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
