import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { generateWhatsAppQR } from '@/lib/qr/generator'

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    void ctx // auth check only

    const body = await request.json()
    const { phoneNumber, prefillMessage, size, format, fgColor, bgColor } = body

    if (!phoneNumber) {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
    }

    const result = await generateWhatsAppQR({
      phoneNumber,
      prefillMessage,
      size: size || 512,
      format: format || 'png',
      fgColor: fgColor || '#000000',
      bgColor: bgColor || '#FFFFFF',
    })

    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}
