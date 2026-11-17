/**
 * Burst Handler
 *
 * Batches rapid inbound messages from the same contact before
 * triggering automations. Individual messages are still saved to
 * the DB immediately — only the automation/AI response is batched.
 *
 * Uses an in-memory Map with per-contact timers. When a burst
 * window elapses without new messages, the collected batch is
 * flushed to the callback.
 */

export interface BurstMessage {
  id: string
  text: string
  type: string
  timestamp: number
}

export interface PendingBurst {
  messages: BurstMessage[]
  timer: ReturnType<typeof setTimeout>
  accountId: string
  contactId: string
  conversationId: string
}

export type BurstCompleteCallback = (
  messages: BurstMessage[],
  accountId: string,
  contactId: string,
  conversationId: string
) => void

const pendingBursts = new Map<string, PendingBurst>()

/** Default burst window: 5 seconds */
export const DEFAULT_BURST_WINDOW_MS = 5000

/**
 * Add a message to a burst batch for the given key.
 *
 * If no pending burst exists for the key, a new one is created with
 * a timer. If a burst already exists, the message is appended and
 * the timer is reset. When the timer fires (no new messages within
 * the window), `onBurstComplete` is called with all collected messages.
 *
 * @param key - Unique burst key, typically `${accountId}:${contactId}`
 * @param message - The inbound message to batch
 * @param accountId - Account ID for the callback
 * @param contactId - Contact ID for the callback
 * @param conversationId - Conversation ID for the callback
 * @param onBurstComplete - Callback fired when the burst window elapses
 * @param windowMs - Burst window in milliseconds (default: 5000)
 */
export function addToBurst(
  key: string,
  message: Omit<BurstMessage, 'timestamp'>,
  accountId: string,
  contactId: string,
  conversationId: string,
  onBurstComplete: BurstCompleteCallback,
  windowMs: number = DEFAULT_BURST_WINDOW_MS
): void {
  const existing = pendingBursts.get(key)

  const burstMessage: BurstMessage = {
    ...message,
    timestamp: Date.now(),
  }

  if (existing) {
    // Add message to existing burst and reset timer
    existing.messages.push(burstMessage)
    clearTimeout(existing.timer)
    existing.timer = setTimeout(() => flushBurst(key, onBurstComplete), windowMs)
  } else {
    // Create new burst
    const timer = setTimeout(() => flushBurst(key, onBurstComplete), windowMs)
    pendingBursts.set(key, {
      messages: [burstMessage],
      timer,
      accountId,
      contactId,
      conversationId,
    })
  }
}

/**
 * Flush a burst: call the completion callback and clean up.
 */
function flushBurst(key: string, onBurstComplete: BurstCompleteCallback): void {
  const burst = pendingBursts.get(key)
  if (!burst) return

  pendingBursts.delete(key)

  try {
    onBurstComplete(burst.messages, burst.accountId, burst.contactId, burst.conversationId)
  } catch (err) {
    console.error(`[burst-handler] Error in burst callback for ${key}:`, err)
  }
}

/**
 * Cancel a pending burst without firing the callback.
 */
export function cancelBurst(key: string): void {
  const burst = pendingBursts.get(key)
  if (burst) {
    clearTimeout(burst.timer)
    pendingBursts.delete(key)
  }
}

/**
 * Check if there is a pending burst for the given key.
 */
export function hasPendingBurst(key: string): boolean {
  return pendingBursts.has(key)
}

/**
 * Get the number of pending bursts (useful for monitoring).
 */
export function getPendingBurstCount(): number {
  return pendingBursts.size
}
