"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Save, Loader2, Power, PowerOff, Clock, AlertTriangle,
  ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIChatbotConfig, BusinessHoursConfig } from '@/types/ai'

const MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast & Cheap)' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Balanced)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Quality)' },
  { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Free Tier)' },
]

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const DEFAULT_SCHEDULE: BusinessHoursConfig['schedule'] = {
  monday: { start: '09:00', end: '17:00' },
  tuesday: { start: '09:00', end: '17:00' },
  wednesday: { start: '09:00', end: '17:00' },
  thursday: { start: '09:00', end: '17:00' },
  friday: { start: '09:00', end: '17:00' },
  saturday: { start: '09:00', end: '13:00' },
  sunday: null,
}

interface AISettingsFormProps {
  readOnly?: boolean;
}

export function AISettingsForm({ readOnly = false }: AISettingsFormProps) {
  const [config, setConfig] = useState<AIChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ai/config')
      if (!res.ok) throw new Error('Failed to load config')
      const data = await res.json()
      setConfig(data.config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSave = async () => {
    if (!config) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: config.is_enabled,
          model: config.model,
          confidence_threshold: config.confidence_threshold,
          max_auto_replies: config.max_auto_replies,
          handoff_message: config.handoff_message,
          greeting_message: config.greeting_message,
          system_prompt: config.system_prompt,
          business_hours: config.business_hours,
          excluded_labels: config.excluded_labels,
          auto_greet_new_contacts: config.auto_greet_new_contacts,
          fallback_message: config.fallback_message,
          max_tokens: config.max_tokens,
          temperature: config.temperature,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      const data = await res.json()
      setConfig(data.config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (updates: Partial<AIChatbotConfig>) => {
    if (!config) return
    setConfig({ ...config, ...updates })
  }

  const updateBusinessHours = (updates: Partial<BusinessHoursConfig>) => {
    if (!config) return
    setConfig({
      ...config,
      business_hours: { ...config.business_hours, ...updates },
    })
  }

  const updateDaySchedule = (day: string, value: { start: string; end: string } | null) => {
    if (!config) return
    setConfig({
      ...config,
      business_hours: {
        ...config.business_hours,
        schedule: { ...config.business_hours.schedule, [day]: value },
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load configuration'}</p>
        <button onClick={fetchConfig} className="mt-4 text-purple-600 hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Enable/Disable Toggle */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Chatbot Status</h3>
            <p className="text-sm text-gray-500 mt-1">
              {config.is_enabled
                ? 'AI chatbot is active and responding to messages'
                : 'AI chatbot is disabled — messages go to automations only'}
            </p>
          </div>
          <button
            onClick={() => updateConfig({ is_enabled: !config.is_enabled })}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              config.is_enabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {config.is_enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            {config.is_enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Model</h3>
        <select disabled={readOnly}
          value={config.model}
          onChange={(e) => updateConfig({ model: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Confidence Threshold */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Confidence Threshold</h3>
          <span className={cn(
            'text-sm font-mono font-bold px-2 py-1 rounded',
            config.confidence_threshold >= 0.7 ? 'bg-green-100 text-green-700' :
            config.confidence_threshold >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700',
          )}>
            {config.confidence_threshold.toFixed(2)}
          </span>
        </div>
        <input readOnly={readOnly}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.confidence_threshold}
          onChange={(e) => updateConfig({ confidence_threshold: parseFloat(e.target.value) })}
          className="w-full accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.0 (Reply to everything)</span>
          <span>1.0 (Only very confident)</span>
        </div>
        <p className="text-sm text-gray-500">
          Below this threshold, the AI sends the fallback message and hands off to a human.
        </p>
      </div>

      {/* Max Auto-Replies */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Max Auto-Replies (per contact, 24h)</h3>
        <input readOnly={readOnly}
          type="number"
          min={1}
          max={50}
          value={config.max_auto_replies}
          onChange={(e) => updateConfig({ max_auto_replies: parseInt(e.target.value, 10) || 3 })}
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
        <p className="text-sm text-gray-500">
          After this many AI replies to the same contact in 24 hours, the conversation is handed off.
        </p>
      </div>

      {/* System Prompt */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">System Prompt</h3>
          <span className="text-xs text-gray-400">{config.system_prompt.length} chars</span>
        </div>
        <textarea readOnly={readOnly}
          value={config.system_prompt}
          onChange={(e) => updateConfig({ system_prompt: e.target.value })}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
          placeholder="You are a helpful customer service assistant..."
        />
        <p className="text-sm text-gray-500">
          This prompt defines the AI&apos;s personality and behavior. Be specific about your business.
        </p>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Messages</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
            <input readOnly={readOnly}
              type="text"
              value={config.greeting_message}
              onChange={(e) => updateConfig({ greeting_message: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fallback Message</label>
            <input readOnly={readOnly}
              type="text"
              value={config.fallback_message}
              onChange={(e) => updateConfig({ fallback_message: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">Sent when AI confidence is below threshold</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Handoff Message</label>
            <input readOnly={readOnly}
              type="text"
              value={config.handoff_message}
              onChange={(e) => updateConfig({ handoff_message: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">Sent when customer requests a human agent</p>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
          </div>
          <button
            onClick={() => updateBusinessHours({ enabled: !config.business_hours.enabled })}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              config.business_hours.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500',
            )}
          >
            {config.business_hours.enabled ? 'Active' : 'Inactive'}
          </button>
        </div>

        {config.business_hours.enabled && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              AI only responds during these hours. Outside business hours, messages go to automations.
            </p>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const schedule = config.business_hours.schedule[day]
                const isActive = schedule !== null
                return (
                  <div key={day} className="flex items-center gap-3">
                    <button
                      onClick={() => updateDaySchedule(day, isActive ? null : { start: '09:00', end: '17:00' })}
                      className={cn(
                        'w-24 text-left text-sm font-medium capitalize py-1',
                        isActive ? 'text-gray-900' : 'text-gray-400 line-through',
                      )}
                    >
                      {day}
                    </button>
                    {isActive && schedule ? (
                      <>
                        <input readOnly={readOnly}
                          type="time"
                          value={schedule.start}
                          onChange={(e) => updateDaySchedule(day, { ...schedule, start: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <span className="text-gray-400">to</span>
                        <input readOnly={readOnly}
                          type="time"
                          value={schedule.end}
                          onChange={(e) => updateDaySchedule(day, { ...schedule, end: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
          {showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 space-y-4 border-t pt-4">
            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Temperature</label>
                <span className="text-sm font-mono text-gray-500">{config.temperature}</span>
              </div>
              <input readOnly={readOnly}
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 (Deterministic)</span>
                <span>2.0 (Creative)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input readOnly={readOnly}
                type="number"
                min={100}
                max={4000}
                step={50}
                value={config.max_tokens}
                onChange={(e) => updateConfig({ max_tokens: parseInt(e.target.value, 10) || 500 })}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Excluded Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excluded Labels (comma-separated)
              </label>
              <input readOnly={readOnly}
                type="text"
                value={config.excluded_labels.join(', ')}
                onChange={(e) =>
                  updateConfig({
                    excluded_labels: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="vip, do-not-disturb, manual-only"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Contacts with these labels will not receive AI responses
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || readOnly}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {success && (
          <span className="text-sm text-green-600 font-medium">✓ Settings saved successfully</span>
        )}
        {error && (
          <span className="text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> {error}
          </span>
        )}
      </div>
    </div>
  )
}
