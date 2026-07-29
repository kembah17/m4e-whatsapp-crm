import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import type { UpdateChecklistCompletionPayload } from "@/types/offline-operations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { supabase, userId } = await getCurrentAccount();
    const { id: dealId, itemId } = await params;
    const body = (await req.json()) as UpdateChecklistCompletionPayload;

    // Upsert: the completion row may not exist yet if auto-create trigger
    // hasn't fired (e.g., deal was created before checklist templates were added)
    const { data: existing } = await supabase
      .from("deal_checklist_completions")
      .select("id")
      .eq("deal_id", dealId)
      .eq("checklist_template_id", itemId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("deal_checklist_completions")
        .update({
          completed: body.completed,
          completed_by: body.completed ? userId : null,
          completed_at: body.completed ? new Date().toISOString() : null,
          proof_url: body.proof_url ?? null,
          proof_storage_path: body.proof_storage_path ?? null,
          notes: body.notes ?? null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabase
        .from("deal_checklist_completions")
        .insert({
          deal_id: dealId,
          checklist_template_id: itemId,
          completed: body.completed,
          completed_by: body.completed ? userId : null,
          completed_at: body.completed ? new Date().toISOString() : null,
          proof_url: body.proof_url ?? null,
          proof_storage_path: body.proof_storage_path ?? null,
          notes: body.notes ?? null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
