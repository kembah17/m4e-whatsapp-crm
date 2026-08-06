/**
 * Delivery adapter interface for sending messages through different providers.
 *
 * IMPORTANT: This is separate from the STORAGE adapter (src/lib/messaging/adapter.ts)
 * which handles where messages are stored (Supabase/Chatwoot).
 * This handles HOW messages are delivered to end users.
 *
 * DATA MINIMIZATION PRINCIPLE:
 * - Only message content, recipient phone, and delivery metadata pass through adapters
 * - No customer segments, deal values, campaign strategies, or business intelligence
 * - All business logic stays in BGE's Supabase database
 * - Messages are sent INDIVIDUALLY, never as batch recipient lists
 */

export type DeliveryChannel = 'whatsapp' | 'sms' | 'telegram' // telegram future
export type DeliveryProvider =
  | 'meta-cloud'
  | 'termii-sms'
  | 'bsp-go4whatsup'
  | 'bsp-generic'

export interface DeliveryResult {
  success: boolean
  messageId?: string // Provider's message ID
  providerResponse?: unknown // Raw provider response for debugging
  error?: string
  errorCode?: string
  retryable?: boolean
}

export interface DeliveryStatusUpdate {
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  errorCode?: string
  errorMessage?: string
}

export interface SendTextArgs {
  to: string // E.164 phone number
  text: string
  // NO customer segment, deal value, or campaign ID here
  // Those stay in BGE's database
}

export interface SendTemplateArgs {
  to: string // E.164 phone number
  templateName: string
  templateLanguage: string
  bodyParams?: string[]
  headerParams?: {
    type: 'text' | 'image' | 'video' | 'document'
    value: string // text value or media URL
  }
  buttonParams?: Array<{
    type: 'url' | 'copy_code'
    value: string
  }>
}

export interface SendMediaArgs {
  to: string
  mediaType: 'image' | 'video' | 'audio' | 'document'
  mediaUrl?: string
  mediaId?: string
  caption?: string
  filename?: string
}

export interface SendInteractiveArgs {
  to: string
  type: 'buttons' | 'list'
  header?: { type: 'text'; text: string }
  body: string
  footer?: string
  buttons?: Array<{ id: string; title: string }>
  sections?: Array<{
    title: string
    rows: Array<{ id: string; title: string; description?: string }>
  }>
}

/**
 * Abstract delivery adapter interface.
 * Each provider implements this to send messages through their channel.
 */
export interface DeliveryAdapter {
  readonly provider: DeliveryProvider
  readonly channel: DeliveryChannel

  /** Send a plain text message to a single recipient */
  sendText(args: SendTextArgs): Promise<DeliveryResult>

  /** Send a template message to a single recipient */
  sendTemplate(args: SendTemplateArgs): Promise<DeliveryResult>

  /** Send a media message to a single recipient */
  sendMedia(args: SendMediaArgs): Promise<DeliveryResult>

  /** Send an interactive message (buttons/list) to a single recipient */
  sendInteractive(args: SendInteractiveArgs): Promise<DeliveryResult>

  /** Check if the adapter is properly configured and ready */
  isConfigured(): Promise<boolean>
}
