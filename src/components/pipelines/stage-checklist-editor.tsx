"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  CheckSquare,
  Upload,
  Camera,
  FileText,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import type {
  StageChecklistTemplate,
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

interface StageChecklistEditorProps {
  stageId: string;
  stageName: string;
}

export function StageChecklistEditor({
  stageId,
  stageName,
}: StageChecklistEditorProps) {
  const [items, setItems] = useState<StageChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New item form
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<ChecklistItemType>("checkbox");
  const [newRequired, setNewRequired] = useState(true);
  const [newDescription, setNewDescription] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pipeline-stages/${stageId}/checklist`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    if (stageId) fetchItems();
  }, [stageId, fetchItems]);

  async function handleAdd() {
    if (!newText.trim()) {
      toast.error("Item text is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/pipeline-stages/${stageId}/checklist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_text: newText.trim(),
            item_type: newType,
            is_required: newRequired,
            description: newDescription.trim() || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to add item");
      toast.success("Checklist item added");
      setNewText("");
      setNewDescription("");
      setNewType("checkbox");
      setNewRequired(true);
      setShowForm(false);
      fetchItems();
    } catch {
      toast.error("Failed to add checklist item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(templateId: string) {
    try {
      const res = await fetch(
        `/api/pipeline-stages/${stageId}/checklist?template_id=${templateId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Item removed");
      fetchItems();
    } catch {
      toast.error("Failed to remove item");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">
            Checklist for &ldquo;{stageName}&rdquo;
          </h4>
          <p className="text-xs text-muted-foreground">
            Items that must be completed before a deal can move past this stage
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-7 text-xs border-border bg-transparent text-muted-foreground hover:bg-muted"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Item
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Item Text</Label>
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="e.g., Verify bank transfer receipt"
              className="h-8 text-xs border-border bg-muted"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as ChecklistItemType)}
              >
                <SelectTrigger className="h-8 text-xs border-border bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHECKLIST_ITEM_TYPE_LABELS) as ChecklistItemType[]).map(
                    (t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {CHECKLIST_ITEM_TYPE_LABELS[t]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Checkbox
                id="required-check"
                checked={newRequired}
                onCheckedChange={(c) => setNewRequired(!!c)}
              />
              <Label
                htmlFor="required-check"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Required
              </Label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              Description (optional)
            </Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Additional instructions..."
              className="h-8 text-xs border-border bg-muted"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving || !newText.trim()}
              className="h-7 text-xs bg-primary text-primary-foreground"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No checklist items. Deals in this stage won&apos;t have a checklist.
        </p>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {items.map((item, idx) => {
              const Icon = ITEM_TYPE_ICONS[item.item_type] || CheckSquare;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 group"
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.item_text}
                    </p>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-border"
                    >
                      {CHECKLIST_ITEM_TYPE_LABELS[item.item_type]}
                    </Badge>
                    {item.is_required && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-red-500/30 text-red-400"
                      >
                        Required
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
