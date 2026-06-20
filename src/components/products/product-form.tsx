'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { toast } from 'sonner';
import type { Product, ProductStatus } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Check,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: () => void;
}

interface Suggestions {
  short_pitch?: string;
  category?: string;
  description?: string;
  tags?: string[];
  lead_magnet_eligible?: boolean;
  seasonal_start?: string;
  seasonal_end?: string;
}

export function ProductForm({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormProps) {
  const { defaultCurrency } = useAuth();
  const canEdit = useCan('edit-settings');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [shortPitch, setShortPitch] = useState('');
  const [cost, setCost] = useState('');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [leadMagnetEligible, setLeadMagnetEligible] = useState(false);
  const [seasonalStart, setSeasonalStart] = useState('');
  const [seasonalEnd, setSeasonalEnd] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [aiGeneratedFields, setAiGeneratedFields] = useState<Record<string, boolean>>({});

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form when sheet opens
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setSuggestions({});
    setConfidence({});
    if (product) {
      setName(product.name);
      setPrice(String(product.price ?? ''));
      setStatus(product.status);
      setCategory(product.category ?? '');
      setDescription(product.description ?? '');
      setShortPitch(product.short_pitch ?? '');
      setCost(product.cost != null ? String(product.cost) : '');
      setSku(product.sku ?? '');
      setImageUrl(product.image_url ?? '');
      setLeadMagnetEligible(product.lead_magnet_eligible);
      setSeasonalStart(product.seasonal_start ?? '');
      setSeasonalEnd(product.seasonal_end ?? '');
      setTagsInput((product.tags ?? []).join(', '));
      setAiGeneratedFields(product.ai_generated_fields ?? {});
    } else {
      setName('');
      setPrice('');
      setStatus('active');
      setCategory('');
      setDescription('');
      setShortPitch('');
      setCost('');
      setSku('');
      setImageUrl('');
      setLeadMagnetEligible(false);
      setSeasonalStart('');
      setSeasonalEnd('');
      setTagsInput('');
      setAiGeneratedFields({});
    }
  }, [open, product]);

  // Debounced AI suggestions
  const fetchSuggestions = useCallback(async (n: string, p: string, d: string, c: string, co: string) => {
    if (!n.trim()) return;
    try {
      const res = await fetch('/api/products/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n,
          price: parseFloat(p) || undefined,
          description: d || undefined,
          category: c || undefined,
          cost: parseFloat(co) || undefined,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setSuggestions(json.suggestions ?? {});
      setConfidence(json.confidence ?? {});
    } catch {
      // Silently fail — suggestions are optional
    }
  }, []);

  useEffect(() => {
    if (!open || product) return; // Only suggest for new products
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      fetchSuggestions(name, price, description, category, cost);
    }, 500);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [open, product, name, price, description, category, cost, fetchSuggestions]);

  function acceptSuggestion(field: string, value: unknown) {
    switch (field) {
      case 'short_pitch':
        setShortPitch(value as string);
        break;
      case 'category':
        setCategory(value as string);
        break;
      case 'description':
        setDescription(value as string);
        break;
      case 'tags':
        setTagsInput((value as string[]).join(', '));
        break;
      case 'lead_magnet_eligible':
        setLeadMagnetEligible(value as boolean);
        break;
      case 'seasonal_start':
        setSeasonalStart(value as string);
        break;
      case 'seasonal_end':
        setSeasonalEnd(value as string);
        break;
    }
    setAiGeneratedFields((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      toast.error('Valid price is required');
      return;
    }
    setSaving(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      price: parseFloat(price),
      status,
      category: category.trim() || null,
      description: description.trim() || null,
      short_pitch: shortPitch.trim() || null,
      cost: cost ? parseFloat(cost) : null,
      sku: sku.trim() || null,
      image_url: imageUrl.trim() || null,
      lead_magnet_eligible: leadMagnetEligible,
      seasonal_start: seasonalStart || null,
      seasonal_end: seasonalEnd || null,
      tags,
      ai_generated_fields: aiGeneratedFields,
    };

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to save product');
      }
      toast.success(product ? 'Product updated' : 'Product created');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Product deleted');
      onSaved();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  function SuggestionHint({ field, label }: { field: string; label?: string }) {
    const value = suggestions[field as keyof Suggestions];
    const conf = confidence[field];
    if (value == null || conf == null) return null;
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    return (
      <button
        type="button"
        onClick={() => acceptSuggestion(field, value)}
        className="mt-1 flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        <span className="truncate">
          {label || 'Suggestion'}: {displayValue}
        </span>
        <span className="text-slate-600">({Math.round(conf * 100)}%)</span>
      </button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-900 border-slate-800">
        <SheetHeader>
          <SheetTitle className="text-white">
            {product ? 'Edit Product' : 'New Product'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Name *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium Hair Treatment"
              className="bg-slate-800/50 border-slate-700"
            />
          </div>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price ({defaultCurrency}) *</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-cost">Cost</Label>
              <Input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="product-category">Category</Label>
            <Input
              id="product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={suggestions.category || 'e.g. Hair Services'}
              className="bg-slate-800/50 border-slate-700"
            />
            <SuggestionHint field="category" label="Category" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={suggestions.description || 'Describe your product or service...'}
              rows={3}
              className="bg-slate-800/50 border-slate-700"
            />
            <SuggestionHint field="description" label="Description" />
          </div>

          {/* Short Pitch */}
          <div className="space-y-1.5">
            <Label htmlFor="product-pitch">Short Pitch</Label>
            <Textarea
              id="product-pitch"
              value={shortPitch}
              onChange={(e) => setShortPitch(e.target.value)}
              placeholder={suggestions.short_pitch || 'A brief compelling pitch (max 160 chars)...'}
              rows={2}
              maxLength={160}
              className="bg-slate-800/50 border-slate-700"
            />
            <SuggestionHint field="short_pitch" label="Pitch" />
          </div>

          {/* SKU + Image URL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Optional"
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-image">Image URL</Label>
              <Input
                id="product-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          </div>

          <Separator className="bg-slate-800" />

          {/* Lead Magnet */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Lead Magnet Eligible</Label>
              <p className="text-xs text-slate-500">Can be offered as a free/low-cost lead magnet</p>
            </div>
            <Switch
              checked={leadMagnetEligible}
              onCheckedChange={setLeadMagnetEligible}
            />
          </div>
          <SuggestionHint field="lead_magnet_eligible" label="Lead magnet" />

          {/* Seasonal Dates */}
          {status === 'seasonal' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="seasonal-start">Seasonal Start</Label>
                <Input
                  id="seasonal-start"
                  type="date"
                  value={seasonalStart}
                  onChange={(e) => setSeasonalStart(e.target.value)}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seasonal-end">Seasonal End</Label>
                <Input
                  id="seasonal-end"
                  type="date"
                  value={seasonalEnd}
                  onChange={(e) => setSeasonalEnd(e.target.value)}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="product-tags">Tags</Label>
            <Input
              id="product-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={suggestions.tags?.join(', ') || 'Comma-separated tags...'}
              className="bg-slate-800/50 border-slate-700"
            />
            <SuggestionHint field="tags" label="Tags" />
          </div>

          <Separator className="bg-slate-800" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !canEdit}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              {product ? 'Update' : 'Create'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
          </div>

          {/* Delete */}
          {product && canEdit && (
            <div className="pt-2">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1"
                  >
                    {deleting ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    Confirm Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete Product
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
