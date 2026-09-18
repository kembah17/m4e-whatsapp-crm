'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Pencil } from 'lucide-react';
import {
  ITEM_TYPE_REGISTRY,
  getIndustryBundle,
  getItemTypeLabel,
} from '@/lib/industry/item-type-config';
import type { ItemType, AccountItemTypeConfig } from '@/types';

const ALL_ITEM_TYPES: ItemType[] = [
  'product', 'service', 'menu_item', 'ingredient', 'supply',
  'asset', 'programme', 'property', 'package', 'subscription',
];

export function ItemTypeSettings() {
  const { industry } = useAuth();
  const [configs, setConfigs] = useState<AccountItemTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  const bundle = useMemo(() => getIndustryBundle(industry), [industry]);
  const primaryTypeSet = useMemo(
    () => new Set(bundle.primaryTypes.map(t => t.type)),
    [bundle]
  );
  const secondaryTypeSet = useMemo(
    () => new Set((bundle.secondaryTypes ?? []).map(t => t.type)),
    [bundle]
  );

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/item-types');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setConfigs(json.configs ?? []);
    } catch {
      toast.error('Failed to load item type settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  function isEnabled(type: ItemType): boolean {
    const config = configs.find(c => c.item_type === type);
    if (config) return config.is_enabled;
    return primaryTypeSet.has(type);
  }

  function getCustomLabel(type: ItemType): string | undefined {
    return configs.find(c => c.item_type === type)?.display_label ?? undefined;
  }

  async function toggleType(type: ItemType, enabled: boolean) {
    setSaving(type);
    try {
      const res = await fetch('/api/settings/item-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: type, is_enabled: enabled }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${ITEM_TYPE_REGISTRY[type].icon} ${getItemTypeLabel(type, industry)} ${enabled ? 'enabled' : 'disabled'}`);
      fetchConfigs();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(null);
    }
  }

  async function saveLabel(type: ItemType) {
    setSaving(type);
    try {
      const res = await fetch('/api/settings/item-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: type,
          is_enabled: isEnabled(type),
          display_label: labelDraft || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Label updated');
      setEditingLabel(null);
      fetchConfigs();
    } catch {
      toast.error('Failed to save label');
    } finally {
      setSaving(null);
    }
  }

  function renderTypeRow(type: ItemType, badge?: string) {
    const def = ITEM_TYPE_REGISTRY[type];
    const enabled = isEnabled(type);
    const customLabel = getCustomLabel(type);
    const isEditing = editingLabel === type;

    return (
      <div key={type} className="flex items-start gap-3 py-3">
        <span className="text-xl mt-0.5">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {customLabel || getItemTypeLabel(type, industry)}
            </span>
            {badge && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder={getItemTypeLabel(type, industry)}
                className="h-7 text-xs bg-muted/50 border-border max-w-[200px]"
              />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveLabel(type)} disabled={saving === type}>
                {saving === type ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingLabel(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            enabled && (
              <button
                type="button"
                onClick={() => { setEditingLabel(type); setLabelDraft(customLabel || ''); }}
                className="text-[10px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1"
              >
                <Pencil className="h-2.5 w-2.5" /> Rename
              </button>
            )
          )}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => toggleType(type, v)}
          disabled={saving === type}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const primaryTypes = ALL_ITEM_TYPES.filter(t => primaryTypeSet.has(t));
  const secondaryTypes = ALL_ITEM_TYPES.filter(t => secondaryTypeSet.has(t));
  const otherTypes = ALL_ITEM_TYPES.filter(t => !primaryTypeSet.has(t) && !secondaryTypeSet.has(t));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Item Types</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which item types are available for your {bundle.displayName.toLowerCase()} business.
          Recommended types are pre-enabled based on your industry.
        </p>
      </div>

      {/* Primary / Recommended */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Recommended for {bundle.displayName}
        </h4>
        <div className="rounded-lg border border-border bg-card divide-y divide-border px-4">
          {primaryTypes.map(t => renderTypeRow(t, 'Recommended'))}
        </div>
      </div>

      {/* Secondary / Also Available */}
      {secondaryTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Also Available
          </h4>
          <div className="rounded-lg border border-border bg-card divide-y divide-border px-4">
            {secondaryTypes.map(t => {
              const reason = bundle.secondaryTypes?.find(s => s.type === t)?.reason;
              return (
                <div key={t}>
                  {renderTypeRow(t)}
                  {reason && (
                    <p className="text-[10px] text-muted-foreground -mt-2 mb-2 ml-9">
                      {reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Types */}
      {otherTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            All Other Types
          </h4>
          <div className="rounded-lg border border-border bg-card divide-y divide-border px-4">
            {otherTypes.map(t => renderTypeRow(t))}
          </div>
        </div>
      )}
    </div>
  );
}
