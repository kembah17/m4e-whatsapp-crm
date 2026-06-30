"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Download, GitBranch, Loader2, MessageSquare, Users, Clock, BarChart3,
} from "lucide-react";

interface BranchStat {
  branch_id: string;
  branch_name: string;
  contact_count: number;
  message_count: number;
  avg_response_time_min: number;
  active_conversations: number;
  deal_count: number;
  total_revenue: number;
}

type DateRange = "7d" | "30d" | "90d";

export function BranchAnalytics() {
  const { accountId } = useAuth();
  const [stats, setStats] = useState<BranchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const fetchStats = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/branches/analytics?range=${dateRange}`);
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [accountId, dateRange]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  function exportCsv() {
    if (stats.length === 0) return;
    const h = ["Branch","Contacts","Messages","Avg Response (min)","Active Convos","Deals","Revenue"];
    const rows = stats.map((s) => [
      s.branch_name, s.contact_count, s.message_count,
      s.avg_response_time_min, s.active_conversations, s.deal_count, s.total_revenue,
    ]);
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branch-analytics-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxC = Math.max(...stats.map((s) => s.contact_count), 1);
  const maxM = Math.max(...stats.map((s) => s.message_count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="size-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">No branch data available</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create branches in Settings to see analytics here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Branch Performance</h3>
          <p className="text-sm text-muted-foreground">Compare metrics across your branches</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-3.5 mr-1" />CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" />Contacts per Branch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.map((s) => (
              <div key={s.branch_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.branch_name}</span>
                  <span className="font-medium">{s.contact_count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(s.contact_count / maxC) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="size-4 text-muted-foreground" />Messages Sent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.map((s) => (
              <div key={s.branch_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.branch_name}</span>
                  <span className="font-medium">{s.message_count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(s.message_count / maxM) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="size-4 text-muted-foreground" />Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.map((s) => (
              <div key={s.branch_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.branch_name}</span>
                <Badge variant={s.avg_response_time_min < 15 ? "default" : "secondary"}>
                  {s.avg_response_time_min < 60 ? `${Math.round(s.avg_response_time_min)}m` : `${Math.round(s.avg_response_time_min / 60)}h`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <GitBranch className="size-4 text-muted-foreground" />Active Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.map((s) => (
              <div key={s.branch_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.branch_name}</span>
                <span className="font-medium">{s.active_conversations}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Full Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Branch</th>
                  <th className="pb-2 font-medium text-right">Contacts</th>
                  <th className="pb-2 font-medium text-right">Messages</th>
                  <th className="pb-2 font-medium text-right">Resp. Time</th>
                  <th className="pb-2 font-medium text-right">Active</th>
                  <th className="pb-2 font-medium text-right">Deals</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.branch_id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{s.branch_name}</td>
                    <td className="py-2 text-right">{s.contact_count}</td>
                    <td className="py-2 text-right">{s.message_count}</td>
                    <td className="py-2 text-right">{Math.round(s.avg_response_time_min)}m</td>
                    <td className="py-2 text-right">{s.active_conversations}</td>
                    <td className="py-2 text-right">{s.deal_count}</td>
                    <td className="py-2 text-right">
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(s.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
