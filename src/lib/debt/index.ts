import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  DebtEntry,
  DebtPayment,
  DebtStatus,
  PaymentMethod,
} from '@/types/business-growth'

/* ------------------------------------------------------------------ */
/*  Debt Entry CRUD                                                    */
/* ------------------------------------------------------------------ */

export async function getDebtEntries(
  accountId: string,
  filters?: {
    status?: DebtStatus
    contact_id?: string
    overdue?: boolean
    search?: string
    limit?: number
    offset?: number
  },
) {
  const db = supabaseAdmin()
  let query = db
    .from('debt_entries')
    .select('*, contact:contacts!contact_id(name, phone)', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id)
  if (filters?.overdue) query = query.eq('status', 'overdue')
  if (filters?.search) {
    query = query.or(
      `description.ilike.%${filters.search}%`,
    )
  }

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { entries: (data ?? []) as DebtEntry[], total: count ?? 0 }
}

export async function getDebtEntry(accountId: string, entryId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('debt_entries')
    .select('*, contact:contacts!contact_id(name, phone)')
    .eq('account_id', accountId)
    .eq('id', entryId)
    .single()
  if (error) throw new Error(error.message)
  return data as DebtEntry
}

export async function createDebtEntry(
  accountId: string,
  entry: {
    contact_id: string
    entry_type: string
    description: string
    original_amount: number
    due_date?: string | null
    currency?: string
    reminder_enabled?: boolean
    reminder_frequency_days?: number
    max_reminders?: number
    invoice_id?: string | null
    deal_id?: string | null
    product_id?: string | null
    notes?: string | null
    tags?: string[]
    created_by?: string | null
  },
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('debt_entries')
    .insert({
      account_id: accountId,
      contact_id: entry.contact_id,
      entry_type: entry.entry_type || 'credit_sale',
      description: entry.description,
      original_amount: entry.original_amount,
      amount_paid: 0,
      due_date: entry.due_date ?? null,
      currency: entry.currency || 'NGN',
      status: 'outstanding' as DebtStatus,
      reminder_enabled: entry.reminder_enabled ?? true,
      reminder_frequency_days: entry.reminder_frequency_days ?? 7,
      reminder_count: 0,
      max_reminders: entry.max_reminders ?? 5,
      invoice_id: entry.invoice_id ?? null,
      deal_id: entry.deal_id ?? null,
      product_id: entry.product_id ?? null,
      notes: entry.notes ?? null,
      tags: entry.tags ?? [],
      created_by: entry.created_by ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Update contact outstanding_balance
  await updateContactOutstandingBalance(accountId, entry.contact_id)

  return data as DebtEntry
}

export async function updateDebtEntry(
  accountId: string,
  entryId: string,
  updates: Partial<Pick<DebtEntry,
    | 'description' | 'due_date' | 'status' | 'reminder_enabled'
    | 'reminder_frequency_days' | 'max_reminders' | 'notes' | 'tags'
  >>,
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('debt_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('id', entryId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DebtEntry
}

export async function deleteDebtEntry(accountId: string, entryId: string) {
  const db = supabaseAdmin()
  // Get entry first to update contact balance after
  const entry = await getDebtEntry(accountId, entryId)
  const { error } = await db
    .from('debt_entries')
    .delete()
    .eq('account_id', accountId)
    .eq('id', entryId)
  if (error) throw new Error(error.message)
  await updateContactOutstandingBalance(accountId, entry.contact_id)
}

/* ------------------------------------------------------------------ */
/*  Payments                                                           */
/* ------------------------------------------------------------------ */

export async function recordPayment(
  accountId: string,
  debtEntryId: string,
  payment: {
    amount: number
    payment_method: PaymentMethod
    payment_reference?: string | null
    payment_date?: string
    proof_url?: string | null
    notes?: string | null
    created_by?: string | null
  },
) {
  const db = supabaseAdmin()

  // Get current debt entry
  const entry = await getDebtEntry(accountId, debtEntryId)
  const newAmountPaid = entry.amount_paid + payment.amount
  const newOutstanding = entry.original_amount - newAmountPaid
  const newStatus: DebtStatus =
    newOutstanding <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : entry.status

  // Insert payment record
  const { data: paymentData, error: paymentError } = await db
    .from('debt_payments')
    .insert({
      account_id: accountId,
      debt_entry_id: debtEntryId,
      contact_id: entry.contact_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_reference: payment.payment_reference ?? null,
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      proof_url: payment.proof_url ?? null,
      verified: false,
      notes: payment.notes ?? null,
      created_by: payment.created_by ?? null,
    })
    .select()
    .single()
  if (paymentError) throw new Error(paymentError.message)

  // Update debt entry
  const { error: updateError } = await db
    .from('debt_entries')
    .update({
      amount_paid: newAmountPaid,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debtEntryId)
  if (updateError) throw new Error(updateError.message)

  // Update contact outstanding balance
  await updateContactOutstandingBalance(accountId, entry.contact_id)

  return paymentData as DebtPayment
}

export async function getPaymentHistory(
  accountId: string,
  debtEntryId: string,
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('debt_payments')
    .select('*')
    .eq('account_id', accountId)
    .eq('debt_entry_id', debtEntryId)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DebtPayment[]
}

/* ------------------------------------------------------------------ */
/*  Summary & Utilities                                                */
/* ------------------------------------------------------------------ */

export async function getDebtSummary(accountId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('debt_entries')
    .select('original_amount, amount_paid, status')
    .eq('account_id', accountId)
  if (error) throw new Error(error.message)

  const entries = data ?? []
  const totalOutstanding = entries.reduce(
    (sum, e) => sum + (e.original_amount - e.amount_paid),
    0,
  )
  const totalOverdue = entries
    .filter((e) => e.status === 'overdue')
    .reduce((sum, e) => sum + (e.original_amount - e.amount_paid), 0)
  const overdueCount = entries.filter((e) => e.status === 'overdue').length
  const totalPaid = entries.reduce((sum, e) => sum + e.amount_paid, 0)
  const totalOriginal = entries.reduce((sum, e) => sum + e.original_amount, 0)
  const collectionRate = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0

  return {
    total_outstanding: totalOutstanding,
    total_overdue: totalOverdue,
    entries_count: entries.length,
    overdue_count: overdueCount,
    collection_rate: Math.round(collectionRate * 100) / 100,
  }
}

export async function getContactDebts(accountId: string, contactId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('debt_entries')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DebtEntry[]
}

export async function markOverdue(accountId: string) {
  const db = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await db
    .from('debt_entries')
    .update({ status: 'overdue' as DebtStatus, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .in('status', ['outstanding', 'partial'])
    .lt('due_date', today)
    .not('due_date', 'is', null)
  if (error) throw new Error(error.message)
}

async function updateContactOutstandingBalance(
  accountId: string,
  contactId: string,
) {
  const db = supabaseAdmin()
  const { data } = await db
    .from('debt_entries')
    .select('original_amount, amount_paid')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .in('status', ['outstanding', 'partial', 'overdue'])
  const balance = (data ?? []).reduce(
    (sum, e) => sum + (e.original_amount - e.amount_paid),
    0,
  )
  await db
    .from('contacts')
    .update({ outstanding_balance: balance })
    .eq('account_id', accountId)
    .eq('id', contactId)
}


/* ------------------------------------------------------------------ */
/*  Auto Debt Transfer — Overdue Invoices → Debt Book                  */
/* ------------------------------------------------------------------ */

/**
 * Scans all accounts for invoices that are past due_date and not yet
 * in the debt book. Creates debt entries automatically.
 * Returns the number of new debt entries created.
 */
export async function autoTransferOverdueInvoices(): Promise<{
  transferred: number
  errors: string[]
}> {
  const db = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const errors: string[] = []
  let transferred = 0

  // Step 1: Find all invoices that are overdue (past due_date, not paid/cancelled/draft)
  // and don't already have a debt entry linked
  const { data: overdueInvoices, error: fetchError } = await db
    .from('invoices')
    .select('id, account_id, contact_id, doc_number, total, amount_paid, balance_due, due_date, currency, customer_name')
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .not('status', 'in', '("paid","cancelled","draft")')
    .gt('balance_due', 0)

  if (fetchError) {
    return { transferred: 0, errors: [`Failed to fetch overdue invoices: ${fetchError.message}`] }
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return { transferred: 0, errors: [] }
  }

  // Step 2: Get all existing debt entries that are linked to invoices
  const invoiceIds = overdueInvoices.map((inv) => inv.id)
  const { data: existingDebts } = await db
    .from('debt_entries')
    .select('invoice_id')
    .in('invoice_id', invoiceIds)

  const alreadyLinked = new Set((existingDebts ?? []).map((d) => d.invoice_id))

  // Step 3: Create debt entries for invoices not yet in debt book
  for (const inv of overdueInvoices) {
    if (alreadyLinked.has(inv.id)) continue

    try {
      await createDebtEntry(inv.account_id, {
        contact_id: inv.contact_id,
        entry_type: 'credit_sale',
        description: `Overdue invoice ${inv.doc_number}${inv.customer_name ? ` — ${inv.customer_name}` : ''}`,
        original_amount: inv.balance_due,
        due_date: inv.due_date,
        currency: inv.currency || 'NGN',
        reminder_enabled: true,
        reminder_frequency_days: 7,
        max_reminders: 5,
        invoice_id: inv.id,
        notes: `Auto-transferred from overdue invoice on ${today}`,
        tags: ['auto-transferred', 'overdue-invoice'],
      })
      transferred++
    } catch (err) {
      errors.push(`Invoice ${inv.doc_number} (${inv.id}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Step 4: Also mark existing debt entries as overdue if past due
  // (This was already in markOverdue but we call it for all accounts)
  const { data: accounts } = await db
    .from('accounts')
    .select('id')
  for (const account of accounts ?? []) {
    try {
      await markOverdue(account.id)
    } catch (err) {
      errors.push(`markOverdue for account ${account.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Step 5: Update invoice statuses to 'overdue' where applicable
  const { error: updateError } = await db
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .in('status', ['sent', 'viewed', 'accepted', 'partial'])

  if (updateError) {
    errors.push(`Failed to update invoice statuses: ${updateError.message}`)
  }

  return { transferred, errors }
}
