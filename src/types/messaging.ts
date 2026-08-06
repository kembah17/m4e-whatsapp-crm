/**
 * Messaging delivery provider types.
 * Used by the delivery abstraction layer (src/lib/messaging/delivery/)
 * and the messaging_provider_config database table.
 */

export type DeliveryChannel = 'whatsapp' | 'sms' | 'telegram'
export type DeliveryProvider =
  | 'meta-cloud'
  | 'termii-sms'
  | 'bsp-go4whatsup'
  | 'bsp-generic'

export interface MessagingProviderConfig {
  id: string
  account_id: string
  channel: DeliveryChannel
  provider: DeliveryProvider
  credentials: Record<string, string>
  is_active: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}
