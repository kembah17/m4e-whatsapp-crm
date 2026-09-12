import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import type { KnowledgeCategory } from '@/types/ai'

interface BusinessInfo {
  business_name?: string
  business_type?: string
  industry?: string
  description?: string
  products?: string[] | string
  services?: string[] | string
  business_hours?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  policies?: {
    returns?: string
    shipping?: string
    warranty?: string
    payment?: string
    [key: string]: string | undefined
  }
  faqs?: Array<{ question: string; answer: string }>
  pricing_info?: string
}

interface KBEntry {
  account_id: string
  question: string
  answer: string
  category: KnowledgeCategory
  priority: number
  is_active: boolean
  keywords: string[]
}

function generateEntries(accountId: string, info: BusinessInfo): KBEntry[] {
  const entries: KBEntry[] = []
  const name = info.business_name || 'our business'

  // --- General category ---
  if (info.business_name) {
    entries.push({
      account_id: accountId,
      question: `What is ${info.business_name}?`,
      answer: info.description || `${info.business_name} is a ${info.industry || info.business_type || 'business'} based in Nigeria.`,
      category: 'general',
      priority: 10,
      is_active: true,
      keywords: ['about', 'company', 'business', 'who'],
    })
  }

  if (info.description) {
    entries.push({
      account_id: accountId,
      question: `What does ${name} do?`,
      answer: info.description,
      category: 'general',
      priority: 9,
      is_active: true,
      keywords: ['about', 'services', 'what', 'do'],
    })
  }

  if (info.industry || info.business_type) {
    entries.push({
      account_id: accountId,
      question: `What type of business is ${name}?`,
      answer: `${name} is a ${info.industry || info.business_type} business.`,
      category: 'general',
      priority: 7,
      is_active: true,
      keywords: ['type', 'industry', 'category', 'kind'],
    })
  }

  // --- Contact info ---
  if (info.address) {
    entries.push({
      account_id: accountId,
      question: `Where is ${name} located?`,
      answer: info.address,
      category: 'general',
      priority: 8,
      is_active: true,
      keywords: ['location', 'address', 'where', 'directions', 'find'],
    })
  }

  if (info.business_hours) {
    entries.push({
      account_id: accountId,
      question: `What are your business hours?`,
      answer: info.business_hours,
      category: 'general',
      priority: 8,
      is_active: true,
      keywords: ['hours', 'open', 'close', 'time', 'schedule', 'when'],
    })
  }

  if (info.phone) {
    entries.push({
      account_id: accountId,
      question: `How can I contact ${name}?`,
      answer: `You can reach us at ${info.phone}${info.email ? ` or email ${info.email}` : ''}${info.website ? `. Visit our website: ${info.website}` : ''}.`,
      category: 'general',
      priority: 8,
      is_active: true,
      keywords: ['contact', 'phone', 'email', 'reach', 'call'],
    })
  }

  if (info.website) {
    entries.push({
      account_id: accountId,
      question: `What is your website?`,
      answer: `Our website is ${info.website}`,
      category: 'general',
      priority: 5,
      is_active: true,
      keywords: ['website', 'url', 'site', 'online'],
    })
  }

  // --- Products category ---
  const products = Array.isArray(info.products)
    ? info.products
    : info.products
      ? [info.products]
      : []

  if (products.length > 0) {
    entries.push({
      account_id: accountId,
      question: `What products do you sell?`,
      answer: `We offer the following products:\n${products.map((p) => `\u2022 ${p}`).join('\n')}`,
      category: 'product',
      priority: 9,
      is_active: true,
      keywords: ['products', 'sell', 'buy', 'offer', 'available', 'stock'],
    })

    // Individual product entries
    for (const product of products.slice(0, 20)) {
      entries.push({
        account_id: accountId,
        question: `Do you have ${product}?`,
        answer: `Yes, we offer ${product}. Please ask for current pricing and availability.`,
        category: 'product',
        priority: 6,
        is_active: true,
        keywords: [product.toLowerCase(), 'product', 'available'],
      })
    }
  }

  // --- Services category ---
  const services = Array.isArray(info.services)
    ? info.services
    : info.services
      ? [info.services]
      : []

  if (services.length > 0) {
    entries.push({
      account_id: accountId,
      question: `What services do you offer?`,
      answer: `We provide the following services:\n${services.map((s) => `\u2022 ${s}`).join('\n')}`,
      category: 'product',
      priority: 9,
      is_active: true,
      keywords: ['services', 'offer', 'provide', 'help'],
    })
  }

  // --- Policy category ---
  if (info.policies) {
    const policyMap: Record<string, { q: string; keywords: string[] }> = {
      returns: { q: 'What is your return policy?', keywords: ['return', 'refund', 'exchange', 'money back'] },
      shipping: { q: 'What is your shipping/delivery policy?', keywords: ['shipping', 'delivery', 'ship', 'deliver', 'send'] },
      warranty: { q: 'Do you offer a warranty?', keywords: ['warranty', 'guarantee', 'defect', 'broken'] },
      payment: { q: 'What payment methods do you accept?', keywords: ['payment', 'pay', 'transfer', 'card', 'cash'] },
    }

    for (const [key, value] of Object.entries(info.policies)) {
      if (!value) continue
      const mapped = policyMap[key]
      entries.push({
        account_id: accountId,
        question: mapped?.q || `What is your ${key} policy?`,
        answer: value,
        category: 'policy',
        priority: 7,
        is_active: true,
        keywords: mapped?.keywords || [key, 'policy'],
      })
    }
  }

  // --- FAQ category ---
  if (info.faqs && info.faqs.length > 0) {
    for (const faq of info.faqs.slice(0, 50)) {
      if (!faq.question?.trim() || !faq.answer?.trim()) continue
      entries.push({
        account_id: accountId,
        question: faq.question.trim(),
        answer: faq.answer.trim(),
        category: 'faq',
        priority: 6,
        is_active: true,
        keywords: faq.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 5),
      })
    }
  }

  // --- Pricing category ---
  if (info.pricing_info) {
    entries.push({
      account_id: accountId,
      question: `What are your prices?`,
      answer: info.pricing_info,
      category: 'pricing',
      priority: 8,
      is_active: true,
      keywords: ['price', 'cost', 'how much', 'pricing', 'rate', 'fee'],
    })
  }

  return entries
}

/**
 * POST /api/ai/knowledge/seed
 * Generate knowledge base entries from business onboarding data.
 */
export async function POST(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const body: BusinessInfo = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object with business information' },
        { status: 400 },
      )
    }

    // Generate KB entries from business info
    const entries = generateEntries(accountId, body)

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No knowledge base entries could be generated. Please provide more business information.' },
        { status: 400 },
      )
    }

    // Insert entries in batches of 50
    let inserted = 0
    const batchSize = 50
    const errors: string[] = []

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .insert(batch)
        .select('id')

      if (error) {
        console.error('[kb-seed] batch insert error:', error)
        errors.push(error.message)
      } else {
        inserted += data?.length ?? 0
      }
    }

    // Summarize by category
    const categoryCounts: Record<string, number> = {}
    for (const entry of entries) {
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      created: inserted,
      total_generated: entries.length,
      by_category: categoryCounts,
      ...(errors.length > 0 ? { errors } : {}),
    }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
