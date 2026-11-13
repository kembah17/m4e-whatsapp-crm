'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ArrowRight, Plus, Sparkles } from 'lucide-react';

const categoryColors: Record<string, string> = {
  Marketing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Utility: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Authentication: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

interface Step1Props {
  selectedTemplate: MessageTemplate | null;
  onSelect: (template: MessageTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1ChooseTemplate({ selectedTemplate, onSelect, onNext, onBack }: Step1Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTemplates(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadPresets() {
    setLoadingPresets(true);
    try {
      const res = await fetch('/api/whatsapp/templates/load-presets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load presets');

      const msg = data.submitted > 0
        ? `${data.submitted} starter template${data.submitted === 1 ? '' : 's'} submitted to Meta for approval`
        : 'All starter templates already exist';
      toast.success(msg);

      if (data.errors?.length) {
        toast.error(`${data.errors.length} template${data.errors.length === 1 ? '' : 's'} failed — check Settings > Templates for details`);
      }

      // Re-fetch approved templates (presets will be PENDING initially,
      // but any previously-loaded presets that got approved will show)
      await fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load presets');
    } finally {
      setLoadingPresets(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Choose a Template</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an approved message template for your broadcast.
          </p>
        </div>
        <Link href="/settings?tab=templates">
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-medium text-foreground">No Templates Yet</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-md">
            Message templates must be created and approved by Meta before you can send broadcasts.
            This typically takes 24 hours.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/settings?tab=templates">
              <Button variant="outline" className="border-border">
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </Link>
            <Button
              onClick={handleLoadPresets}
              disabled={loadingPresets}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loadingPresets ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Load Starter Templates
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center max-w-sm">
            Starter templates include common messages for customer engagement, promotions, and follow-ups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            const catColor = categoryColors[template.category] ?? categoryColors.Utility;

            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-card/50 hover:border-border hover:bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-foreground">{template.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catColor}`}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{template.body_text}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{template.language ?? 'en_US'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
