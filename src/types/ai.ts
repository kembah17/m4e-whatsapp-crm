export type KnowledgeCategory = 'faq' | 'product' | 'policy' | 'shipping' | 'returns' | 'pricing' | 'general'

export interface AIChatbotConfig {
  id: string
  account_id: string
  is_enabled: boolean
  model: string
  confidence_threshold: number
  max_auto_replies: number
  handoff_message: string
  greeting_message: string
  system_prompt: string
  business_hours: BusinessHoursConfig
  excluded_labels: string[]
  auto_greet_new_contacts: boolean
  fallback_message: string
  max_tokens: number
  temperature: number
  created_at: string
  updated_at: string
}

export interface BusinessHoursConfig {
  enabled: boolean
  timezone: string
  schedule: Record<string, { start: string; end: string } | null>
}

export interface AIKnowledgeEntry {
  id: string
  account_id: string
  category: KnowledgeCategory
  question: string
  answer: string
  keywords: string[]
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AIConversationLog {
  id: string
  account_id: string
  contact_id: string | null
  conversation_id: string | null
  inbound_message: string
  detected_intent: string | null
  confidence: number | null
  response_text: string | null
  knowledge_entry_id: string | null
  was_auto_replied: boolean
  was_handed_off: boolean
  handoff_reason: string | null
  model_used: string | null
  tokens_used: number | null
  latency_ms: number | null
  created_at: string
}

export interface IntentDetectionResult {
  intent: string
  confidence: number
  response: string
  knowledgeEntryId?: string
  shouldHandoff: boolean
  handoffReason?: string
}

export interface AIChatbotResult {
  handled: boolean
  response?: string
  intent?: string
  confidence?: number
  handedOff?: boolean
  ticketCreated?: boolean
  error?: string
}

export interface AIAnalytics {
  totalInteractions: number
  autoReplied: number
  handedOff: number
  avgConfidence: number
  avgLatencyMs: number
  topIntents: Array<{ intent: string; count: number }>
  dailyVolume: Array<{ date: string; count: number; auto_replied: number; handed_off: number }>
}

export interface AITestRequest {
  message: string
  contactName?: string
}

export interface AITestResponse {
  intent: string
  confidence: number
  response: string
  knowledgeMatch: { question: string; answer: string } | null
  model: string
  latencyMs: number
  tokensUsed: number
}
