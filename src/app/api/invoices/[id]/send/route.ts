import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { updateInvoice } from '@/lib/invoices'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json().catch(() => null)
    const channel = body?.channel || 'whatsapp'

    // Update invoice status to sent
    const invoice = await updateInvoice(ctx.accountId, id, {
      status: 'sent',
      sent_via: channel,
      sent_at: new Date().toISOString(),
    })

    // TODO: Integrate with WhatsApp/email sending when available
    // For now, just mark as sent

    return NextResponse.json({
      success: true,
      invoice,
      message: `Invoice marked as sent via ${channel}. Direct sending will be available when WhatsApp API is connected.`,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
