"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Filter, Loader2, Plus, Save, Trash2, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SegmentRule, SegmentGroup } from "@/lib/segments/segment-engine";

interface SegmentBuilderProps {
  initialRules?: SegmentGroup;
  initialName?: string;
  initialDescription?: string;
  segmentId?: string;
  onSave?: (segment: { name: string; description: string; rules: SegmentGroup }) => void;
  onCancel?: () => void;
}

const FIELD_OPTIONS = [
  { value: "name", label: "Contact Name", type: "text" },
  { value: "phone", label: "Phone", type: "text" },
  { value: "email", label: "Email", type: "text" },
  { value: "status", label: "Status", type: "select", options: ["active", "inactive", "blocked"] },
  { value: "created_at", label: "Created Date", type: "date" },
  { value: "tags", label: "Tags", type: "text" },
  { value: "last_message_at", label: "Last Message", type: "date" },
  { value: "message_count", label: "Message Count", type: "number" },
  { value: "total_spent", label: "Total Spent", type: "number" },
  { value: "last_purchase_at", label: "Last Purchase", type: "date" },
  { value: "read_rate", label: "Read Rate (%)", type: "number" },
  { value: "reply_rate", label: "Reply Rate (%)", type: "number" },
] as const;

const OPERATORS: Record<string, { value: SegmentRule["operator"]; label: string }[]> = {
  text: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
    { value: "between", label: "between" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  date: [
    { value: "within_days", label: "within last X days" },
    { value: "before_days", label: "more than X days ago" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  select: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "in", label: "is one of" },
    { value: "not_in", label: "is not one of" },
  ],
};

const NO_VALUE_OPS = ["is_empty", "is_not_empty"];

function getFieldType(field: string): string {
  const f = FIELD_OPTIONS.find((o) => o.value === field);
  return f?.type ?? "text";
}

function getOperators(field: string) {
  const type = getFieldType(field);
  return OPERATORS[type] ?? OPERATORS.text;
}

function createEmptyRule(): SegmentRule {
  return { field: "name", operator: "contains", value: "" };
}

function createEmptyGroup(): SegmentGroup {
  return { logic: "AND", rules: [createEmptyRule()] };
}

export function SegmentBuilder({
  initialRules,
  initialName = "",
  initialDescription = "",
  segmentId,
  onSave,
  onCancel,
}: SegmentBuilderProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [group, setGroup] = useState<SegmentGroup>(
    initialRules ?? createEmptyGroup()
  );
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const preview = useCallback(async () => {
    setPreviewing(true);
    try {
      const res = await fetch("/api/segments/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules: group }),
      });
      if (res.ok) {
        const d = await res.json();
        setPreviewCount(d.count ?? 0);
      }
    } catch { /* silent */ }
    finally { setPreviewing(false); }
  }, [group]);

  // Auto-preview on rule changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (group.rules.length > 0) preview();
    }, 800);
    return () => clearTimeout(t);
  }, [group, preview]);

  function updateRule(index: number, updates: Partial<SegmentRule>) {
    setGroup((g) => {
      const newRules = [...g.rules];
      const existing = newRules[index] as SegmentRule;
      newRules[index] = { ...existing, ...updates };
      // Reset value when field or operator changes
      if (updates.field && updates.field !== existing.field) {
        (newRules[index] as SegmentRule).operator = "contains";
        (newRules[index] as SegmentRule).value = "";
      }
      if (updates.operator && NO_VALUE_OPS.includes(updates.operator)) {
        (newRules[index] as SegmentRule).value = "";
      }
      return { ...g, rules: newRules };
    });
  }

  function addRule() {
    setGroup((g) => ({ ...g, rules: [...g.rules, createEmptyRule()] }));
  }

  function addNestedGroup() {
    setGroup((g) => ({
      ...g,
      rules: [...g.rules, { logic: "OR" as const, rules: [createEmptyRule()] }],
    }));
  }

  function removeRule(index: number) {
    setGroup((g) => {
      const newRules = g.rules.filter((_, i) => i !== index);
      if (newRules.length === 0) newRules.push(createEmptyRule());
      return { ...g, rules: newRules };
    });
  }

  function toggleLogic() {
    setGroup((g) => ({ ...g, logic: g.logic === "AND" ? "OR" : "AND" }));
  }

  // Nested group helpers
  function updateNestedRule(groupIdx: number, ruleIdx: number, updates: Partial<SegmentRule>) {
    setGroup((g) => {
      const newRules = [...g.rules];
      const nestedGroup = { ...(newRules[groupIdx] as SegmentGroup) };
      const nestedRules = [...nestedGroup.rules];
      const existing = nestedRules[ruleIdx] as SegmentRule;
      nestedRules[ruleIdx] = { ...existing, ...updates };
      if (updates.field && updates.field !== existing.field) {
        (nestedRules[ruleIdx] as SegmentRule).operator = "contains";
        (nestedRules[ruleIdx] as SegmentRule).value = "";
      }
      nestedGroup.rules = nestedRules;
      newRules[groupIdx] = nestedGroup;
      return { ...g, rules: newRules };
    });
  }

  function addNestedRule(groupIdx: number) {
    setGroup((g) => {
      const newRules = [...g.rules];
      const nestedGroup = { ...(newRules[groupIdx] as SegmentGroup) };
      nestedGroup.rules = [...nestedGroup.rules, createEmptyRule()];
      newRules[groupIdx] = nestedGroup;
      return { ...g, rules: newRules };
    });
  }

  function removeNestedRule(groupIdx: number, ruleIdx: number) {
    setGroup((g) => {
      const newRules = [...g.rules];
      const nestedGroup = { ...(newRules[groupIdx] as SegmentGroup) };
      nestedGroup.rules = nestedGroup.rules.filter((_, i) => i !== ruleIdx);
      if (nestedGroup.rules.length === 0) {
        return { ...g, rules: newRules.filter((_, i) => i !== groupIdx) };
      }
      newRules[groupIdx] = nestedGroup;
      return { ...g, rules: newRules };
    });
  }

  function toggleNestedLogic(groupIdx: number) {
    setGroup((g) => {
      const newRules = [...g.rules];
      const nestedGroup = { ...(newRules[groupIdx] as SegmentGroup) };
      nestedGroup.logic = nestedGroup.logic === "AND" ? "OR" : "AND";
      newRules[groupIdx] = nestedGroup;
      return { ...g, rules: newRules };
    });
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Segment name is required"); return; }
    if (onSave) {
      onSave({ name: name.trim(), description: description.trim(), rules: group });
      return;
    }
    setSaving(true);
    try {
      const url = segmentId ? `/api/segments/${segmentId}` : "/api/segments";
      const method = segmentId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), rules: group }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save segment");
        return;
      }
      toast.success(segmentId ? "Segment updated" : "Segment created");
    } catch { toast.error("Failed to save segment"); }
    finally { setSaving(false); }
  }

  function isGroup(item: SegmentRule | SegmentGroup): item is SegmentGroup {
    return "logic" in item && "rules" in item;
  }

  function renderRuleRow(
    rule: SegmentRule,
    index: number,
    onUpdate: (idx: number, u: Partial<SegmentRule>) => void,
    onRemove: (idx: number) => void,
  ) {
    const fieldType = getFieldType(rule.field);
    const ops = getOperators(rule.field);
    const needsValue = !NO_VALUE_OPS.includes(rule.operator);
    const fieldDef = FIELD_OPTIONS.find((o) => o.value === rule.field);

    return (
      <div key={index} className="flex items-center gap-2 flex-wrap">
        {/* Field */}
        <select
          value={rule.field}
          onChange={(e) => onUpdate(index, { field: e.target.value })}
          className="h-9 rounded-md border bg-background px-2 text-sm min-w-[130px]"
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Operator */}
        <select
          value={rule.operator}
          onChange={(e) => onUpdate(index, { operator: e.target.value as SegmentRule["operator"] })}
          className="h-9 rounded-md border bg-background px-2 text-sm min-w-[140px]"
        >
          {ops.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Value */}
        {needsValue && fieldType === "select" && fieldDef && "options" in fieldDef ? (
          <select
            value={String(rule.value)}
            onChange={(e) => onUpdate(index, { value: e.target.value })}
            className="h-9 rounded-md border bg-background px-2 text-sm min-w-[120px]"
          >
            <option value="">Select...</option>
            {(fieldDef as unknown as { options: readonly string[] }).options.map((o: string) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ) : needsValue ? (
          <Input
            type={fieldType === "number" ? "number" : "text"}
            value={String(rule.value)}
            onChange={(e) => onUpdate(index, {
              value: fieldType === "number" ? Number(e.target.value) : e.target.value,
            })}
            placeholder={fieldType === "date" ? "Number of days" : "Value..."}
            className="h-9 w-32 text-sm"
          />
        ) : null}

        <Button variant="ghost" size="icon" className="size-8" onClick={() => onRemove(index)}>
          <X className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Name & Description */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Segment Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-value customers" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
      </div>

      {/* Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Filter className="size-4" />Conditions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleLogic}>
                {group.logic}
              </Button>
              <span className="text-xs text-muted-foreground">between conditions</span>
            </div>
          </div>
          <CardDescription>Define rules to match contacts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {group.rules.map((item, idx) => {
            if (isGroup(item)) {
              // Nested group
              return (
                <div key={idx} className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">Group</Badge>
                      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => toggleNestedLogic(idx)}>
                        {item.logic}
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => removeRule(idx)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                  {item.rules.map((nestedItem, nIdx) => {
                    if (isGroup(nestedItem)) return null; // Max 2 levels
                    return renderRuleRow(
                      nestedItem as SegmentRule,
                      nIdx,
                      (i, u) => updateNestedRule(idx, i, u),
                      (i) => removeNestedRule(idx, i),
                    );
                  })}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addNestedRule(idx)}>
                    <Plus className="size-3 mr-1" />Add condition
                  </Button>
                </div>
              );
            }

            return (
              <div key={idx}>
                {idx > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 border-t" />
                    <span className="text-[10px] text-muted-foreground font-medium">{group.logic}</span>
                    <div className="flex-1 border-t" />
                  </div>
                )}
                {renderRuleRow(item as SegmentRule, idx, updateRule, removeRule)}
              </div>
            );
          })}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="size-3.5 mr-1" />Add Condition
            </Button>
            <Button variant="outline" size="sm" onClick={addNestedGroup}>
              <Plus className="size-3.5 mr-1" />Add Group
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm">
            {previewing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3.5 animate-spin" />Counting...
              </span>
            ) : previewCount !== null ? (
              <span>
                <strong>{previewCount.toLocaleString()}</strong> contact{previewCount !== 1 ? "s" : ""} match
              </span>
            ) : (
              "Add conditions to preview matches"
            )}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={preview} disabled={previewing}>
          Preview
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin mr-1" />}
          <Save className="size-4 mr-1" />
          {segmentId ? "Update Segment" : "Save Segment"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </div>
  );
}
