"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Filter, Loader2, MoreHorizontal, Pencil, Plus, Target, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SegmentBuilder } from "@/components/contacts/segment-builder";
import type { SegmentGroup } from "@/lib/segments/segment-engine";

interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentGroup;
  contact_count: number;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/segments");
      if (res.ok) {
        const d = await res.json();
        setSegments(d.segments ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSegments(); }, [fetchSegments]);

  function startCreate() {
    setEditingSegment(null);
    setShowTemplates(true);
  }

  function startFromTemplate(template: typeof SEGMENT_TEMPLATES[number]) {
    setEditingSegment({
      id: '',
      name: template.name,
      description: template.description,
      rules: {
        match: 'all',
        rules: template.rules.map((r) => ({
          field: r.field,
          operator: r.operator as SegmentGroup['rules'][number]['operator'],
          value: String(r.value),
        })),
      },
      contact_count: 0,
      created_at: '',
      updated_at: '',
    } as unknown as Segment);
    setShowTemplates(false);
    setShowBuilder(true);
  }

  function startFromScratch() {
    setEditingSegment(null);
    setShowTemplates(false);
    setShowBuilder(true);
  }

  function startEdit(seg: Segment) {
    setEditingSegment(seg);
    setShowBuilder(true);
    setMenuOpen(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this segment?")) return;
    try {
      const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete segment"); return; }
      toast.success("Segment deleted");
      await fetchSegments();
    } catch { toast.error("Failed to delete segment"); }
    setMenuOpen(null);
  }

  async function handleSave(data: { name: string; description: string; rules: SegmentGroup }) {
    try {
      const url = editingSegment ? `/api/segments/${editingSegment.id}` : "/api/segments";
      const method = editingSegment ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save segment");
        return;
      }
      toast.success(editingSegment ? "Segment updated" : "Segment created");
      setShowBuilder(false);
      setEditingSegment(null);
      await fetchSegments();
    } catch { toast.error("Failed to save segment"); }
  }

  function countRules(rules: SegmentGroup): number {
    let count = 0;
    for (const item of rules.rules ?? []) {
      if ("logic" in item && "rules" in item) {
        count += countRules(item as SegmentGroup);
      } else {
        count++;
      }
    }
    return count;
  }


  if (showTemplates) {
    return (
      <div className="container mx-auto max-w-4xl py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Segment</h1>
          <Button variant="ghost" onClick={() => setShowTemplates(false)}>
            Cancel
          </Button>
        </div>
        <div className="grid gap-4 mb-8">
          <button
            onClick={startFromScratch}
            className="w-full text-left p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">Start from Scratch</div>
                <div className="text-sm text-muted-foreground">Build custom rules manually</div>
              </div>
            </div>
          </button>
        </div>
        <h2 className="text-lg font-semibold mb-4">Or start from a template</h2>
        {(['engagement', 'lifecycle', 'value', 'industry'] as const).map((category) => {
          const templates = SEGMENT_TEMPLATES.filter((t) => t.category === category);
          if (templates.length === 0) return null;
          return (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => startFromTemplate(template)}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (showBuilder) {
    return (
      <div className="container mx-auto max-w-4xl py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">
          {editingSegment ? "Edit Segment" : "Create Segment"}
        </h1>
        <SegmentBuilder
          segmentId={editingSegment?.id}
          initialName={editingSegment?.name}
          initialDescription={editingSegment?.description}
          initialRules={editingSegment?.rules}
          onSave={handleSave}
          onCancel={() => { setShowBuilder(false); setEditingSegment(null); }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="size-6" />
            Segments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create rule-based segments for targeted campaigns.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="size-4 mr-1" />New Segment
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : segments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No segments yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Create segments to group contacts by rules like activity, tags, purchase history, and more.
            Use segments to send targeted campaigns.
          </p>
          <Button onClick={startCreate} className="mt-6">
            <Plus className="size-4 mr-1" />Create Your First Segment
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {segments.map((seg) => (
            <Card key={seg.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                    <Target className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{seg.name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {countRules(seg.rules)} rule{countRules(seg.rules) !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {seg.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{seg.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {(seg.contact_count ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">contacts</p>
                  </div>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === seg.id ? null : seg.id);
                      }}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                    {menuOpen === seg.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-md border bg-popover shadow-md py-1">
                        <button
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
                          onClick={() => startEdit(seg)}
                        >
                          <Pencil className="size-3.5" />Edit
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-destructive"
                          onClick={() => handleDelete(seg.id)}
                        >
                          <Trash2 className="size-3.5" />Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
