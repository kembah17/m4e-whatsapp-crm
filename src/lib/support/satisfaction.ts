import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { TicketSatisfaction } from '@/types/business-growth'

// ============================================================
// Send satisfaction survey via WhatsApp
// ============================================================
export async function sendSatisfactionSurvey(
  accountId: string,
  ticketId: string
): Promise<void> {
  const db = supabaseAdmin()

  // Get ticket with contact and conversation info
  const { data: ticket, error: ticketErr } = await db
    .from('support_tickets')
    .select('contact_id, conversation_id, ticket_number, subject, assigned_to')
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .single()

  if (ticketErr || !ticket?.contact_id || !ticket?.conversation_id) return

  // Check if survey already sent
  const { count } = await db
    .from('ticket_satisfaction')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)
    .eq('account_id', accountId)

  if ((count ?? 0) > 0) return // Already sent

  // Create satisfaction record
  const now = new Date().toISOString()
  await db
    .from('ticket_satisfaction')
    .insert({
      account_id: accountId,
      ticket_id: ticketId,
      contact_id: ticket.contact_id,
      survey_sent_at: now,
    })

  // Send WhatsApp message
  try {
    const { engineSendText } = await import('@/lib/automations/meta-send')

    const surveyText = [
      `⭐ *How was your support experience?*`,
      ``,
      `Your ticket *${ticket.ticket_number}* (${ticket.subject}) has been resolved.`,
      ``,
      `Please rate your experience from 1-5:`,
      `1 - Very Poor`,
      `2 - Poor`,
      `3 - Average`,
      `4 - Good`,
      `5 - Excellent`,
      ``,
      `Simply reply with a number (1-5) and any feedback you'd like to share.`,
    ].join('\n')

    await engineSendText({
      accountId,
      userId: ticket.assigned_to ?? accountId,
      conversationId: ticket.conversation_id,
      contactId: ticket.contact_id,
      text: surveyText,
    })
  } catch {
    // WhatsApp send is best-effort
  }
}

// ============================================================
// Record satisfaction response
// ============================================================
export async function recordSatisfactionResponse(
  accountId: string,
  ticketId: string,
  rating: number,
  feedback?: string
): Promise<TicketSatisfaction> {
  const db = supabaseAdmin()

  const now = new Date().toISOString()

  // Try to update existing record
  const { data: existing } = await db
    .from('ticket_satisfaction')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('account_id', accountId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data, error } = await db
      .from('ticket_satisfaction')
      .update({
        rating: Math.min(5, Math.max(1, rating)),
        feedback: feedback ?? null,
        responded_at: now,
      })
      .eq('id', existing.id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) throw error
    return data as TicketSatisfaction
  }

  // Create new record if none exists
  const { data: ticketData } = await db
    .from('support_tickets')
    .select('contact_id')
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .single()

  const { data, error } = await db
    .from('ticket_satisfaction')
    .insert({
      account_id: accountId,
      ticket_id: ticketId,
      contact_id: ticketData?.contact_id ?? null,
      rating: Math.min(5, Math.max(1, rating)),
      feedback: feedback ?? null,
      responded_at: now,
    })
    .select()
    .single()

  if (error) throw error
  return data as TicketSatisfaction
}

// ============================================================
// Get satisfaction stats
// ============================================================
export interface SatisfactionStats {
  average_rating: number | null
  total_surveys: number
  total_responses: number
  response_rate: number
  distribution: Record<number, number>
}

export async function getSatisfactionStats(
  accountId: string
): Promise<SatisfactionStats> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('ticket_satisfaction')
    .select('rating, responded_at')
    .eq('account_id', accountId)

  if (error) throw error

  const records = data ?? []
  const totalSurveys = records.length
  const responses = records.filter((r) => r.rating !== null)
  const totalResponses = responses.length

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0

  for (const r of responses) {
    if (r.rating !== null) {
      sum += r.rating
      distribution[r.rating] = (distribution[r.rating] ?? 0) + 1
    }
  }

  return {
    average_rating: totalResponses > 0 ? Math.round((sum / totalResponses) * 10) / 10 : null,
    total_surveys: totalSurveys,
    total_responses: totalResponses,
    response_rate: totalSurveys > 0 ? Math.round((totalResponses / totalSurveys) * 100) : 0,
    distribution,
  }
}
