import type {
  DeliveryAdapter,
  DeliveryResult,
  SendTextArgs,
  SendTemplateArgs,
  SendMediaArgs,
  SendInteractiveArgs,
} from './types'

/**
 * Termii SMS delivery adapter.
 * SMS ONLY - does not support templates, media, or interactive messages.
 * Used as a fallback channel when WhatsApp is unavailable.
 *
 * Termii API docs: https://developers.termii.com/
 * Pricing: approximately N4 per SMS segment in Nigeria
 */
export class TermiiSmsDeliveryAdapter implements DeliveryAdapter {
  readonly provider = 'termii-sms' as const
  readonly channel = 'sms' as const

  private apiKey: string
  private senderId: string
  private baseUrl = 'https://api.ng.termii.com/api'

  constructor(apiKey: string, senderId: string) {
    this.apiKey = apiKey
    this.senderId = senderId
  }

  async sendText(args: SendTextArgs): Promise<DeliveryResult> {
    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: args.to,
          from: this.senderId,
          sms: args.text,
          type: 'plain',
          channel: 'generic',
          api_key: this.apiKey,
        }),
      })

      const data = await response.json()

      if (data.code === 'ok') {
        return {
          success: true,
          messageId: data.message_id,
          providerResponse: data,
        }
      }

      return {
        success: false,
        error: data.message || 'Termii send failed',
        providerResponse: data,
        retryable: response.status === 429 || response.status >= 500,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
      }
    }
  }

  async sendTemplate(args: SendTemplateArgs): Promise<DeliveryResult> {
    // SMS does not support WhatsApp templates
    // Convert template to plain text and send as SMS
    const text = args.bodyParams?.join(' ') || args.templateName
    return this.sendText({ to: args.to, text: `[${args.templateName}] ${text}` })
  }

  async sendMedia(_args: SendMediaArgs): Promise<DeliveryResult> {
    return {
      success: false,
      error:
        'SMS does not support media messages. Use WhatsApp channel instead.',
      retryable: false,
    }
  }

  async sendInteractive(_args: SendInteractiveArgs): Promise<DeliveryResult> {
    return {
      success: false,
      error:
        'SMS does not support interactive messages. Use WhatsApp channel instead.',
      retryable: false,
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.apiKey && this.senderId)
  }
}
