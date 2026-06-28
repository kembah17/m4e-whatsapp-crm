import QRCode from 'qrcode'

interface QROptions {
  phoneNumber: string
  prefillMessage?: string
  size?: number
  format?: 'png' | 'svg'
  fgColor?: string
  bgColor?: string
}

interface QRResult {
  dataUrl: string
  waLink: string
}

/**
 * Build a wa.me deep-link from a phone number and optional prefill text.
 */
export function buildWhatsAppLink(phoneNumber: string, prefillMessage?: string): string {
  // Strip non-digits
  const digits = phoneNumber.replace(/\D/g, '')
  const base = `https://wa.me/${digits}`
  if (prefillMessage) {
    return `${base}?text=${encodeURIComponent(prefillMessage)}`
  }
  return base
}

/**
 * Generate a QR code for a WhatsApp deep-link.
 * Returns a base64 data URL (PNG) or SVG string.
 */
export async function generateWhatsAppQR(opts: QROptions): Promise<QRResult> {
  const {
    phoneNumber,
    prefillMessage,
    size = 512,
    format = 'png',
    fgColor = '#000000',
    bgColor = '#FFFFFF',
  } = opts

  const waLink = buildWhatsAppLink(phoneNumber, prefillMessage)

  const qrOptions = {
    width: size,
    margin: 2,
    color: { dark: fgColor, light: bgColor },
  }

  let dataUrl: string
  if (format === 'svg') {
    dataUrl = await QRCode.toString(waLink, { ...qrOptions, type: 'svg' })
  } else {
    dataUrl = await QRCode.toDataURL(waLink, qrOptions)
  }

  return { dataUrl, waLink }
}
