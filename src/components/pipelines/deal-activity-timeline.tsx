"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Phone,
  Users,
  Mail,
  Send,
  ArrowRight,
  Banknote,
  FileText,
  CheckSquare,
  RefreshCw,
  UserCheck,
  Plus,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { DealActivity, ActivityType } from "@/types/offline-operations";
import { ACTIVITY_TYPE_LABELS } from "@/types/offline-operations";

const ACTIVITY_ICONS: Record<ActivityType, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  meeting: Users,
  email_sent: Mail,
  whatsapp_sent: Send,
  stage_change: ArrowRight,
  payment_received: Banknote,
  document_uploaded: FileText,
  task_completed: CheckSquare,
  status_change: RefreshCw,
  assignment_change: UserCheck,
  other: MoreHorizontal,
};

const MANUAL_ACTIVITY_TYPES: ActivityType[] = [
  "note",
  "call",
  "meeting",
  "email_sent",
  "whatsapp_sent",
  "document_uploaded",
  "other",
];

interface DealActivityTimelineProps {
  dealId: string;
}

export function DealActivityTimeline({ dealId }: DealActivityTimelineProps) {
  const { accountId } = useAuth();
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/deals/${dealId}/activities?limit=50`
      );
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId) fetchActivities();
  }, [dealId, fetchActivities]);

  async function handleAddActivity() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activityType,
          title: title.trim(),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add activity");
      toast.success("Activity added");
      setTitle("");
      setDescription("");
      setShowForm(false);
      fetchActivities();
    } catch {
      toast.error("Failed to add activity");
    } finally {
      setSaving(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Activity</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-7 text-xs border-border bg-transparent text-muted-foreground hover:bg-muted"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="h-8 w-full rounded-md border border-border bg-muted px-2 text-xs text-foreground"
            >
              {MANUAL_ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary..."
              className="h-8 text-xs border-border bg-muted"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Details</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              className="min-h-[60px] text-xs border-border bg-muted"
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
              onClick={handleAddActivity}
              disabled={saving || !title.trim()}
              className="h-7 text-xs bg-primary text-primary-foreground"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No activity yet
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-0">
              {activities.map((activity, idx) => {
                const Icon =
                  ACTIVITY_ICONS[activity.activity_type] || MoreHorizontal;
                const isStageChange =
                  activity.activity_type === "stage_change";

                return (
                  <div key={activity.id} className="relative pl-8 pb-4">
                    {/* Timeline dot */}
                    <div className="absolute left-1.5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-muted border border-border">
                      <Icon className="h-2 w-2 text-muted-foreground" />
                    </div>

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground leading-tight">
                          {activity.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTime(activity.created_at)}
                        </span>
                      </div>

                      {isStageChange &&
                        activity.old_stage &&
                        activity.new_stage && (
                          <div className="mt-1 flex items-center gap-1 text-[10px]">
                            <span
                              className="rounded px-1 py-0.5"
                              style={{
                                backgroundColor:
                                  activity.old_stage.color + "20",
                                color: activity.old_stage.color,
                              }}
                            >
                              {activity.old_stage.name}
                            </span>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span
                              className="rounded px-1 py-0.5"
                              style={{
                                backgroundColor:
                                  activity.new_stage.color + "20",
                                color: activity.new_stage.color,
                              }}
                            >
                              {activity.new_stage.name}
                            </span>
                          </div>
                        )}

                      {activity.description && (
                        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                          {activity.description}
                        </p>
                      )}

                      {activity.performed_by_profile && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                          by{" "}
                          {activity.performed_by_profile.full_name ||
                            activity.performed_by_profile.email ||
                            "System"}
                        </p>
                      )}
                    </div>

                    {idx < activities.length - 1 && (
                      <Separator className="mt-3 bg-transparent" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
