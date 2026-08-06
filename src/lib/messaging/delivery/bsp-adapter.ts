import type {
  DeliveryAdapter,
  DeliveryResult,
  SendTextArgs,
  SendTemplateArgs,
  SendMediaArgs,
  SendInteractiveArgs,
} from './types'

/**
 * BSP (Business Solution Provider) delivery adapter - STUB.
 *
 * This adapter will be implemented when M4E selects a BSP partner
 * (recommended: Go4whatsup for safety, Sendozi for cost control).
 *
 * BSPs provide WhatsApp API access without requiring direct Meta
 * Business Verification. They handle the Meta relationship and
 * provide their own API endpoints.
 *
 * DATA MINIMIZATION: When implemented, this adapter will:
 * - Send messages individually (no batch recipient uploads)
 * - Only pass message content and recipient phone number
 * - Never upload contact lists or customer segments to the BSP
 * - All business intelligence stays in BGE's Supabase
 */
export class BspDeliveryAdapter implements DeliveryAdapter {
  readonly provider = 'bsp-go4whatsup' as const
  readonly channel = 'whatsapp' as const

  constructor(
    private _apiKey: string,
    private _baseUrl: string,
  ) {}

  async sendText(_args: SendTextArgs): Promise<DeliveryResult> {
    throw new Error(
      'BSP adapter not yet implemented. Select a BSP partner first.',
    )
  }

  async sendTemplate(_args: SendTemplateArgs): Promise<DeliveryResult> {
    throw new Error(
      'BSP adapter not yet implemented. Select a BSP partner first.',
    )
  }

  async sendMedia(_args: SendMediaArgs): Promise<DeliveryResult> {
    throw new Error(
      'BSP adapter not yet implemented. Select a BSP partner first.',
    )
  }

  async sendInteractive(_args: SendInteractiveArgs): Promise<DeliveryResult> {
    throw new Error(
      'BSP adapter not yet implemented. Select a BSP partner first.',
    )
  }

  async isConfigured(): Promise<boolean> {
    return false // Not implemented yet
  }
}
