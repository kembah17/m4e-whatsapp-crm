/**
 * Channel Routing Intelligence (W6)
 *
 * Smart channel selection when campaign channel is 'auto'.
 * WhatsApp-first strategy for Nigerian market (93% usage),
 * with cost-aware fallback to email/SMS.
 */

import { META_RATES_NGN } from '@/lib/whatsapp/cost-calculator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChannelOption = 'whatsapp' | 'email' | 'sms'

export type MessageType =
  | 'transactional' // order confirmations, receipts, shipping
  | 'marketing'     // promotions, campaigns, broadcasts
  | 'urgent'        // time-sensitive alerts, OTPs
  | 'nurture'       // drip sequences, onboarding
  | 'reactivation'  // win-back, dormant re-engagement

export interface ContactChannelInfo {
  phone: string | null
  email: string | null
  /** Optional preferred channel from contact record */
  preferredChannel?: ChannelOption | null
}

export interface AccountUsageStats {
  /** Service conversations used this month */
  serviceConversationsUsed: number
  /** Whether the account has a valid Brevo email config */
  hasEmailConfig: boolean
  /** Whether the account has a valid Brevo SMS config */
  hasSmsConfig: boolean
}

export interface ChannelDecision {
  channel: ChannelOption
  reason: string
  costNgn: number
  fallbackChannel: ChannelOption | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Free service conversations per month (from Meta pricing) */
const FREE_SERVICE_CONVERSATIONS = META_RATES_NGN.free_tier.conversations_per_month

/** Cost per channel in NGN for comparison */
const CHANNEL_COSTS_NGN: Record<ChannelOption, { marketing: number; transactional: number }> = {
  whatsapp: {
    marketing: META_RATES_NGN.marketing.per_message,   // ₦57.17
    transactional: META_RATES_NGN.utility.per_message,  // ₦14.03
  },
  email: {
    marketing: 0.50,      // Brevo free tier / very low cost
    transactional: 0.50,  // Brevo transactional
  },
  sms: {
    marketing: 4.00,      // Nigerian SMS rate ~₦4/msg
    transactional: 4.00,
  },
}

/**
 * Channel effectiveness scores for Nigerian market.
 * Based on open/read rates and response rates.
 * Scale: 0-100
 */
const CHANNEL_EFFECTIVENESS: Record<ChannelOption, number> = {
  whatsapp: 95,  // 93% penetration, 98% open rate in Nigeria
  sms: 70,       // High open rate but low engagement
  email: 45,     // Lower open rates in Nigerian market
}

/**
 * Message type to channel priority mapping.
 * WhatsApp-first strategy: WhatsApp is always preferred
 * unless cost or availability forces a fallback.
 */
const MESSAGE_TYPE_PRIORITY: Record<MessageType, ChannelOption[]> = {
  transactional: ['whatsapp', 'sms', 'email'],
  marketing: ['whatsapp', 'email', 'sms'],
  urgent: ['whatsapp', 'sms', 'email'],
  nurture: ['whatsapp', 'email', 'sms'],
  reactivation: ['whatsapp', 'email', 'sms'],
}

// ---------------------------------------------------------------------------
// Core routing logic
// ---------------------------------------------------------------------------

/**
 * Resolve the best channel for a message.
 *
 * Strategy: WhatsApp-first for Nigerian market.
 * - WhatsApp is always the preferred channel (93% usage, 98% open rate)
 * - Falls back to email/SMS only when WhatsApp is unavailable
 * - Cost display is informational, not restrictive
 * - Respects contact's preferred channel if explicitly set
 *
 * @param contact   - Contact's available channels
 * @param msgType   - Type of message being sent
 * @param usage     - Account's current month usage stats
 * @returns Channel decision with reasoning
 */
export function resolveChannel(
  contact: ContactChannelInfo,
  msgType: MessageType,
  usage: AccountUsageStats,
): ChannelDecision {
  // 1. If contact has an explicit preferred channel and it's available, use it
  if (contact.preferredChannel) {
    const preferred = contact.preferredChannel
    if (isChannelAvailable(preferred, contact, usage)) {
      return {
        channel: preferred,
        reason: `Contact preferred channel: ${preferred}`,
        costNgn: getChannelCost(preferred, msgType),
        fallbackChannel: findFallback(preferred, contact, usage, msgType),
      }
    }
  }

  // 2. Follow message type priority (WhatsApp-first)
  const priorities = MESSAGE_TYPE_PRIORITY[msgType]

  for (const candidate of priorities) {
    if (isChannelAvailable(candidate, contact, usage)) {
      const cost = getChannelCost(candidate, msgType)
      const fallback = findFallback(candidate, contact, usage, msgType)

      // Build reason string
      let reason: string
      if (candidate === 'whatsapp') {
        const freeRemaining = Math.max(0, FREE_SERVICE_CONVERSATIONS - usage.serviceConversationsUsed)
        if (freeRemaining > 0 && isServiceConversation(msgType)) {
          reason = `WhatsApp (${freeRemaining} free service conversations remaining)`
        } else {
          reason = `WhatsApp-first: highest effectiveness (${CHANNEL_EFFECTIVENESS.whatsapp}%) for Nigerian market`
        }
      } else if (candidate === 'email') {
        reason = 'Email fallback: WhatsApp unavailable (no phone number)'
      } else {
        reason = 'SMS fallback: WhatsApp and email unavailable'
      }

      return { channel: candidate, reason, costNgn: cost, fallbackChannel: fallback }
    }
  }

  // 3. Last resort: return whatsapp even if unavailable (executor will handle the error)
  return {
    channel: 'whatsapp',
    reason: 'No available channel — defaulting to WhatsApp (may fail)',
    costNgn: getChannelCost('whatsapp', msgType),
    fallbackChannel: null,
  }
}

/**
 * Get a cost comparison across all available channels for a contact.
 * Useful for UI display and reporting.
 */
export function getChannelCostComparison(
  contact: ContactChannelInfo,
  msgType: MessageType,
  usage: AccountUsageStats,
): Array<{ channel: ChannelOption; available: boolean; costNgn: number; effectiveness: number }> {
  const channels: ChannelOption[] = ['whatsapp', 'email', 'sms']

  return channels.map((ch) => ({
    channel: ch,
    available: isChannelAvailable(ch, contact, usage),
    costNgn: getChannelCost(ch, msgType),
    effectiveness: CHANNEL_EFFECTIVENESS[ch],
  }))
}

/**
 * Estimate the total cost of sending to a list of contacts via auto-routing.
 */
export function estimateAutoRouteCost(
  contacts: ContactChannelInfo[],
  msgType: MessageType,
  usage: AccountUsageStats,
): { totalCostNgn: number; channelBreakdown: Record<ChannelOption, number> } {
  const breakdown: Record<ChannelOption, number> = { whatsapp: 0, email: 0, sms: 0 }
  let totalCost = 0

  // Clone usage to simulate progressive free tier consumption
  const simUsage = { ...usage }

  for (const contact of contacts) {
    const decision = resolveChannel(contact, msgType, simUsage)
    breakdown[decision.channel]++
    totalCost += decision.costNgn

    // Track service conversation usage for free tier simulation
    if (decision.channel === 'whatsapp' && isServiceConversation(msgType)) {
      simUsage.serviceConversationsUsed++
    }
  }

  return { totalCostNgn: totalCost, channelBreakdown: breakdown }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isChannelAvailable(
  channel: ChannelOption,
  contact: ContactChannelInfo,
  usage: AccountUsageStats,
): boolean {
  switch (channel) {
    case 'whatsapp':
      return !!contact.phone
    case 'email':
      return !!contact.email && usage.hasEmailConfig
    case 'sms':
      return !!contact.phone && usage.hasSmsConfig
    default:
      return false
  }
}

function getChannelCost(channel: ChannelOption, msgType: MessageType): number {
  const costType = msgType === 'transactional' || msgType === 'urgent'
    ? 'transactional'
    : 'marketing'
  return CHANNEL_COSTS_NGN[channel][costType]
}

function isServiceConversation(msgType: MessageType): boolean {
  // Service conversations are customer-initiated or utility/transactional
  return msgType === 'transactional' || msgType === 'urgent'
}

function findFallback(
  primary: ChannelOption,
  contact: ContactChannelInfo,
  usage: AccountUsageStats,
  msgType: MessageType,
): ChannelOption | null {
  const priorities = MESSAGE_TYPE_PRIORITY[msgType]
  for (const candidate of priorities) {
    if (candidate !== primary && isChannelAvailable(candidate, contact, usage)) {
      return candidate
    }
  }
  return null
}
