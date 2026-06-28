/**
 * Keyword-based sentiment detection.
 * Includes Nigerian Pidgin English terms.
 * Used as fallback when AI analysis is unavailable.
 */

export const NEGATIVE_KEYWORDS = [
  // English
  'angry', 'upset', 'frustrated', 'terrible', 'horrible', 'worst',
  'hate', 'disgusted', 'disappointed', 'unacceptable', 'scam',
  'fraud', 'cheat', 'lie', 'liar', 'useless', 'rubbish', 'nonsense',
  'refund', 'cancel', 'complaint', 'poor', 'bad', 'awful',
  'never again', 'waste', 'pathetic', 'incompetent',
  // Nigerian Pidgin
  'wahala', 'rubbish', 'nonsense', 'wetin be dis', 'na wa',
  'no good', 'bad market', 'craze', 'mumu', 'oloshi',
  'yeye', 'no try', 'fail', 'wicked', 'thief',
  'una dey mad', 'una no serious', 'I no happy',
]

export const URGENT_KEYWORDS = [
  // English
  'urgent', 'emergency', 'asap', 'immediately', 'right now',
  'help me', 'please help', 'critical', 'desperate', 'dying',
  'lawsuit', 'lawyer', 'legal', 'police', 'report',
  'deadline', 'last chance', 'final warning',
  // Nigerian Pidgin
  'abeg help', 'e urgent', 'na emergency', 'I dey beg',
  'make una help', 'e don happen', 'trouble dey',
]

export const POSITIVE_KEYWORDS = [
  // English
  'thank', 'thanks', 'great', 'excellent', 'amazing', 'wonderful',
  'perfect', 'love', 'awesome', 'fantastic', 'brilliant',
  'happy', 'satisfied', 'impressed', 'recommend', 'best',
  'good job', 'well done', 'appreciate', 'grateful',
  // Nigerian Pidgin
  'God bless', 'e sweet', 'na correct', 'you try',
  'una try well well', 'I happy', 'e dey okay', 'sharp',
  'you don hammer', 'na you biko', 'well done o',
  'thank you plenty', 'e good', 'no wahala',
]

export interface KeywordSentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  score: number
  confidence: number
  keywords: string[]
}

/**
 * Fallback keyword-based sentiment analysis.
 * Returns sentiment based on keyword matching.
 */
export function keywordBasedSentiment(text: string): KeywordSentimentResult {
  const lower = text.toLowerCase()
  const found: { sentiment: string; keyword: string }[] = []

  for (const kw of URGENT_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      found.push({ sentiment: 'urgent', keyword: kw })
    }
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      found.push({ sentiment: 'negative', keyword: kw })
    }
  }
  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      found.push({ sentiment: 'positive', keyword: kw })
    }
  }

  if (found.length === 0) {
    return { sentiment: 'neutral', score: 0, confidence: 0.3, keywords: [] }
  }

  // Priority: urgent > negative > positive
  const urgentHits = found.filter((f) => f.sentiment === 'urgent')
  const negativeHits = found.filter((f) => f.sentiment === 'negative')
  const positiveHits = found.filter((f) => f.sentiment === 'positive')

  let sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' = 'neutral'
  let score = 0

  if (urgentHits.length > 0) {
    sentiment = 'urgent'
    score = -1
  } else if (negativeHits.length > positiveHits.length) {
    sentiment = 'negative'
    score = -(negativeHits.length / (negativeHits.length + positiveHits.length))
  } else if (positiveHits.length > negativeHits.length) {
    sentiment = 'positive'
    score = positiveHits.length / (negativeHits.length + positiveHits.length)
  }

  return {
    sentiment,
    score: Math.round(score * 100) / 100,
    confidence: Math.min(0.7, 0.3 + found.length * 0.1),
    keywords: found.map((f) => f.keyword),
  }
}
