"use client"

import { useState } from 'react'
import { Bot, BookOpen, FlaskConical, ScrollText, BarChart3, ShieldAlert } from 'lucide-react'
import { AISettingsForm } from '@/components/ai/ai-settings-form'
import { KnowledgeBaseManager } from '@/components/ai/knowledge-base-manager'
import { AITestChat } from '@/components/ai/ai-test-chat'
import { AILogsViewer } from '@/components/ai/ai-logs-viewer'
import { AIAnalyticsDashboard } from '@/components/ai/ai-analytics-dashboard'
import { useCan } from '@/hooks/use-can'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'settings', label: 'Settings', icon: Bot },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'test', label: 'Test', icon: FlaskConical },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AIChatbotPage() {
  const [activeTab, setActiveTab] = useState<TabId>('settings')
  const canEdit = useCan('edit-settings')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="h-7 w-7 text-purple-600" />
          AI Chatbot
        </h1>
        <p className="text-gray-500 mt-1">
          Configure your AI-powered customer service assistant for WhatsApp
        </p>
      </div>

      {/* Read-only banner for non-admin users */}
      {!canEdit && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <p>
            <span className="font-medium">Read-only access.</span>{' '}
            Contact your administrator to change AI settings, model configuration, or system prompts.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'settings' && <AISettingsForm readOnly={!canEdit} />}
        {activeTab === 'knowledge' && <KnowledgeBaseManager readOnly={!canEdit} />}
        {activeTab === 'test' && <AITestChat />}
        {activeTab === 'logs' && <AILogsViewer />}
        {activeTab === 'analytics' && <AIAnalyticsDashboard />}
      </div>
    </div>
  )
}
