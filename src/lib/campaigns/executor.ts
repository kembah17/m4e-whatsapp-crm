import type { SupabaseClient } from '@supabase/supabase-js'
import type { CampaignExecution, ComposedMessage } from '@/types/campaigns'
import { engineSendText } from '@/lib/automations/meta-send'
import { engineSendEmail } from '@/lib/automations/brevo-send'
import { engineSendSms } from '@/lib/automations/brevo-sms-send'

/**
 * Process queued campaign executions.
 *
 * Picks up executions that are 'queued' and past their scheduled_for time,
 * composes messages from templates, and sends via the appropriate channel.
 *
 * @returns Number of executions processed.
 */
export async function processQueuedExecutions(
  db: SupabaseClient,
): Promise<number> {
  const now = new Date().toISOString()

  // Fetch queued executions that are ready to send
  const { data: executions, error: fetchError } = await db
    .from('campaign_executions')
    .select(`
      *,
      trigger:campaign_triggers(
        *,
        campaign_template:campaign_templates(*)
      )
    `)
    .eq('status', 'queued')
    .lte('scheduled_for', now)
    .limit(50)
    .order('scheduled_for', { ascending: true })

  if (fetchError) {
    console.error('[processQueuedExecutions] fetch error:', fetchError)
    return 0
  }

  if (!executions || executions.length === 0) return 0

  let processedCount = 0

  for (const execution of executions as CampaignExecution[]) {
    // Mark as sending
    await db
      .from('campaign_executions')
      .update({ status: 'sending' })
      .eq('id', execution.id)

    try {
      // Look up the contact
      if (!execution.contact_id) {
        throw new Error('No contact_id on execution')
      }

      const { data: contact, error: contactErr } = await db
        .from('contacts')
        .select('id, name, phone, email')
        .eq('id', execution.contact_id)
        .eq('account_id', execution.account_id)
        .maybeSingle()

      if (contactErr || !contact) {
        throw new Error(`Contact ${execution.contact_id} not found`)
      }

      // Compose the message
      const messageContent = execution.message_content as Record<string, unknown> | null
      const context = (messageContent?.context ?? {}) as Record<string, unknown>
      const template = (execution as unknown as Record<string, unknown>).trigger as Record<string, unknown> | undefined
      const campaignTemplate = template?.campaign_template as Record<string, unknown> | undefined

      const composed = composeMessageFromTemplate(
        campaignTemplate ?? null,
        contact,
        context,
      )

      // Send via the appropriate channel
      const channel = execution.channel || 'whatsapp'

      if (channel === 'whatsapp' && contact.phone) {
        // Find or create a conversation for this contact
        const { data: conversation } = await db
          .from('conversations')
          .select('id')
          .eq('account_id', execution.account_id)
          .eq('contact_id', contact.id)
          .limit(1)
          .maybeSingle()

        if (conversation) {
          // Get the account owner for the userId param
          const { data: account } = await db
            .from('accounts')
            .select('owner_id')
            .eq('id', execution.account_id)
            .single()

          await engineSendText({
            accountId: execution.account_id,
            userId: account?.owner_id ?? execution.account_id,
            conversationId: conversation.id,
            contactId: contact.id,
            text: composed.body,
          })
        } else {
          console.warn(
            `[processQueuedExecutions] No conversation for contact ${contact.id}, skipping WhatsApp send`,
          )
        }
      } else if (channel === 'email' && contact.email) {
        const { data: account } = await db
          .from('accounts')
          .select('owner_id')
          .eq('id', execution.account_id)
          .single()

        await engineSendEmail({
          accountId: execution.account_id,
          userId: account?.owner_id ?? execution.account_id,
          contactId: contact.id,
          subject: `Message from your store`,
          htmlContent: `<p>${composed.body.replace(/\n/g, '<br>')}</p>`,
        })
      } else if (channel === 'sms' && contact.phone) {
        const { data: account } = await db
          .from('accounts')
          .select('owner_id')
          .eq('id', execution.account_id)
          .single()

        await engineSendSms({
          accountId: execution.account_id,
          userId: account?.owner_id ?? execution.account_id,
          contactId: contact.id,
          content: composed.body,
          tag: 'campaign-trigger',
        })
      } else {
        throw new Error(
          `Cannot send via channel "${channel}" — contact missing ${channel === 'email' ? 'email' : 'phone'}`,
        )
      }

      // Mark as sent
      await db
        .from('campaign_executions')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', execution.id)

      processedCount++
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(
        `[processQueuedExecutions] error processing execution ${execution.id}:`,
        errorMessage,
      )

      await db
        .from('campaign_executions')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', execution.id)
    }
  }

  console.log(
    `[processQueuedExecutions] Processed ${processedCount}/${executions.length} executions`,
  )
  return processedCount
}

/**
 * Compose a message from a campaign template with variable substitution.
 */
export function composeMessageFromTemplate(
  template: Record<string, unknown> | null,
  contact: { name: string | null; phone: string | null; email: string | null },
  context: Record<string, unknown>,
): ComposedMessage {
  // Build the variables map
  const variables: Record<string, string> = {
    '{{name}}': contact.name ?? 'Customer',
    '{{first_name}}': (contact.name ?? 'Customer').split(' ')[0],
    '{{phone}}': contact.phone ?? '',
    '{{email}}': contact.email ?? '',
    '{{order_number}}': String(context.order_number ?? ''),
    '{{order_total}}': context.order_total != null
      ? `₦${Number(context.order_total).toLocaleString()}`
      : '',
    '{{order_status}}': String(context.order_status ?? ''),
    '{{cart_url}}': String(context.cart_url ?? ''),
    '{{cart_total}}': context.cart_total != null
      ? `₦${Number(context.cart_total).toLocaleString()}`
      : '',
    '{{product_names}}': Array.isArray(context.product_names)
      ? (context.product_names as string[]).join(', ')
      : '',
    '{{business_name}}': String(context.business_name ?? 'our store'),
    '{{discount}}': String(context.discount ?? ''),
  }

  // Get the message body from the template
  let body = ''
  if (template) {
    const messageTemplates = template.message_templates as
      | Array<{ body: string }>
      | undefined
    if (messageTemplates && messageTemplates.length > 0) {
      body = messageTemplates[0].body
    } else {
      body = String(template.name ?? 'Hello {{name}}, thank you for your order!')
    }
  } else {
    // Fallback generic message based on context
    body = `Hi {{name}}, thank you for your recent activity with us!`
  }

  // Perform variable substitution
  for (const [key, value] of Object.entries(variables)) {
    body = body.replaceAll(key, value)
  }

  return {
    channel: template?.default_channel
      ? String(template.default_channel)
      : 'whatsapp',
    body,
    variables,
  }
}
