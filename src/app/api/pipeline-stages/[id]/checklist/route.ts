import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import type { CreateChecklistTemplatePayload } from "@/types/offline-operations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getCurrentAccount();
    const { id: stageId } = await params;

    const { data, error } = await supabase
      .from("stage_checklist_templates")
      .select("*")
      .eq("stage_id", stageId)
      .order("position");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getCurrentAccount();
    const { id: stageId } = await params;
    const body = (await req.json()) as CreateChecklistTemplatePayload;

    if (!body.item_text?.trim()) {
      return NextResponse.json({ error: "item_text is required" }, { status: 400 });
    }

    // Get next position
    const { data: existing } = await supabase
      .from("stage_checklist_templates")
      .select("position")
      .eq("stage_id", stageId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition =
      body.position ?? ((existing?.[0]?.position ?? -1) + 1);

    const { data, error } = await supabase
      .from("stage_checklist_templates")
      .insert({
        stage_id: stageId,
        item_text: body.item_text.trim(),
        item_type: body.item_type || "checkbox",
        is_required: body.is_required ?? true,
        position: nextPosition,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getCurrentAccount();
    const { id: stageId } = await params;
    const url = new URL(req.url);
    const templateId = url.searchParams.get("template_id");

    if (!templateId) {
      return NextResponse.json(
        { error: "template_id query param is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stage_checklist_templates")
      .delete()
      .eq("id", templateId)
      .eq("stage_id", stageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
