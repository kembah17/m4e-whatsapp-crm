/**
 * AI-powered receipt/payment proof scanner.
 * Extracts payment details from images using vision models.
 */

import { createClient } from '@supabase/supabase-js'
import { trackAIUsage } from './usage-tracker'
import type { ScannedReceipt } from '@/types/business-growth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const VISION_MODEL = 'google/gemini-2.0-flash-001'

interface ExtractedReceipt {
  amount: number | null
  bank: string | null
  account_number: string | null
  account_name: string | null
  reference: string | null
  date: string | null
  sender: string | null
  raw_text: string
  confidence: number
}

/**
 * Scan a receipt/payment proof image and extract details.
 */
export async function scanReceipt(
  mediaUrl: string,
  accountId: string,
  contactId?: string | null,
  source: string = 'whatsapp',
  messageId?: string | null
): Promise<ScannedReceipt> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const db = supabaseAdmin()

  // Download image
  const imgResponse = await fetch(mediaUrl)
  if (!imgResponse.ok) throw new Error('Failed to download image')
  const imgBuffer = await imgResponse.arrayBuffer()
  const base64Img = Buffer.from(imgBuffer).toString('base64')
  const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg'

  // Send to AI vision model
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a payment receipt scanner for Nigerian businesses.
Extract payment details from the image. Understand Nigerian bank transfer receipts, POS receipts, mobile banking screenshots, and handwritten receipts.
Return JSON with:
- amount: number or null (the payment amount in Naira)
- bank: string or null (bank name)
- account_number: string or null
- account_name: string or null (recipient name)
- reference: string or null (transaction reference/ID)
- date: string or null (ISO date format YYYY-MM-DD if possible)
- sender: string or null (who sent the payment)
- raw_text: string (all text visible in the image)
- confidence: number (0-1 how confident you are in the extraction)
Return ONLY valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract payment details from this receipt:' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Img}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`OpenRouter error: ${res.status} ${errBody}`)
  }

  const aiData = await res.json()
  const content = aiData.choices?.[0]?.message?.content || ''

  let parsed: ExtractedReceipt
  try {
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {
      amount: null, bank: null, account_number: null, account_name: null,
      reference: null, date: null, sender: null, raw_text: content, confidence: 0.2,
    }
  }

  // Store in database
  const { data: record, error: insertErr } = await db
    .from('scanned_receipts')
    .insert({
      account_id: accountId,
      contact_id: contactId || null,
      source,
      media_url: mediaUrl,
      message_id: messageId || null,
      extracted_amount: parsed.amount,
      extracted_bank: parsed.bank,
      extracted_account_number: parsed.account_number,
      extracted_account_name: parsed.account_name,
      extracted_reference: parsed.reference,
      extracted_date: parsed.date,
      extracted_sender: parsed.sender,
      raw_text: parsed.raw_text,
      confidence: parsed.confidence,
      status: 'pending_review',
      model_used: VISION_MODEL,
      cost_usd: aiData.usage?.total_cost || null,
    })
    .select()
    .single()

  if (insertErr) throw new Error(`Failed to store receipt: ${insertErr.message}`)

  // Track usage
  try {
    await trackAIUsage({
      accountId,
      feature: 'receipt_scanner',
      model: VISION_MODEL,
      inputTokens: aiData.usage?.prompt_tokens || 0,
      outputTokens: aiData.usage?.completion_tokens || 0,
      cost: aiData.usage?.total_cost || 0,
    })
  } catch { /* non-critical */ }

  return record as ScannedReceipt
}

/**
 * Try to match a scanned receipt to outstanding debts/invoices/installments.
 */
export async function matchReceiptToDebt(
  receiptId: string
): Promise<{ matched: boolean; match_type?: string; match_id?: string; confidence?: number }> {
  const db = supabaseAdmin()

  const { data: receipt } = await db
    .from('scanned_receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (!receipt || !receipt.extracted_amount) {
    return { matched: false }
  }

  const amount = receipt.extracted_amount
  const accountId = receipt.account_id
  const contactId = receipt.contact_id

  // Try matching by exact amount + contact
  // 1. Check debt entries
  if (contactId) {
    const { data: debts } = await db
      .from('debt_entries')
      .select('id, total_amount, amount_paid')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .in('status', ['pending', 'overdue', 'partial'])
      .order('created_at', { ascending: false })

    for (const debt of debts || []) {
      const balance = debt.total_amount - debt.amount_paid
      if (Math.abs(balance - amount) < 1) {
        await db.from('scanned_receipts').update({
          matched_debt_id: debt.id,
          match_confidence: 0.9,
        }).eq('id', receiptId)
        return { matched: true, match_type: 'debt', match_id: debt.id, confidence: 0.9 }
      }
    }

    // 2. Check invoices
    const { data: invoices } = await db
      .from('invoices')
      .select('id, total, amount_paid')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .in('status', ['sent', 'viewed', 'partial', 'overdue'])
      .order('created_at', { ascending: false })

    for (const inv of invoices || []) {
      const balance = inv.total - inv.amount_paid
      if (Math.abs(balance - amount) < 1) {
        await db.from('scanned_receipts').update({
          matched_invoice_id: inv.id,
          match_confidence: 0.9,
        }).eq('id', receiptId)
        return { matched: true, match_type: 'invoice', match_id: inv.id, confidence: 0.9 }
      }
    }

    // 3. Check installment schedule entries
    const { data: installments } = await db
      .from('installment_schedule')
      .select('id, amount_due, amount_paid, plan:installment_plans!inner(account_id, contact_id)')
      .eq('plan.account_id', accountId)
      .eq('plan.contact_id', contactId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })

    for (const inst of installments || []) {
      const balance = inst.amount_due - inst.amount_paid
      if (Math.abs(balance - amount) < 1) {
        await db.from('scanned_receipts').update({
          matched_installment_id: inst.id,
          match_confidence: 0.85,
        }).eq('id', receiptId)
        return { matched: true, match_type: 'installment', match_id: inst.id, confidence: 0.85 }
      }
    }
  }

  return { matched: false }
}

/**
 * Get unmatched/pending receipts for review.
 */
export async function getUnmatchedReceipts(
  accountId: string,
  limit = 50
): Promise<ScannedReceipt[]> {
  const { data } = await supabaseAdmin()
    .from('scanned_receipts')
    .select('*, contact:contacts(id, name, phone)')
    .eq('account_id', accountId)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []) as ScannedReceipt[]
}

/**
 * Confirm a receipt and optionally apply payment to a debt/invoice.
 */
export async function confirmReceipt(
  receiptId: string,
  userId: string,
  action: 'confirm' | 'reject',
  matchedDebtId?: string,
  matchedInvoiceId?: string,
  matchedInstallmentId?: string
): Promise<ScannedReceipt> {
  const db = supabaseAdmin()

  const updateData: Record<string, unknown> = {
    status: action === 'confirm' ? 'confirmed' : 'rejected',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  }

  if (matchedDebtId) updateData.matched_debt_id = matchedDebtId
  if (matchedInvoiceId) updateData.matched_invoice_id = matchedInvoiceId
  if (matchedInstallmentId) updateData.matched_installment_id = matchedInstallmentId

  const { data, error } = await db
    .from('scanned_receipts')
    .update(updateData)
    .eq('id', receiptId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update receipt: ${error.message}`)
  return data as ScannedReceipt
}
