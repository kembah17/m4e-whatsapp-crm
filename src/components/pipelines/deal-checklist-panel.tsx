"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  CheckSquare,
  Camera,
  Upload,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import type {
  StageChecklistTemplate,
  DealChecklistCompletion,
  DealChecklistProgress,
  ChecklistItemType,
} from "@/types/offline-operations";
import { CHECKLIST_ITEM_TYPE_LABELS } from "@/types/offline-operations";

const ITEM_TYPE_ICONS: Record<ChecklistItemType, typeof CheckSquare> = {
  checkbox: CheckSquare,
  photo: Camera,
  document: Upload,
  sign_off: FileText,
  payment: Banknote,
};

interface ChecklistItem {
  template: StageChecklistTemplate;
  completion: DealChecklistCompletion | null;
}

interface DealChecklistPanelProps {
  dealId: string;
}

export function DealChecklistPanel({ dealId }: DealChecklistPanelProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<DealChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/checklist`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setProgress(data.progress ?? null);
        // Initialize notes from existing completions
        const noteMap: Record<string, string> = {};
        for (const item of data.items ?? []) {
          if (item.completion?.notes) {
            noteMap[item.template.id] = item.completion.notes;
          }
        }
        setNotes(noteMap);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId) fetchChecklist();
  }, [dealId, fetchChecklist]);

  async function handleToggle(templateId: string, completed: boolean) {
    setSavingItems((prev) => new Set(prev).add(templateId));
    try {
      const res = await fetch(
        `/api/deals/${dealId}/checklist/${templateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completed,
            notes: notes[templateId] || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update");
      fetchChecklist();
    } catch {
      toast.error("Failed to update checklist item");
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  }

  async function handleSaveNotes(templateId: string) {
    const item = items.find((i) => i.template.id === templateId);
    if (!item) return;

    setSavingItems((prev) => new Set(prev).add(templateId));
    try {
      const res = await fetch(
        `/api/deals/${dealId}/checklist/${templateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completed: item.completion?.completed ?? false,
            notes: notes[templateId] || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save notes");
      toast.success("Notes saved");
      fetchChecklist();
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground">
          No checklist items for this stage
        </p>
      </div>
    );
  }

  const pct = progress?.completion_percent ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Stage Checklist</span>
          <span className="font-medium text-foreground">
            {progress?.completed_items ?? 0}/{progress?.total_items ?? 0} ({pct}
            %)
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        {progress && progress.required_items > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Required: {progress.required_completed}/{progress.required_items}
            {progress.all_required_complete && (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Checklist items */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {items.map((item) => {
            const { template, completion } = item;
            const isCompleted = completion?.completed ?? false;
            const isSaving = savingItems.has(template.id);
            const isExpanded = expandedItem === template.id;
            const Icon = ITEM_TYPE_ICONS[template.item_type] || CheckSquare;

            return (
              <div
                key={template.id}
                className="rounded-md border border-border bg-muted/30 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(checked) =>
                        handleToggle(template.id, !!checked)
                      }
                      className="shrink-0"
                    />
                  )}
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${
                        isCompleted
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {template.item_text}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {template.is_required && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-red-500/30 text-red-400"
                      >
                        Req
                      </Badge>
                    )}
                    {isCompleted && completion?.completed_by_profile && (
                      <span className="text-[9px] text-muted-foreground">
                        {completion.completed_by_profile.full_name?.split(" ")[0]}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedItem(isExpanded ? null : template.id)
                      }
                      className="h-5 w-5 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-2 pb-2 pt-0 border-t border-border/50 space-y-2">
                    {template.description && (
                      <p className="text-[11px] text-muted-foreground pt-1.5">
                        {template.description}
                      </p>
                    )}
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Notes
                      </Label>
                      <Textarea
                        value={notes[template.id] || ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [template.id]: e.target.value,
                          }))
                        }
                        placeholder="Add notes..."
                        className="min-h-[40px] text-xs border-border bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveNotes(template.id)}
                        disabled={isSaving}
                        className="h-6 text-[10px] w-fit"
                      >
                        Save Notes
                      </Button>
                    </div>
                    {isCompleted && completion?.completed_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Completed{" "}
                        {new Date(completion.completed_at).toLocaleString(
                          "en-NG"
                        )}
                        {completion.completed_by_profile &&
                          ` by ${completion.completed_by_profile.full_name || completion.completed_by_profile.email}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
