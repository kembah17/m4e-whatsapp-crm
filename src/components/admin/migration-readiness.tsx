'use client';

import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Users,
  MessageSquare,
  MessagesSquare,
  Download,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Loader2,
  Server,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface SystemStats {
  contacts: number;
  conversations: number;
  messages: number;
  campaigns: number;
  templates: number;
  automations: number;
  loading: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: 'done' | 'pending' | 'blocked';
  category: 'data' | 'infra' | 'config';
}

// ── Helpers ─────────────────────────────────────────────────

function statusIcon(status: ChecklistItem['status']) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'pending':
      return <Circle className="h-4 w-4 text-amber-500" />;
    case 'blocked':
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
  }
}

function statusBadge(status: ChecklistItem['status']) {
  const map = {
    done: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    blocked: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <Badge className={`text-[10px] ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function estimateEffort(stats: SystemStats): string {
  const total = stats.contacts + stats.conversations + stats.messages;
  if (total === 0) return 'No data to migrate';
  if (total < 1000) return '< 1 hour (small dataset)';
  if (total < 10000) return '1-4 hours (medium dataset)';
  if (total < 100000) return '4-12 hours (large dataset)';
  return '12-48 hours (enterprise dataset)';
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ── Checklist data ──────────────────────────────────────────

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'adapter-interface',
    label: 'Messaging adapter interface',
    description: 'Abstract interface for provider-agnostic messaging',
    status: 'done',
    category: 'infra',
  },
  {
    id: 'supabase-adapter',
    label: 'Supabase adapter implementation',
    description: 'Current data model mapped to abstract interface',
    status: 'done',
    category: 'infra',
  },
  {
    id: 'chatwoot-adapter',
    label: 'Chatwoot adapter stub',
    description: 'API endpoints documented, implementation pending',
    status: 'pending',
    category: 'infra',
  },
  {
    id: 'chatwoot-instance',
    label: 'Chatwoot instance provisioned',
    description: 'Self-hosted or cloud Chatwoot instance ready',
    status: 'blocked',
    category: 'infra',
  },
  {
    id: 'data-export',
    label: 'Data export capability',
    description: 'Export contacts, conversations, messages as JSON',
    status: 'done',
    category: 'data',
  },
  {
    id: 'contact-migration',
    label: 'Contact migration script',
    description: 'Bulk import contacts into Chatwoot via API',
    status: 'pending',
    category: 'data',
  },
  {
    id: 'conversation-migration',
    label: 'Conversation history migration',
    description: 'Transfer conversation threads with messages',
    status: 'pending',
    category: 'data',
  },
  {
    id: 'webhook-routing',
    label: 'Webhook routing update',
    description: 'Route WhatsApp webhooks to Chatwoot',
    status: 'pending',
    category: 'config',
  },
  {
    id: 'whatsapp-channel',
    label: 'WhatsApp channel in Chatwoot',
    description: 'Connect WhatsApp Business API to Chatwoot inbox',
    status: 'blocked',
    category: 'config',
  },
  {
    id: 'agent-accounts',
    label: 'Agent accounts provisioned',
    description: 'Team members created in Chatwoot with correct roles',
    status: 'pending',
    category: 'config',
  },
];

// ── Component ───────────────────────────────────────────────

export function MigrationReadiness() {
  const [stats, setStats] = useState<SystemStats>({
    contacts: 0,
    conversations: 0,
    messages: 0,
    campaigns: 0,
    templates: 0,
    automations: 0,
    loading: true,
  });
  const [exporting, setExporting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        const [contacts, conversations, messages, campaigns, templates, automations] =
          await Promise.all([
            supabase.from('contacts').select('id', { count: 'exact', head: true }),
            supabase.from('conversations').select('id', { count: 'exact', head: true }),
            supabase.from('messages').select('id', { count: 'exact', head: true }),
            supabase.from('campaigns').select('id', { count: 'exact', head: true }),
            supabase.from('message_templates').select('id', { count: 'exact', head: true }),
            supabase.from('automations').select('id', { count: 'exact', head: true }),
          ]);

        setStats({
          contacts: contacts.count ?? 0,
          conversations: conversations.count ?? 0,
          messages: messages.count ?? 0,
          campaigns: campaigns.count ?? 0,
          templates: templates.count ?? 0,
          automations: automations.count ?? 0,
          loading: false,
        });
      } catch (err) {
        console.error('[migration-readiness] stats fetch error:', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Fetch all contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .limit(10000);

      // Fetch all conversations with contact info
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .limit(10000);

      // Fetch recent messages (last 50k)
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50000);

      const exportData = {
        exportedAt: new Date().toISOString(),
        stats: {
          contacts: contacts?.length ?? 0,
          conversations: conversations?.length ?? 0,
          messages: messages?.length ?? 0,
        },
        contacts: contacts ?? [],
        conversations: conversations ?? [],
        messages: messages ?? [],
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `m4e-crm-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[migration-readiness] export error:', err);
    } finally {
      setExporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneCount = CHECKLIST.filter((c) => c.status === 'done').length;
  const progress = Math.round((doneCount / CHECKLIST.length) * 100);

  const categories = [
    { key: 'infra' as const, label: 'Infrastructure', icon: Server },
    { key: 'data' as const, label: 'Data Migration', icon: Database },
    { key: 'config' as const, label: 'Configuration', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Migration Readiness
        </h1>
        <p className="text-sm text-muted-foreground">
          Chatwoot migration preparation status and data export tools.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Contacts', value: stats.contacts, icon: Users, color: 'text-blue-500' },
          { label: 'Conversations', value: stats.conversations, icon: MessagesSquare, color: 'text-emerald-500' },
          { label: 'Messages', value: stats.messages, icon: MessageSquare, color: 'text-amber-500' },
          { label: 'Campaigns', value: stats.campaigns, icon: Database, color: 'text-purple-500' },
          { label: 'Templates', value: stats.templates, icon: MessageSquare, color: 'text-pink-500' },
          { label: 'Automations', value: stats.automations, icon: Server, color: 'text-cyan-500' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    formatNumber(s.value)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Migration effort estimate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Estimated Migration Effort</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium text-foreground">
            {stats.loading ? 'Calculating...' : estimateEffort(stats)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on {formatNumber(stats.contacts + stats.conversations + stats.messages)} total
            records across contacts, conversations, and messages.
          </p>
        </CardContent>
      </Card>

      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Migration Checklist</CardTitle>
            <span className="text-xs text-muted-foreground">
              {doneCount}/{CHECKLIST.length} complete
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />

          {categories.map((cat) => {
            const items = CHECKLIST.filter((c) => c.category === cat.key);
            return (
              <div key={cat.key}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </p>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      {statusIcon(item.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {item.label}
                          </span>
                          {statusBadge(item.status)}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Data Export</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Export all contacts, conversations, and messages as a JSON file for migration
            or backup purposes.
          </p>
          <Button onClick={handleExport} disabled={exporting || stats.loading}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
