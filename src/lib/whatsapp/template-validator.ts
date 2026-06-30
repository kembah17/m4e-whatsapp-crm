/**
 * Enhanced template validator with structured results, warnings, and quality scoring.
 * Complements the existing template-validators.ts (which throws on first error)
 * by providing a comprehensive validation report for the UI.
 */

export interface ValidationError {
  field: 'name' | 'body' | 'header' | 'footer' | 'buttons' | 'category';
  rule: string;
  message: string;
}

export interface ValidationWarning {
  field: 'name' | 'body' | 'header' | 'footer' | 'buttons' | 'category';
  rule: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 quality score
}

interface TemplateInput {
  name: string;
  category: string;
  language: string;
  header_type?: string;
  header_content?: string;
  body_text: string;
  footer_text?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
}

const URL_SHORTENERS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'short.io'];
const SPAM_TRIGGER_WORDS = ['free', 'discount', 'offer', 'promo', 'deal', 'sale', 'limited time', 'act now', 'buy now', 'click here'];

function extractVariableIndices(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g);
  const set = new Set<number>();
  for (const m of matches) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

function hasAllCaps(text: string): boolean {
  // Check for ALL CAPS words (3+ chars) that aren't common acronyms
  const words = text.split(/\s+/);
  const commonAcronyms = new Set(['OTP', 'PIN', 'URL', 'SMS', 'API', 'ID', 'CRM', 'CEO', 'COD', 'NGN', 'USD']);
  return words.some(w => w.length >= 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w) && !commonAcronyms.has(w));
}

function hasExcessivePunctuation(text: string): boolean {
  return /[!]{2,}|[?]{2,}|[.]{4,}/.test(text);
}

function containsUrlShortener(text: string): boolean {
  const lower = text.toLowerCase();
  return URL_SHORTENERS.some(s => lower.includes(s));
}

export function validateTemplate(template: TemplateInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let score = 100;

  // === NAME VALIDATION ===
  if (!template.name) {
    errors.push({ field: 'name', rule: 'required', message: 'Template name is required.' });
  } else {
    if (!/^[a-z0-9_]{1,512}$/.test(template.name)) {
      errors.push({
        field: 'name',
        rule: 'format',
        message: 'Name must use only lowercase letters, digits, and underscores (1-512 chars). No spaces allowed.',
      });
    }
    if (template.name.length > 512) {
      errors.push({ field: 'name', rule: 'max_length', message: 'Name exceeds 512 characters.' });
    }
  }

  // === BODY VALIDATION ===
  if (!template.body_text?.trim()) {
    errors.push({ field: 'body', rule: 'required', message: 'Body text is required.' });
  } else {
    if (template.body_text.length > 1024) {
      errors.push({
        field: 'body',
        rule: 'max_length',
        message: `Body text exceeds 1024 chars (got ${template.body_text.length}).`,
      });
    }

    const bodyVars = extractVariableIndices(template.body_text);
    for (let i = 0; i < bodyVars.length; i++) {
      if (bodyVars[i] !== i + 1) {
        errors.push({
          field: 'body',
          rule: 'sequential_variables',
          message: `Variables must be sequential: {{1}}, {{2}}, etc. Found: ${bodyVars.map(n => `{{${n}}}`).join(', ')}.`,
        });
        break;
      }
    }

    if (hasAllCaps(template.body_text)) {
      warnings.push({
        field: 'body',
        rule: 'all_caps',
        message: 'Avoid ALL CAPS words — Meta may reject templates with excessive capitalization.',
        suggestion: 'Use sentence case or title case instead.',
      });
      score -= 10;
    }

    if (hasExcessivePunctuation(template.body_text)) {
      warnings.push({
        field: 'body',
        rule: 'excessive_punctuation',
        message: 'Avoid excessive punctuation (!!!, ???) — it triggers spam filters.',
        suggestion: 'Use single punctuation marks.',
      });
      score -= 10;
    }

    if (containsUrlShortener(template.body_text)) {
      warnings.push({
        field: 'body',
        rule: 'url_shortener',
        message: 'URL shorteners (bit.ly, tinyurl, etc.) are often rejected by Meta.',
        suggestion: 'Use the full URL or your own branded domain.',
      });
      score -= 15;
    }
  }

  // === HEADER VALIDATION ===
  if (template.header_type === 'text' && template.header_content) {
    if (template.header_content.length > 60) {
      errors.push({
        field: 'header',
        rule: 'max_length',
        message: `Header text exceeds 60 chars (got ${template.header_content.length}).`,
      });
    }
    const headerVars = extractVariableIndices(template.header_content);
    if (headerVars.length > 1) {
      errors.push({
        field: 'header',
        rule: 'max_variables',
        message: 'Text header supports at most one variable ({{1}}).',
      });
    }
  }

  // === FOOTER VALIDATION ===
  if (template.footer_text) {
    if (template.footer_text.length > 60) {
      errors.push({
        field: 'footer',
        rule: 'max_length',
        message: `Footer text exceeds 60 chars (got ${template.footer_text.length}).`,
      });
    }
    if (extractVariableIndices(template.footer_text).length > 0) {
      errors.push({
        field: 'footer',
        rule: 'no_variables',
        message: 'Footer text cannot contain {{N}} variables.',
      });
    }
  }

  // === BUTTON VALIDATION ===
  if (template.buttons && template.buttons.length > 0) {
    if (template.buttons.length > 3) {
      errors.push({
        field: 'buttons',
        rule: 'max_count',
        message: `Maximum 3 buttons allowed (got ${template.buttons.length}).`,
      });
    }
    for (let i = 0; i < template.buttons.length; i++) {
      const btn = template.buttons[i];
      if (btn.text && btn.text.length > 25) {
        errors.push({
          field: 'buttons',
          rule: 'text_max_length',
          message: `Button #${i + 1} text exceeds 25 chars.`,
        });
      }
      if (btn.type === 'URL' && btn.url) {
        try {
          new URL(btn.url);
        } catch {
          errors.push({
            field: 'buttons',
            rule: 'invalid_url',
            message: `Button #${i + 1} has an invalid URL.`,
          });
        }
      }
    }
  }

  // === CATEGORY-SPECIFIC RULES ===
  const categoryUpper = template.category?.toUpperCase() || '';

  if (categoryUpper === 'MARKETING' && template.body_text) {
    const firstLine = template.body_text.split('\n')[0].toLowerCase();
    const foundTriggers = SPAM_TRIGGER_WORDS.filter(w => firstLine.includes(w));
    if (foundTriggers.length > 0) {
      warnings.push({
        field: 'category',
        rule: 'marketing_spam_trigger',
        message: `First line contains spam trigger words: ${foundTriggers.join(', ')}. This may cause rejection.`,
        suggestion: 'Move promotional language to the body, not the opening line.',
      });
      score -= 10;
    }
  }

  if (categoryUpper === 'AUTHENTICATION' && template.body_text) {
    if (!template.body_text.includes('{{1}}')) {
      errors.push({
        field: 'category',
        rule: 'auth_otp_required',
        message: 'Authentication templates must contain {{1}} for the OTP code.',
      });
    }
  }

  if (categoryUpper === 'UTILITY' && template.body_text) {
    const lower = template.body_text.toLowerCase();
    const hasTransactionalRef = ['order', 'transaction', 'payment', 'delivery', 'shipment', 'booking', 'appointment', 'receipt', 'invoice', 'confirmation', 'update', 'status', 'account'].some(w => lower.includes(w));
    if (!hasTransactionalRef) {
      warnings.push({
        field: 'category',
        rule: 'utility_context',
        message: 'Utility templates should reference a transaction, order, or account update.',
        suggestion: 'Include context like order number, delivery status, or account update.',
      });
      score -= 5;
    }
  }

  // Deduct for errors
  score = errors.length > 0 ? 0 : Math.max(0, score);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score,
  };
}
