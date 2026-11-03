import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole('admin')
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const expenseId = formData.get('expense_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${ctx.accountId}/receipts/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await db.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      // If bucket doesn't exist, try product-media bucket
      const { error: uploadError2 } = await db.storage
        .from('product-media')
        .upload(`receipts/${fileName}`, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })
      if (uploadError2) {
        return NextResponse.json({ error: uploadError2.message }, { status: 500 })
      }
      const { data: urlData } = db.storage
        .from('product-media')
        .getPublicUrl(`receipts/${fileName}`)
      const receiptUrl = urlData?.publicUrl || ''

      if (expenseId) {
        await db.from('expenses').update({ receipt_url: receiptUrl }).eq('id', expenseId).eq('account_id', ctx.accountId)
      }
      return NextResponse.json({ url: receiptUrl })
    }

    const { data: urlData } = db.storage
      .from('receipts')
      .getPublicUrl(fileName)
    const receiptUrl = urlData?.publicUrl || ''

    if (expenseId) {
      await db.from('expenses').update({ receipt_url: receiptUrl }).eq('id', expenseId).eq('account_id', ctx.accountId)
    }

    return NextResponse.json({ url: receiptUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
