import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { TicketMessage, TicketMessageType } from '@/types/business-growth'

// ============================================================
// Get ticket messages with sender joins
// ============================================================
export async function getTicketMessages(
  accountId: string,
  ticketId: string
): Promise<TicketMessage[]> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('ticket_messages')
    .select(
      `*,
       sender:profiles!ticket_messages_sender_id_fkey(id, full_name, avatar_url)`
    )
    .eq('ticket_id', ticketId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as unknown as TicketMessage[]
}

// ============================================================
// Add ticket message (reply or internal note)
// ============================================================
export interface AddMessageData {
  sender_id?: string
  sender_type?: 'agent' | 'customer' | 'system' | 'ai'
  message_type?: TicketMessageType
  content: string
  attachments?: Array<{ name: string; url: string; type: string }>
  is_internal?: boolean
  send_via_whatsapp?: boolean
}

export async function addTicketMessage(
  accountId: string,
  ticketId: string,
  data: AddMessageData
): Promise<TicketMessage> {
  const db = supabaseAdmin()

  const messageType = data.message_type ?? (data.is_internal ? 'internal_note' : 'reply')
  const senderType = data.sender_type ?? 'agent'

  // Insert the message
  const { data: message, error } = await db
    .from('ticket_messages')
    .insert({
      account_id: accountId,
      ticket_id: ticketId,
      sender_id: data.sender_id ?? null,
      sender_type: senderType,
      message_type: messageType,
      content: data.content,
      attachments: data.attachments ?? [],
      is_internal: data.is_internal ?? false,
      sent_via_whatsapp: false,
    })
    .select()
    .single()

  if (error) throw error

  // If this is the first agent reply, update first_response_at on the ticket
  if (senderType === 'agent' && messageType === 'reply') {
    await db
      .from('support_tickets')
      .update({
        first_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('account_id', accountId)
      .is('first_response_at', null)
      .catch(() => {})
  }

  // Optionally send via WhatsApp
  if (data.send_via_whatsapp && !data.is_internal) {
    try {
      await sendMessageViaWhatsApp(accountId, ticketId, data.content, message.id)
    } catch {
      // WhatsApp send is best-effort
    }
  }

  return message as unknown as TicketMessage
}

// ============================================================
// Add system message (for status changes, assignments, etc.)
// ============================================================
export async function addSystemMessage(
  accountId: string,
  ticketId: string,
  content: string,
  messageType: TicketMessageType
): Promise<TicketMessage> {
  const db = supabaseAdmin()

  const { data: message, error } = await db
    .from('ticket_messages')
    .insert({
      account_id: accountId,
      ticket_id: ticketId,
      sender_id: null,
      sender_type: 'system',
      message_type: messageType,
      content,
      attachments: [],
      is_internal: true,
      sent_via_whatsapp: false,
    })
    .select()
    .single()

  if (error) throw error

  return message as unknown as TicketMessage
}

// ============================================================
// Send message via WhatsApp (internal helper)
// ============================================================
async function sendMessageViaWhatsApp(
  accountId: string,
  ticketId: string,
  text: string,
  messageId: string
): Promise<void> {
  const db = supabaseAdmin()

  // Get ticket with contact and conversation info
  const { data: ticket, error: ticketErr } = await db
    .from('support_tickets')
    .select('contact_id, conversation_id, assigned_to')
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .single()

  if (ticketErr || !ticket?.contact_id || !ticket?.conversation_id) return

  const { engineSendText } = await import('@/lib/automations/meta-send')

  const result = await engineSendText({
    accountId,
    userId: ticket.assigned_to ?? accountId,
    conversationId: ticket.conversation_id,
    contactId: ticket.contact_id,
    text,
  })

  // Update the ticket message with the WhatsApp message ID
  if (result?.whatsapp_message_id) {
    await db
      .from('ticket_messages')
      .update({
        sent_via_whatsapp: true,
        whatsapp_message_id: result.whatsapp_message_id,
      })
      .eq('id', messageId)
      .eq('account_id', accountId)
      .catch(() => {})
  }
}
