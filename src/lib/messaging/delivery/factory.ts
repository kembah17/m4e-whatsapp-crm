import type { DeliveryAdapter, DeliveryChannel, DeliveryProvider } from './types'
import { MetaCloudDeliveryAdapter } from './meta-cloud-adapter'
import { TermiiSmsDeliveryAdapter } from './termii-sms-adapter'
import { BspDeliveryAdapter } from './bsp-adapter'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { decrypt } from '@/lib/whatsapp/encryption'

interface ProviderConfig {
  provider: DeliveryProvider
  channel: DeliveryChannel
  credentials: Record<string, string>
  isActive: boolean
}

// Cache adapters per account to avoid repeated DB lookups
const adapterCache = new Map<
  string,
  { adapter: DeliveryAdapter; expiresAt: number }
>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get the delivery adapter for a specific account and channel.
 *
 * Resolution order:
 * 1. Check messaging_provider_config table for account-specific config
 * 2. Fall back to whatsapp_config table (existing Meta Cloud API config)
 * 3. Fall back to environment variables
 *
 * For SMS: Always uses Termii if configured.
 * For WhatsApp: Uses Meta Cloud API (default) or BSP if configured.
 */
export async function getDeliveryAdapter(
  accountId: string,
  channel: DeliveryChannel = 'whatsapp',
): Promise<DeliveryAdapter> {
  const cacheKey = `${accountId}:${channel}`
  const cached = adapterCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.adapter
  }

  let adapter: DeliveryAdapter

  if (channel === 'sms') {
    adapter = await buildSmsAdapter(accountId)
  } else {
    adapter = await buildWhatsAppAdapter(accountId)
  }

  adapterCache.set(cacheKey, {
    adapter,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return adapter
}

async function buildWhatsAppAdapter(
  accountId: string,
): Promise<DeliveryAdapter> {
  const db = supabaseAdmin()

  // 1. Check messaging_provider_config for BSP config
  const { data: providerConfig } = await db
    .from('messaging_provider_config')
    .select('*')
    .eq('account_id', accountId)
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()

  if (providerConfig?.provider === 'bsp-go4whatsup') {
    const creds = providerConfig.credentials as Record<string, string>
    return new BspDeliveryAdapter(
      creds.api_key ? decrypt(creds.api_key) : '',
      creds.base_url || '',
    )
  }

  // 2. Fall back to existing whatsapp_config (Meta Cloud API)
  const { data: waConfig } = await db
    .from('whatsapp_config')
    .select('phone_number_id, access_token')
    .eq('account_id', accountId)
    .maybeSingle()

  if (waConfig?.phone_number_id && waConfig?.access_token) {
    return new MetaCloudDeliveryAdapter(
      waConfig.phone_number_id,
      decrypt(waConfig.access_token),
    )
  }

  // 3. Fall back to env vars (single-tenant mode)
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ''
  return new MetaCloudDeliveryAdapter(phoneNumberId, accessToken)
}

async function buildSmsAdapter(
  accountId: string,
): Promise<DeliveryAdapter> {
  const db = supabaseAdmin()

  // Check messaging_provider_config for Termii config
  const { data: providerConfig } = await db
    .from('messaging_provider_config')
    .select('*')
    .eq('account_id', accountId)
    .eq('channel', 'sms')
    .eq('is_active', true)
    .maybeSingle()

  if (providerConfig) {
    const creds = providerConfig.credentials as Record<string, string>
    return new TermiiSmsDeliveryAdapter(
      creds.api_key ? decrypt(creds.api_key) : '',
      creds.sender_id || 'M4E',
    )
  }

  // Fall back to env vars
  return new TermiiSmsDeliveryAdapter(
    process.env.TERMII_API_KEY || '',
    process.env.TERMII_SENDER_ID || 'M4E',
  )
}

/** Clear cached adapter for an account (call when config changes) */
export function clearDeliveryAdapterCache(accountId?: string): void {
  if (accountId) {
    adapterCache.delete(`${accountId}:whatsapp`)
    adapterCache.delete(`${accountId}:sms`)
  } else {
    adapterCache.clear()
  }
}
