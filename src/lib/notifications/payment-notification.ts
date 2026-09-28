// ============================================================
// Payment Notification via WhatsApp
// Sends a WhatsApp message when payment is confirmed.
// ============================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

interface PaymentNotificationParams {
  accountId: string
  amount: number
  description: string
  customerPhone?: string
}

interface PaymentNotificationResult {
  sent: boolean
  reason?: string
}

export async function sendPaymentNotification(
  params: PaymentNotificationParams
): Promise<PaymentNotificationResult> {
  const { accountId, amount, description, customerPhone } = params
  const db = supabaseAdmin()

  try {
    // 1. Check if account has WhatsApp connected
    const { data: waConfig } = await db
      .from('whatsapp_config')
      .select('phone_number_id, waba_id, access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!waConfig || !waConfig.phone_number_id || !waConfig.access_token) {
      return { sent: false, reason: 'whatsapp_not_connected' }
    }

    // 2. Determine recipient phone number
    let recipientPhone = customerPhone

    if (!recipientPhone) {
      // Try to get account owner phone
      const { data: account } = await db
        .from('accounts')
        .select('client_phone, owner_user_id')
        .eq('id', accountId)
        .single()

      recipientPhone = account?.client_phone || null

      if (!recipientPhone && account?.owner_user_id) {
        const { data: profile } = await db
          .from('profiles')
          .select('phone')
          .eq('user_id', account.owner_user_id)
          .single()

        recipientPhone = profile?.phone || null
      }
    }

    if (!recipientPhone) {
      return { sent: false, reason: 'no_recipient_phone' }
    }

    // 3. Clean phone number (remove + prefix, spaces, dashes)
    const cleanPhone = recipientPhone.replace(/[^\d]/g, '')

    if (cleanPhone.length < 10) {
      return { sent: false, reason: 'invalid_phone_number' }
    }

    // 4. Format amount in Naira
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)

    // 5. Decrypt access token if needed
    let accessToken = waConfig.access_token
    try {
      const { decrypt } = await import('@/lib/whatsapp/encryption')
      accessToken = decrypt(waConfig.access_token)
    } catch {
      // Token may not be encrypted, use as-is
    }

    // 6. Send WhatsApp text message
    const messageBody = `Payment of ${formattedAmount} received for ${description}. Thank you! Your subscription is now active.`

    const waResponse = await fetch(
      `https://graph.facebook.com/v21.0/${waConfig.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: messageBody },
        }),
      }
    )

    if (!waResponse.ok) {
      const errBody = await waResponse.text()
      console.error('[payment-notification] WhatsApp send failed:', errBody)
      return { sent: false, reason: `whatsapp_api_error: ${waResponse.status}` }
    }

    // 7. Log the notification
    await db.from('client_provisioning_log').insert({
      account_id: accountId,
      action: 'payment_notification_sent',
      details: {
        amount,
        description,
        recipient: cleanPhone,
        channel: 'whatsapp',
      },
    })

    console.log(`[payment-notification] Sent to ${cleanPhone} for account ${accountId}`)
    return { sent: true }
  } catch (err) {
    console.error('[payment-notification] Error:', err)
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown_error' }
  }
}
