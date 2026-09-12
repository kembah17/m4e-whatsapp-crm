"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Trash2, Edit2, Upload, X, Loader2,
  CheckCircle, AlertTriangle, Tag, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIKnowledgeEntry, KnowledgeCategory } from '@/types/ai'

const CATEGORIES: { value: KnowledgeCategory | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'faq', label: 'FAQ', color: 'bg-blue-100 text-blue-700' },
  { value: 'product', label: 'Product', color: 'bg-purple-100 text-purple-700' },
  { value: 'policy', label: 'Policy', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'shipping', label: 'Shipping', color: 'bg-green-100 text-green-700' },
  { value: 'returns', label: 'Returns', color: 'bg-red-100 text-red-700' },
  { value: 'pricing', label: 'Pricing', color: 'bg-orange-100 text-orange-700' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-600' },
]

interface EntryForm {
  category: KnowledgeCategory
  question: string
  answer: string
  keywords: string
  priority: number
}

const EMPTY_FORM: EntryForm = {
  category: 'general',
  question: '',
  answer: '',
  keywords: '',
  priority: 0,
}

interface KnowledgeBaseManagerProps {
  readOnly?: boolean;
}

export function KnowledgeBaseManager({ readOnly = false }: KnowledgeBaseManagerProps) {
  const [entries, setEntries] = useState<AIKnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkJson, setBulkJson] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [showSeedDialog, setShowSeedDialog] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedForm, setSeedForm] = useState({
    business_name: '',
    description: '',
    industry: '',
    products: '',
    services: '',
    business_hours: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    pricing_info: '',
    return_policy: '',
    payment_methods: '',
  })
  const [quota, setQuota] = useState<{ current: number; limit: number; tier: string } | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ active: 'false', include_quota: 'true' })
      if (activeCategory !== 'all') params.set('category', activeCategory)
      if (search) params.set('search', search)
      const res = await fetch(`/api/ai/knowledge?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setEntries(data.entries)
      if (data.quota) setQuota(data.quota)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [activeCategory, search])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleSeedKB = async () => {
    try {
      setSeeding(true)
      setError(null)

      const payload: Record<string, unknown> = {}
      if (seedForm.business_name.trim()) payload.business_name = seedForm.business_name.trim()
      if (seedForm.description.trim()) payload.description = seedForm.description.trim()
      if (seedForm.industry.trim()) payload.industry = seedForm.industry.trim()
      if (seedForm.products.trim()) {
        payload.products = seedForm.products.split('\n').map(s => s.trim()).filter(Boolean)
      }
      if (seedForm.services.trim()) {
        payload.services = seedForm.services.split('\n').map(s => s.trim()).filter(Boolean)
      }
      if (seedForm.business_hours.trim()) payload.business_hours = seedForm.business_hours.trim()
      if (seedForm.address.trim()) payload.address = seedForm.address.trim()
      if (seedForm.phone.trim()) payload.phone = seedForm.phone.trim()
      if (seedForm.email.trim()) payload.email = seedForm.email.trim()
      if (seedForm.website.trim()) payload.website = seedForm.website.trim()
      if (seedForm.pricing_info.trim()) payload.pricing_info = seedForm.pricing_info.trim()

      const policies: Record<string, string> = {}
      if (seedForm.return_policy.trim()) policies.returns = seedForm.return_policy.trim()
      if (seedForm.payment_methods.trim()) policies.payment = seedForm.payment_methods.trim()
      if (Object.keys(policies).length > 0) payload.policies = policies

      if (Object.keys(payload).length === 0) {
        setError('Please fill in at least some business information')
        return
      }

      const res = await fetch('/api/ai/knowledge/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to seed knowledge base' }))
        throw new Error(err.error || 'Failed to seed knowledge base')
      }

      const result = await res.json()
      setShowSeedDialog(false)
      fetchEntries()
      setError(null)
      // Show success inline since we don't have toast here
      alert(`Successfully created ${result.created} knowledge base entries!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed knowledge base')
    } finally {
      setSeeding(false)
    }
  }

  const fetchAccountInfo = async () => {
    try {
      const res = await fetch('/api/account')
      if (!res.ok) return
      const data = await res.json()
      const acct = data.account || data
      setSeedForm(prev => ({
        ...prev,
        business_name: acct.business_name || acct.name || prev.business_name,
        industry: acct.industry || prev.industry,
        email: acct.support_email || acct.email || prev.email,
        phone: acct.support_phone || acct.phone || prev.phone,
        website: acct.website || prev.website,
      }))
    } catch {
      // Silently fail - user can fill in manually
    }
  }

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('Question and answer are required')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const payload = {
        category: form.category,
        question: form.question.trim(),
        answer: form.answer.trim(),
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
        priority: form.priority,
      }

      const url = editingId ? `/api/ai/knowledge/${editingId}` : '/api/ai/knowledge'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      fetchEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (entry: AIKnowledgeEntry) => {
    setEditingId(entry.id)
    setForm({
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords.join(', '),
      priority: entry.priority,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return
    try {
      const res = await fetch(`/api/ai/knowledge/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      fetchEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleToggleActive = async (entry: AIKnowledgeEntry) => {
    try {
      await fetch(`/api/ai/knowledge/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !entry.is_active }),
      })
      fetchEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleBulkImport = async () => {
    try {
      setBulkImporting(true)
      setError(null)
      const parsed = JSON.parse(bulkJson)
      const entriesArr = Array.isArray(parsed) ? parsed : parsed.entries
      if (!Array.isArray(entriesArr)) throw new Error('Expected an array of entries')

      const res = await fetch('/api/ai/knowledge/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesArr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      setShowBulkImport(false)
      setBulkJson('')
      fetchEntries()
      alert(`Imported ${data.imported} entries${data.skipped ? `, skipped ${data.skipped}` : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBulkImporting(false)
    }
  }

  const getCategoryColor = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                activeCategory === cat.value
                  ? cat.color + ' ring-2 ring-offset-1 ring-purple-400'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            onClick={() => { setShowSeedDialog(true); fetchAccountInfo() }}
            disabled={readOnly}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" /> Seed KB
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            disabled={readOnly}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            disabled={readOnly}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Knowledge Quota */}
      {quota && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Knowledge Entries: {quota.current} / {quota.limit} ({quota.tier} tier)
            </span>
            <span className={cn(
              'font-medium',
              quota.current / quota.limit < 0.8 ? 'text-emerald-600' : quota.current / quota.limit < 1 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {Math.round((quota.current / quota.limit) * 100)}% used
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                quota.current / quota.limit < 0.8 ? 'bg-emerald-500' : quota.current / quota.limit < 1 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min((quota.current / quota.limit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {editingId ? 'Edit Entry' : 'Add Knowledge Entry'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null) }}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as KnowledgeCategory })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.filter(c => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="What is your return policy?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              rows={4}
              placeholder="We accept returns within 30 days of purchase..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="return, refund, exchange, policy"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || readOnly}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Bulk Import</h3>
            <button onClick={() => setShowBulkImport(false)}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Paste a JSON array of entries. Each entry needs: question, answer. Optional: category, keywords, priority.
          </p>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={8}
            placeholder={'[\n  {\n    "category": "faq",\n    "question": "What are your hours?",\n    "answer": "We are open Mon-Fri 9am-5pm",\n    "keywords": ["hours", "open", "time"]\n  }\n]'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBulkImport(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkImport}
              disabled={readOnly || bulkImporting || !bulkJson.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {bulkImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bulkImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No knowledge entries yet</p>
          <p className="text-sm mt-1">Add entries to help the AI answer customer questions accurately.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Question</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Answer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Keywords</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => (
                  <tr key={entry.id} className={cn('hover:bg-gray-50', !entry.is_active && 'opacity-50')}>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-gray-900 truncate">{entry.question}</p>
                    </td>
                    <td className="px-4 py-3 max-w-sm hidden md:table-cell">
                      <p className="text-gray-600 truncate">{entry.answer}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getCategoryColor(entry.category))}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {entry.keywords.slice(0, 3).map((kw, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            <Tag className="h-3 w-3" />{kw}
                          </span>
                        ))}
                        {entry.keywords.length > 3 && (
                          <span className="text-xs text-gray-400">+{entry.keywords.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(entry)}
                        className={cn(
                          'w-8 h-5 rounded-full transition-colors relative',
                          entry.is_active ? 'bg-green-500' : 'bg-gray-300',
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                          entry.is_active ? 'left-3.5' : 'left-0.5',
                        )} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={readOnly}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      )}

      {/* Seed Knowledge Base Dialog */}
      {showSeedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Seed Knowledge Base
              </h3>
              <button onClick={() => setShowSeedDialog(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Fill in your business information to auto-generate knowledge base entries for your AI chatbot.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={seedForm.business_name}
                  onChange={(e) => setSeedForm(p => ({ ...p, business_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={seedForm.description}
                  onChange={(e) => setSeedForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="What does your business do?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={seedForm.industry}
                    onChange={(e) => setSeedForm(p => ({ ...p, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Fashion, Food"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Business Hours</label>
                  <input
                    type="text"
                    value={seedForm.business_hours}
                    onChange={(e) => setSeedForm(p => ({ ...p, business_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Mon-Fri 9am-6pm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Products (one per line)</label>
                <textarea
                  value={seedForm.products}
                  onChange={(e) => setSeedForm(p => ({ ...p, products: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder={"Product A\nProduct B\nProduct C"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Services (one per line)</label>
                <textarea
                  value={seedForm.services}
                  onChange={(e) => setSeedForm(p => ({ ...p, services: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder={"Service A\nService B"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={seedForm.phone}
                    onChange={(e) => setSeedForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="+234..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={seedForm.email}
                    onChange={(e) => setSeedForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="info@business.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={seedForm.website}
                    onChange={(e) => setSeedForm(p => ({ ...p, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={seedForm.address}
                    onChange={(e) => setSeedForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="123 Main St, Lagos"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pricing Info</label>
                <textarea
                  value={seedForm.pricing_info}
                  onChange={(e) => setSeedForm(p => ({ ...p, pricing_info: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Describe your pricing structure"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Return/Refund Policy</label>
                <textarea
                  value={seedForm.return_policy}
                  onChange={(e) => setSeedForm(p => ({ ...p, return_policy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Describe your return/refund policy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Methods</label>
                <input
                  type="text"
                  value={seedForm.payment_methods}
                  onChange={(e) => setSeedForm(p => ({ ...p, payment_methods: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Bank transfer, Cash, Card, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowSeedDialog(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedKB}
                disabled={seeding || !seedForm.business_name.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {seeding ? 'Generating...' : 'Generate Entries'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
