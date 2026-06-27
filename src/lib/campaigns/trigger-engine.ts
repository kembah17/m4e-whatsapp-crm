import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  TriggerEvent,
  TriggerContext,
  TriggerConditions,
  CampaignTrigger,
} from '@/types/campaigns'

/**
 * Fire a campaign trigger event.
 *
 * Finds all active triggers matching the event type for the given account,
 * evaluates their conditions against the provided context, and creates
 * campaign_executions entries with the appropriate delay.
 */
export async function fireTrigger(
  db: SupabaseClient,
  accountId: string,
  event: TriggerEvent,
  context: TriggerContext,
): Promise<void> {
  // Find all active triggers for this event type and account
  const { data: triggers, error: fetchError } = await db
    .from('campaign_triggers')
    .select('*, campaign_template:campaign_templates(*)')
    .eq('account_id', accountId)
    .eq('trigger_event', event.event)
    .eq('is_active', true)

  if (fetchError) {
    console.error('[fireTrigger] fetch error:', fetchError)
    return
  }

  if (!triggers || triggers.length === 0) return

  for (const trigger of triggers as CampaignTrigger[]) {
    // Evaluate conditions
    if (!evaluateTriggerConditions(trigger.conditions, context)) {
      continue
    }

    // Calculate scheduled time with delay
    const scheduledFor = new Date(
      Date.now() + (trigger.delay_minutes ?? 0) * 60 * 1000,
    ).toISOString()

    // Determine the contact to send to
    const contactId = event.contact_id ?? context.contact_id
    if (!contactId) {
      console.warn(
        `[fireTrigger] No contact_id for trigger ${trigger.id}, skipping`,
      )
      continue
    }

    // Build message content from template if available
    const messageContent: Record<string, unknown> = {
      trigger_event: event.event,
      context,
    }

    if (trigger.campaign_template) {
      messageContent.template_id = trigger.campaign_template_id
      messageContent.template_name = trigger.campaign_template.name
      messageContent.template_channel = trigger.campaign_template.default_channel
    }

    // Create the execution record
    const { error: insertError } = await db
      .from('campaign_executions')
      .insert({
        account_id: accountId,
        trigger_id: trigger.id,
        contact_id: contactId,
        status: 'queued',
        scheduled_for: scheduledFor,
        channel: trigger.campaign_template?.default_channel ?? 'whatsapp',
        message_content: messageContent,
        metadata: {
          order_id: event.order_id,
          cart_id: event.cart_id,
          event_metadata: event.metadata,
        },
      })

    if (insertError) {
      console.error(
        `[fireTrigger] insert execution error for trigger ${trigger.id}:`,
        insertError,
      )
      continue
    }

    // Increment the trigger execution count
    try {
      await db.rpc('increment_campaign_trigger_count', {
        p_trigger_id: trigger.id,
      })
    } catch (rpcErr) {
      console.error(
        `[fireTrigger] increment count error for trigger ${trigger.id}:`,
        rpcErr,
      )
    }
  }
}

/**
 * Evaluate trigger conditions against the provided context.
 *
 * Returns true if all conditions are met (or if there are no conditions).
 */
export function evaluateTriggerConditions(
  conditions: TriggerConditions,
  context: TriggerContext,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true

  // Check minimum order value
  if (
    conditions.min_order_value != null &&
    context.order_total != null &&
    context.order_total < conditions.min_order_value
  ) {
    return false
  }

  // Check minimum cart value
  if (
    conditions.min_cart_value != null &&
    context.cart_total != null &&
    context.cart_total < conditions.min_cart_value
  ) {
    return false
  }

  // Check product category
  if (conditions.product_category && context.product_names) {
    const categoryLower = conditions.product_category.toLowerCase()
    const hasMatch = context.product_names.some((name) =>
      name.toLowerCase().includes(categoryLower),
    )
    if (!hasMatch) return false
  }

  // Check customer segment
  if (
    conditions.customer_segment &&
    context.customer_segment &&
    conditions.customer_segment !== context.customer_segment
  ) {
    return false
  }

  // Check days since purchase
  if (
    conditions.days_since_purchase != null &&
    context.days_since_last_purchase != null &&
    context.days_since_last_purchase < conditions.days_since_purchase
  ) {
    return false
  }

  // Check purchase count threshold
  if (
    conditions.purchase_count_threshold != null &&
    context.total_purchases != null &&
    context.total_purchases < conditions.purchase_count_threshold
  ) {
    return false
  }

  return true
}
