"use client"

import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/currency'

interface InvoicePreviewProps {
  invoice: {
    doc_number?: string
    doc_type?: string
    status?: string
    issue_date?: string
    due_date?: string
    subtotal?: number
    discount_value?: number
    discount_type?: string
    tax_rate?: number
    tax_amount?: number
    total?: number
    amount_paid?: number
    balance_due?: number
    notes?: string
    terms?: string
    currency?: string
    contact?: {
      name?: string
      company_name?: string
      email?: string
      phone?: string
      address?: string
    } | null
    items?: Array<{
      description?: string
      quantity?: number
      unit_price?: number
      discount_percent?: number
      tax_rate?: number
      total?: number
    }>
  }
  contact?: {
    name?: string
    company_name?: string
    email?: string
    phone?: string
    address?: string
  } | null
  business?: {
    business_name?: string
    business_address?: string
    business_phone?: string
    business_email?: string
    logo_url?: string
    industry?: string
  } | null
  currency?: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function InvoicePreview({ invoice, contact: contactProp, business, currency: currencyProp }: InvoicePreviewProps) {
  const currency = currencyProp || invoice.currency || 'NGN'
  const items = invoice.items || []
  const status = invoice.status || 'draft'
  // Use contact prop if provided, otherwise extract from invoice
  const contact = contactProp || (invoice.contact as InvoicePreviewProps['contact']) || null

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[800px] mx-auto print:p-4" id="invoice-preview">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b pb-6">
        <div>
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business?.business_name || 'Business'}
              className="h-16 w-auto mb-2 object-contain"
            />
          ) : null}
          <h1 className="text-2xl font-bold text-gray-900">
            {business?.business_name || 'Your Business'}
          </h1>
          {business?.business_address ? (
            <p className="text-sm text-gray-600 mt-1">{business.business_address}</p>
          ) : null}
          {business?.business_phone ? (
            <p className="text-sm text-gray-600">{business.business_phone}</p>
          ) : null}
          {business?.business_email ? (
            <p className="text-sm text-gray-600">{business.business_email}</p>
          ) : null}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-400">
            {(invoice.doc_type || 'invoice').replace('_', ' ')}
          </h2>
          <p className="text-lg font-semibold mt-1">{invoice.doc_number || '—'}</p>
          <Badge className={statusColors[status] || 'bg-gray-100 text-gray-700'}>
            {status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Dates + Customer */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
          <p className="font-semibold text-gray-900">
            {contact?.name || contact?.company_name || 'Customer'}
          </p>
          {contact?.company_name && contact?.name ? (
            <p className="text-sm text-gray-600">{contact.company_name}</p>
          ) : null}
          {contact?.address ? (
            <p className="text-sm text-gray-600">{contact.address}</p>
          ) : null}
          {contact?.phone ? (
            <p className="text-sm text-gray-600">{contact.phone}</p>
          ) : null}
          {contact?.email ? (
            <p className="text-sm text-gray-600">{contact.email}</p>
          ) : null}
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Issue Date</span>
            <p className="text-sm font-medium">
              {invoice.issue_date
                ? new Date(invoice.issue_date).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Due Date</span>
            <p className="text-sm font-medium">
              {invoice.due_date
                ? new Date(invoice.due_date).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-32">Unit Price</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-3 text-sm">{item.description || '—'}</td>
                <td className="py-3 text-sm text-right">{item.quantity ?? 0}</td>
                <td className="py-3 text-sm text-right">
                  {formatCurrency(Number(item.unit_price) || 0, currency)}
                </td>
                <td className="py-3 text-sm text-right font-medium">
                  {formatCurrency(Number(item.total) || 0, currency)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-400 text-sm">
                No line items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-72">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency(Number(invoice.subtotal) || 0, currency)}</span>
          </div>
          {(Number(invoice.discount_value) || 0) > 0 ? (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">
                Discount{invoice.discount_type === 'percentage' ? ` (${invoice.discount_value}%)` : ''}
              </span>
              <span className="text-red-600">
                -{formatCurrency(
                  invoice.discount_type === 'percentage'
                    ? ((Number(invoice.subtotal) || 0) * (Number(invoice.discount_value) || 0)) / 100
                    : Number(invoice.discount_value) || 0,
                  currency,
                )}
              </span>
            </div>
          ) : null}
          {(Number(invoice.tax_amount) || 0) > 0 ? (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">
                Tax{invoice.tax_rate ? ` (${invoice.tax_rate}%)` : ''}
              </span>
              <span>{formatCurrency(Number(invoice.tax_amount) || 0, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-gray-900 mt-2">
            <span>Total</span>
            <span>{formatCurrency(Number(invoice.total) || 0, currency)}</span>
          </div>
          {(Number(invoice.amount_paid) || 0) > 0 ? (
            <>
              <div className="flex justify-between py-1 text-sm text-green-700">
                <span>Amount Paid</span>
                <span>{formatCurrency(Number(invoice.amount_paid) || 0, currency)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-semibold text-red-700">
                <span>Balance Due</span>
                <span>
                  {formatCurrency(
                    Number(invoice.balance_due) || Math.max(0, (Number(invoice.total) || 0) - (Number(invoice.amount_paid) || 0)),
                    currency,
                  )}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Notes & Terms */}
      {invoice.notes ? (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      ) : null}
      {invoice.terms ? (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Terms & Conditions
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.terms}</p>
        </div>
      ) : null}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-preview, #invoice-preview * { visibility: visible; }
          #invoice-preview { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}

export default InvoicePreview
