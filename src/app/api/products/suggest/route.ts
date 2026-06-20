import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Hair Services': ['hair', 'braids', 'weave', 'wig', 'locs', 'dreadlocks', 'barber', 'haircut', 'relaxer', 'perm', 'cornrow', 'twist'],
  'Skin Care': ['skin', 'facial', 'glow', 'acne', 'moisturizer', 'serum', 'cream', 'lotion', 'exfoliat', 'dermato'],
  'Nail Services': ['nail', 'manicure', 'pedicure', 'gel', 'acrylic', 'polish'],
  'Body Treatments': ['body', 'massage', 'spa', 'scrub', 'wax', 'sauna', 'steam'],
  'Fitness': ['fitness', 'gym', 'workout', 'training', 'yoga', 'pilates', 'exercise', 'weight'],
  'Food & Beverage': ['food', 'restaurant', 'catering', 'meal', 'drink', 'juice', 'smoothie', 'cake', 'pastry', 'grill', 'suya', 'pepper soup'],
  'Fashion': ['fashion', 'clothing', 'dress', 'shirt', 'trouser', 'shoe', 'bag', 'accessory', 'jewelry', 'tailor', 'ankara', 'aso'],
  'Auto Services': ['auto', 'car', 'vehicle', 'mechanic', 'wash', 'detailing', 'tyre', 'tire', 'oil change', 'repair'],
  'Professional Services': ['consult', 'legal', 'accounting', 'tax', 'audit', 'advisory', 'coaching', 'mentor'],
  'Education': ['education', 'training', 'course', 'class', 'lesson', 'tutor', 'school', 'workshop', 'seminar'],
  'Health & Medical': ['health', 'medical', 'clinic', 'hospital', 'dental', 'pharmacy', 'therapy', 'doctor', 'nurse'],
  'Real Estate': ['real estate', 'property', 'apartment', 'house', 'land', 'rent', 'lease', 'estate'],
  'Technology': ['tech', 'software', 'app', 'website', 'digital', 'IT', 'computer', 'phone', 'repair'],
  'Events': ['event', 'party', 'wedding', 'birthday', 'decoration', 'DJ', 'MC', 'photography', 'videography'],
};

const SEASONAL_KEYWORDS: Record<string, { start: string; end: string }> = {
  valentine: { start: '02-01', end: '02-28' },
  christmas: { start: '12-01', end: '12-31' },
  easter: { start: '03-15', end: '04-30' },
  'new year': { start: '12-20', end: '01-10' },
  ramadan: { start: '03-01', end: '04-30' },
  eid: { start: '04-01', end: '04-30' },
  independence: { start: '09-15', end: '10-07' },
  sallah: { start: '06-01', end: '07-15' },
};

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'with', 'our', 'your', 'this', 'that', 'is', 'in', 'on', 'at', 'to', 'of', 'by']);

export async function POST(request: Request) {
  try {
    await getCurrentAccount();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { name, price, description, category, cost } = body;
    const suggestions: Record<string, unknown> = {};
    const confidence: Record<string, number> = {};

    const nameLower = (name || '').toLowerCase();
    const descLower = (description || '').toLowerCase();
    const combined = `${nameLower} ${descLower}`;

    // Category suggestion
    if (!category) {
      let bestCategory = 'General';
      let bestScore = 0;
      for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
          if (combined.includes(kw)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestCategory = cat;
        }
      }
      suggestions.category = bestCategory;
      confidence.category = bestScore >= 2 ? 0.85 : bestScore === 1 ? 0.6 : 0.3;
    }

    // Short pitch suggestion
    if (name) {
      if (description) {
        suggestions.short_pitch = description.length > 160
          ? description.substring(0, 157) + '...'
          : description;
        confidence.short_pitch = 0.7;
      } else {
        suggestions.short_pitch = `Experience our ${name} — quality you can trust.`;
        confidence.short_pitch = 0.5;
      }
    }

    // Description suggestion
    if (!description && name) {
      const priceStr = price ? ` starting at ${price}` : '';
      suggestions.description = `Premium ${name.toLowerCase()}${priceStr}. Contact us to learn more about this offering.`;
      confidence.description = 0.4;
    }

    // Tags suggestion
    if (name) {
      const words = nameLower.split(/\s+/).filter((w: string) => w.length > 2 && !STOP_WORDS.has(w));
      const effectiveCategory = (category || suggestions.category || '') as string;
      if (effectiveCategory && effectiveCategory !== 'General') {
        words.push(effectiveCategory.toLowerCase());
      }
      suggestions.tags = [...new Set(words)].slice(0, 8);
      confidence.tags = 0.6;
    }

    // Seasonal detection
    for (const [keyword, dates] of Object.entries(SEASONAL_KEYWORDS)) {
      if (combined.includes(keyword)) {
        const year = new Date().getFullYear();
        suggestions.seasonal_start = `${year}-${dates.start}`;
        suggestions.seasonal_end = `${year}-${dates.end}`;
        confidence.seasonal_start = 0.75;
        confidence.seasonal_end = 0.75;
        break;
      }
    }

    // Lead magnet eligibility
    if (cost != null && price != null && Number(price) > 0) {
      suggestions.lead_magnet_eligible = Number(cost) < Number(price) * 0.15;
      confidence.lead_magnet_eligible = 0.9;
    }

    return NextResponse.json({ suggestions, confidence });
  } catch (err) {
    return toErrorResponse(err);
  }
}
