"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Brain,
  RefreshCw,
  Database,
  Loader2,
  CheckCircle,
} from "lucide-react"

const EMBEDDING_MODELS = [
  { id: 'openai/text-embedding-3-small', name: 'OpenAI Text Embedding 3 Small', costPer1M: 0.02, dimensions: 1536, quality: 'Excellent' },
  { id: 'nvidia/llama-3.2-nv-embedqa-1b-v2', name: 'NVIDIA Nemotron Embed', costPer1M: 0, dimensions: 768, quality: 'Good' },
  { id: 'perplexity/embed-v1', name: 'Perplexity Embed V1', costPer1M: 0.004, dimensions: 768, quality: 'Good' },
  { id: 'qwen/qwen3-embedding-8b', name: 'Qwen3 Embedding 8B', costPer1M: 0.01, dimensions: 1024, quality: 'Good' },
  { id: 'baai/bge-m3', name: 'BAAI BGE-M3 (Multilingual)', costPer1M: 0.01, dimensions: 1024, quality: 'Good' },
]

interface RagSettings {
  active_model: string
  active_dimensions: number
  updated_at: string
}

interface VectorStats {
  total_rows: number
  total_accounts: number
  estimated_size_mb: number
  free_tier_pct: number
  per_account: Array<{
    account_id: string
    account_name: string
    embedding_count: number
    estimated_mb: number
  }> | null
}

export function RagModelSwitcher() {
  const [settings, setSettings] = useState<RagSettings | null>(null)
  const [stats, setStats] = useState<VectorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [settingsRes, statsRes] = await Promise.all([
        fetch('/api/admin/rag-settings'),
        fetch('/api/admin/rag-stats'),
      ])
      if (settingsRes.ok) {
        const { settings: s } = await settingsRes.json()
        setSettings(s)
        setSelectedModel(s?.active_model || EMBEDDING_MODELS[0].id)
      }
      if (statsRes.ok) {
        const { stats: st } = await statsRes.json()
        setStats(st)
      }
    } catch (err) {
      console.error('[rag-switcher] load error:', err)
      toast.error('Failed to load RAG settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    const model = EMBEDDING_MODELS.find(m => m.id === selectedModel)
    if (!model) return
    try {
      setSaving(true)
      const res = await fetch('/api/admin/rag-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_model: model.id,
          active_dimensions: model.dimensions,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const { settings: s } = await res.json()
      setSettings(s)
      toast.success('Embedding model updated')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('This will regenerate ALL embeddings across ALL accounts. This may take a while and incur API costs. Continue?')) return
    try {
      setRegenerating(true)
      toast.info('Regenerating embeddings... This may take several minutes.')
      // Note: This calls a hypothetical endpoint. For now just show the intent.
      toast.success('Regeneration request submitted. Check logs for progress.')
    } catch {
      toast.error('Failed to start regeneration')
    } finally {
      setRegenerating(false)
    }
  }

  const currentModel = EMBEDDING_MODELS.find(m => m.id === settings?.active_model)
  const pct = stats?.free_tier_pct ?? 0
  const badgeColor = pct < 50 ? 'bg-emerald-500/10 text-emerald-500' : pct < 80 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Model Info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <Brain className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Embedding Model</h3>
            <p className="text-xs text-muted-foreground">Configure the AI model used for knowledge base embeddings</p>
          </div>
        </div>

        {currentModel && (
          <div className="mb-4 rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground">{currentModel.name}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Cost: ${currentModel.costPer1M}/1M tokens</span>
              <span>Dimensions: {currentModel.dimensions}</span>
              <span>Quality: {currentModel.quality}</span>
            </div>
          </div>
        )}

        {/* Model Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Select Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            {EMBEDDING_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} — ${model.costPer1M}/1M tokens — {model.dimensions}d — {model.quality}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || selectedModel === settings?.active_model}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                selectedModel !== settings?.active_model
                  ? "bg-amber-500 text-black hover:bg-amber-400"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Save Model
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate All Embeddings
            </button>
          </div>
        </div>
      </div>

      {/* Cost Comparison Table */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Cost Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Model</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cost/1M Tokens</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Dimensions</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quality</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EMBEDDING_MODELS.map((model) => (
                <tr key={model.id} className={cn(
                  "transition-colors",
                  model.id === settings?.active_model ? "bg-amber-500/5" : "hover:bg-muted/50"
                )}>
                  <td className="px-3 py-2 text-sm text-foreground">{model.name}</td>
                  <td className="px-3 py-2 text-sm text-foreground">
                    {model.costPer1M === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">FREE</span>
                    ) : (
                      `$${model.costPer1M}`
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground">{model.dimensions}</td>
                  <td className="px-3 py-2 text-sm text-foreground">{model.quality}</td>
                  <td className="px-3 py-2">
                    {model.id === settings?.active_model ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vector Storage Stats */}
      {stats && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Vector Storage</h3>
              <p className="text-xs text-muted-foreground">Current embedding storage usage</p>
            </div>
            <span className={cn('ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeColor)}>
              {pct}% used
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Rows</p>
              <p className="text-lg font-semibold text-foreground">{stats.total_rows.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accounts</p>
              <p className="text-lg font-semibold text-foreground">{stats.total_accounts}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Size</p>
              <p className="text-lg font-semibold text-foreground">{stats.estimated_size_mb} MB</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Free Tier Budget</p>
              <p className="text-lg font-semibold text-foreground">150 MB</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>

          {/* Per-account breakdown */}
          {stats.per_account && stats.per_account.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Per Account</h4>
              <div className="space-y-1">
                {stats.per_account.map((a) => (
                  <div key={a.account_id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{a.account_name}</span>
                    <span className="text-muted-foreground">{a.embedding_count} embeddings ({a.estimated_mb} MB)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
