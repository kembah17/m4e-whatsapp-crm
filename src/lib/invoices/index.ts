import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  DocType,
  DiscountType,
} from '@/types/business-growth'

/* ------------------------------------------------------------------ */
/*  Invoice CRUD                                                       */
/* ------------------------------------------------------------------ */

export async function getInvoices(
  accountId: string,
  filters?: {
    doc_type?: DocType
    status?: InvoiceStatus
    contact_id?: string
    search?: string
    date_from?: string
    date_to?: string
    limit?: number
    offset?: number
  },
) {
  const db = supabaseAdmin()
  let query = db
    .from('invoices')
    .select('*, contact:contacts!contact_id(name, phone, email)', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (filters?.doc_type) query = query.eq('doc_type', filters.doc_type)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id)
  if (filters?.search) {
    query = query.or(
      `doc_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`,
    )
  }
  if (filters?.date_from) query = query.gte('issue_date', filters.date_from)
  if (filters?.date_to) query = query.lte('issue_date', filters.date_to)

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { invoices: (data ?? []) as Invoice[], total: count ?? 0 }
}

export async function getInvoice(accountId: string, invoiceId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('invoices')
    .select('*, contact:contacts!contact_id(name, phone, email)')
    .eq('account_id', accountId)
    .eq('id', invoiceId)
    .single()
  if (error) throw new Error(error.message)

  // Fetch items
  const { data: items } = await db
    .from('invoice_items')
    .select('*, product:products!product_id(name, sku)')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  return { ...(data as Invoice), items: (items ?? []) as InvoiceItem[] }
}

export async function createInvoice(
  accountId: string,
  input: {
    contact_id: string
    doc_type: DocType
    items: Array<{
      product_id?: string | null
      description: string
      quantity: number
      unit_price: number
      discount_percent?: number
      tax_rate?: number
    }>
    discount_type?: DiscountType
    discount_value?: number
    tax_rate?: number
    currency?: string
    due_date?: string | null
    valid_until?: string | null
    notes?: string | null
    terms?: string | null
    footer_text?: string | null
    business_name?: string | null
    business_address?: string | null
    business_phone?: string | null
    business_email?: string | null
    business_logo_url?: string | null
    business_bank_details?: Record<string, string> | null
    deal_id?: string | null
    tags?: string[]
    created_by?: string | null
  },
) {
  const db = supabaseAdmin()

  // Generate doc number
  const docNumber = await generateDocNumber(accountId, input.doc_type)

  // Calculate totals
  const totals = calculateInvoiceTotals(
    input.items,
    input.discount_type || 'none',
    input.discount_value || 0,
    input.tax_rate || 0,
  )

  // Get customer snapshot
  const { data: contact } = await db
    .from('contacts')
    .select('name, phone, email')
    .eq('id', input.contact_id)
    .single()

  // Create invoice
  const { data: invoice, error: invoiceError } = await db
    .from('invoices')
    .insert({
      account_id: accountId,
      contact_id: input.contact_id,
      doc_type: input.doc_type,
      doc_number: docNumber,
      subtotal: totals.subtotal,
      discount_type: input.discount_type || 'none',
      discount_value: input.discount_value || 0,
      discount_amount: totals.discount_amount,
      tax_rate: input.tax_rate || 0,
      tax_amount: totals.tax_amount,
      total: totals.total,
      amount_paid: 0,
      currency: input.currency || 'NGN',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: input.due_date ?? null,
      valid_until: input.valid_until ?? null,
      status: 'draft' as InvoiceStatus,
      customer_name: contact?.name ?? null,
      customer_phone: contact?.phone ?? null,
      customer_email: contact?.email ?? null,
      business_name: input.business_name ?? null,
      business_address: input.business_address ?? null,
      business_phone: input.business_phone ?? null,
      business_email: input.business_email ?? null,
      business_logo_url: input.business_logo_url ?? null,
      business_bank_details: input.business_bank_details ?? null,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      footer_text: input.footer_text ?? null,
      deal_id: input.deal_id ?? null,
      tags: input.tags ?? [],
      metadata: {},
      created_by: input.created_by ?? null,
    })
    .select()
    .single()
  if (invoiceError) throw new Error(invoiceError.message)

  // Create items
  if (input.items.length > 0) {
    const itemRows = input.items.map((item, idx) => ({
      invoice_id: invoice.id,
      product_id: item.product_id ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent ?? 0,
      tax_rate: item.tax_rate ?? 0,
      line_total:
        item.quantity * item.unit_price * (1 - (item.discount_percent ?? 0) / 100),
      sort_order: idx,
    }))
    const { error: itemsError } = await db.from('invoice_items').insert(itemRows)
    if (itemsError) throw new Error(itemsError.message)
  }

  return invoice as Invoice
}

export async function updateInvoice(
  accountId: string,
  invoiceId: string,
  updates: Partial<Pick<Invoice,
    | 'status' | 'due_date' | 'valid_until' | 'notes' | 'terms'
    | 'footer_text' | 'amount_paid' | 'sent_via' | 'sent_at'
    | 'viewed_at' | 'pdf_url' | 'tags'
  >>,
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('id', invoiceId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Invoice
}

export async function deleteInvoice(accountId: string, invoiceId: string) {
  const db = supabaseAdmin()
  // Delete items first
  await db.from('invoice_items').delete().eq('invoice_id', invoiceId)
  const { error } = await db
    .from('invoices')
    .delete()
    .eq('account_id', accountId)
    .eq('id', invoiceId)
  if (error) throw new Error(error.message)
}

/* ------------------------------------------------------------------ */
/*  Invoice Items                                                      */
/* ------------------------------------------------------------------ */

export async function getInvoiceItems(invoiceId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('invoice_items')
    .select('*, product:products!product_id(name, sku)')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvoiceItem[]
}

export async function addInvoiceItem(
  invoiceId: string,
  item: {
    product_id?: string | null
    description: string
    quantity: number
    unit_price: number
    discount_percent?: number
    tax_rate?: number
    notes?: string | null
  },
) {
  const db = supabaseAdmin()
  // Get current max sort_order
  const { data: existing } = await db
    .from('invoice_items')
    .select('sort_order')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const lineTotal =
    item.quantity * item.unit_price * (1 - (item.discount_percent ?? 0) / 100)

  const { data, error } = await db
    .from('invoice_items')
    .insert({
      invoice_id: invoiceId,
      product_id: item.product_id ?? null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent ?? 0,
      tax_rate: item.tax_rate ?? 0,
      line_total: lineTotal,
      sort_order: nextOrder,
      notes: item.notes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Recalculate invoice totals
  await recalculateInvoiceTotals(invoiceId)

  return data as InvoiceItem
}

export async function updateInvoiceItem(
  itemId: string,
  updates: Partial<Pick<InvoiceItem,
    | 'description' | 'quantity' | 'unit_price'
    | 'discount_percent' | 'tax_rate' | 'notes' | 'sort_order'
  >>,
) {
  const db = supabaseAdmin()

  // If quantity or price changed, recalculate line_total
  const updateData: Record<string, unknown> = { ...updates }
  if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.discount_percent !== undefined) {
    const { data: current } = await db
      .from('invoice_items')
      .select('quantity, unit_price, discount_percent')
      .eq('id', itemId)
      .single()
    if (current) {
      const qty = updates.quantity ?? current.quantity
      const price = updates.unit_price ?? current.unit_price
      const disc = updates.discount_percent ?? current.discount_percent
      updateData.line_total = qty * price * (1 - disc / 100)
    }
  }

  const { data, error } = await db
    .from('invoice_items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Recalculate invoice totals
  if (data) await recalculateInvoiceTotals(data.invoice_id)

  return data as InvoiceItem
}

export async function deleteInvoiceItem(itemId: string) {
  const db = supabaseAdmin()
  const { data: item } = await db
    .from('invoice_items')
    .select('invoice_id')
    .eq('id', itemId)
    .single()

  const { error } = await db.from('invoice_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)

  if (item) await recalculateInvoiceTotals(item.invoice_id)
}

/* ------------------------------------------------------------------ */
/*  Calculations                                                       */
/* ------------------------------------------------------------------ */

export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unit_price: number; discount_percent?: number; tax_rate?: number }>,
  discountType: DiscountType,
  discountValue: number,
  taxRate: number,
) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_percent ?? 0) / 100)
    return sum + lineTotal
  }, 0)

  let discount_amount = 0
  if (discountType === 'percentage') {
    discount_amount = subtotal * (discountValue / 100)
  } else if (discountType === 'fixed') {
    discount_amount = discountValue
  }

  const afterDiscount = subtotal - discount_amount
  const tax_amount = afterDiscount * (taxRate / 100)
  const total = afterDiscount + tax_amount

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: Math.round(discount_amount * 100) / 100,
    tax_amount: Math.round(tax_amount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

async function recalculateInvoiceTotals(invoiceId: string) {
  const db = supabaseAdmin()
  const { data: invoice } = await db
    .from('invoices')
    .select('discount_type, discount_value, tax_rate')
    .eq('id', invoiceId)
    .single()
  if (!invoice) return

  const { data: items } = await db
    .from('invoice_items')
    .select('quantity, unit_price, discount_percent, tax_rate')
    .eq('invoice_id', invoiceId)
  if (!items) return

  const totals = calculateInvoiceTotals(
    items,
    invoice.discount_type as DiscountType,
    invoice.discount_value,
    invoice.tax_rate,
  )

  await db
    .from('invoices')
    .update({
      subtotal: totals.subtotal,
      discount_amount: totals.discount_amount,
      tax_amount: totals.tax_amount,
      total: totals.total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
}

/* ------------------------------------------------------------------ */
/*  Doc Number Generation                                              */
/* ------------------------------------------------------------------ */

export async function generateDocNumber(
  accountId: string,
  docType: DocType,
): Promise<string> {
  const db = supabaseAdmin()
  const prefixMap: Record<DocType, string> = {
    invoice: 'INV',
    quotation: 'QUO',
    proforma: 'PRO',
    receipt: 'REC',
    credit_note: 'CN',
  }
  const prefix = prefixMap[docType] || 'DOC'

  // Get count of existing docs of this type
  const { count } = await db
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('doc_type', docType)

  const num = (count ?? 0) + 1
  return `${prefix}-${String(num).padStart(5, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Summary & Utilities                                                */
/* ------------------------------------------------------------------ */

export async function getInvoiceSummary(accountId: string) {
  const db = supabaseAdmin()
  const { data } = await db
    .from('invoices')
    .select('total, amount_paid, status, doc_type, issue_date')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')

  const invoices = data ?? []
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const unpaid = invoices
    .filter((i) => ['sent', 'viewed', 'partial', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.total - i.amount_paid), 0)

  const overdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total - i.amount_paid), 0)

  const pendingCount = invoices.filter((i) =>
    ['draft', 'sent', 'viewed'].includes(i.status),
  ).length

  const thisMonthRevenue = invoices
    .filter((i) => i.status === 'paid' && i.issue_date?.startsWith(thisMonth))
    .reduce((sum, i) => sum + i.total, 0)

  return {
    total_unpaid: unpaid,
    total_overdue: overdue,
    pending_count: pendingCount,
    this_month_revenue: thisMonthRevenue,
  }
}

export async function convertQuotationToInvoice(
  accountId: string,
  quotationId: string,
  createdBy?: string | null,
) {
  const db = supabaseAdmin()
  const quotation = await getInvoice(accountId, quotationId)
  if (!quotation) throw new Error('Quotation not found')

  const docNumber = await generateDocNumber(accountId, 'invoice')

  // Create invoice from quotation
  const { data: invoice, error } = await db
    .from('invoices')
    .insert({
      account_id: accountId,
      contact_id: quotation.contact_id,
      doc_type: 'invoice' as DocType,
      doc_number: docNumber,
      subtotal: quotation.subtotal,
      discount_type: quotation.discount_type,
      discount_value: quotation.discount_value,
      discount_amount: quotation.discount_amount,
      tax_rate: quotation.tax_rate,
      tax_amount: quotation.tax_amount,
      total: quotation.total,
      amount_paid: 0,
      currency: quotation.currency,
      issue_date: new Date().toISOString().split('T')[0],
      status: 'draft' as InvoiceStatus,
      customer_name: quotation.customer_name,
      customer_address: quotation.customer_address,
      customer_phone: quotation.customer_phone,
      customer_email: quotation.customer_email,
      business_name: quotation.business_name,
      business_address: quotation.business_address,
      business_phone: quotation.business_phone,
      business_email: quotation.business_email,
      business_logo_url: quotation.business_logo_url,
      business_bank_details: quotation.business_bank_details,
      notes: quotation.notes,
      terms: quotation.terms,
      footer_text: quotation.footer_text,
      converted_from_id: quotationId,
      tags: quotation.tags,
      metadata: {},
      created_by: createdBy ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Copy items
  if (quotation.items && quotation.items.length > 0) {
    const itemRows = quotation.items.map((item) => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_rate: item.tax_rate,
      line_total: item.line_total,
      sort_order: item.sort_order,
      notes: item.notes,
    }))
    await db.from('invoice_items').insert(itemRows)
  }

  // Mark quotation as accepted
  await db
    .from('invoices')
    .update({ status: 'accepted' as InvoiceStatus, updated_at: new Date().toISOString() })
    .eq('id', quotationId)

  return invoice as Invoice
}

export async function getContactInvoices(accountId: string, contactId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('invoices')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Invoice[]
}
