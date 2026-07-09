import type { IndustryPreset, FunnelConfig, CustomIndustryWizardAnswers } from '@/types/funnel'

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: 'restaurant',
    name: 'Restaurant / Food',
    icon: '🍽️',
    description: 'Fast-moving, repeat customers, walk-in + delivery',
    channels: ['instagram_ads', 'facebook_ads', 'google_maps'],
    social_platforms: [
      { platform: 'instagram', posts_per_week: 5, content_types: ['reels', 'stories', 'carousel'], funnel_entry_point: 'link_in_bio' },
      { platform: 'facebook', posts_per_week: 3, content_types: ['posts', 'stories'], funnel_entry_point: 'ctwa_button' },
    ],
    nurture_length_days: 3,
    nurture_max_touchpoints: 3,
    close_mechanism: 'walk_in',
    dormancy_threshold_days: 30,
    report_frequency: 'weekly',
    avg_deal_value_range: '₦2,000 – ₦15,000',
  },
  {
    id: 'retail',
    name: 'Retail / E-Commerce',
    icon: '🛍️',
    description: 'Product-based, cart recovery, repeat purchases',
    channels: ['instagram_ads', 'facebook_ads', 'google_shopping', 'tiktok_ads'],
    social_platforms: [
      { platform: 'instagram', posts_per_week: 5, content_types: ['reels', 'stories', 'carousel', 'shop'], funnel_entry_point: 'shop_link' },
      { platform: 'tiktok', posts_per_week: 3, content_types: ['short_video'], funnel_entry_point: 'link_in_bio' },
    ],
    nurture_length_days: 7,
    nurture_max_touchpoints: 4,
    close_mechanism: 'hybrid',
    dormancy_threshold_days: 60,
    report_frequency: 'biweekly',
    avg_deal_value_range: '₦5,000 – ₦100,000',
  },
  {
    id: 'professional_services',
    name: 'Professional Services',
    icon: '💼',
    description: 'Consulting, legal, accounting — longer sales cycles',
    channels: ['google_ads', 'linkedin_ads', 'facebook_ads'],
    social_platforms: [
      { platform: 'linkedin', posts_per_week: 3, content_types: ['articles', 'posts', 'documents'], funnel_entry_point: 'website_link' },
      { platform: 'facebook', posts_per_week: 2, content_types: ['posts', 'videos'], funnel_entry_point: 'ctwa_button' },
    ],
    nurture_length_days: 21,
    nurture_max_touchpoints: 6,
    close_mechanism: 'booking',
    dormancy_threshold_days: 120,
    report_frequency: 'monthly',
    avg_deal_value_range: '₦100,000 – ₦5,000,000',
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    icon: '🏠',
    description: 'High-value, long cycle, relationship-driven',
    channels: ['facebook_ads', 'google_ads', 'instagram_ads'],
    social_platforms: [
      { platform: 'instagram', posts_per_week: 4, content_types: ['reels', 'carousel', 'stories'], funnel_entry_point: 'ctwa_button' },
      { platform: 'facebook', posts_per_week: 3, content_types: ['posts', 'videos', 'live'], funnel_entry_point: 'ctwa_button' },
    ],
    nurture_length_days: 45,
    nurture_max_touchpoints: 8,
    close_mechanism: 'bank_transfer',
    dormancy_threshold_days: 180,
    report_frequency: 'monthly',
    avg_deal_value_range: '₦5,000,000 – ₦500,000,000',
  },
  {
    id: 'health_beauty',
    name: 'Health & Beauty',
    icon: '💆',
    description: 'Appointment-based, repeat visits, referral-heavy',
    channels: ['instagram_ads', 'facebook_ads', 'google_maps'],
    social_platforms: [
      { platform: 'instagram', posts_per_week: 5, content_types: ['reels', 'stories', 'before_after'], funnel_entry_point: 'link_in_bio' },
      { platform: 'tiktok', posts_per_week: 3, content_types: ['short_video', 'tutorials'], funnel_entry_point: 'link_in_bio' },
    ],
    nurture_length_days: 5,
    nurture_max_touchpoints: 4,
    close_mechanism: 'booking',
    dormancy_threshold_days: 45,
    report_frequency: 'biweekly',
    avg_deal_value_range: '₦5,000 – ₦50,000',
  },
]

export const CUSTOM_PRESET_PLACEHOLDER: IndustryPreset = {
  id: 'custom',
  name: 'Custom',
  icon: '⚙️',
  description: 'Build your own funnel settings with our guided wizard',
  channels: [],
  social_platforms: [],
  nurture_length_days: 7,
  nurture_max_touchpoints: 4,
  close_mechanism: 'hybrid',
  dormancy_threshold_days: 60,
  report_frequency: 'biweekly',
  avg_deal_value_range: 'Varies',
}

export function generateConfigFromWizard(answers: CustomIndustryWizardAnswers): Partial<FunnelConfig> {
  // Sales cycle mapping
  const salesCycleMap: Record<string, { nurture_length_days: number; nurture_max_touchpoints: number }> = {
    same_day: { nurture_length_days: 3, nurture_max_touchpoints: 3 },
    '1_7_days': { nurture_length_days: 7, nurture_max_touchpoints: 4 },
    '1_4_weeks': { nurture_length_days: 14, nurture_max_touchpoints: 5 },
    '1_3_months': { nurture_length_days: 30, nurture_max_touchpoints: 6 },
    '3_plus_months': { nurture_length_days: 45, nurture_max_touchpoints: 8 },
  }

  // Transaction value mapping
  const transactionMap: Record<string, { max_discount_percent: number; escalate_after_unanswered: number }> = {
    under_10k: { max_discount_percent: 15, escalate_after_unanswered: 3 },
    '10k_100k': { max_discount_percent: 10, escalate_after_unanswered: 2 },
    '100k_1m': { max_discount_percent: 5, escalate_after_unanswered: 2 },
    '1m_10m': { max_discount_percent: 0, escalate_after_unanswered: 1 },
    over_10m: { max_discount_percent: 0, escalate_after_unanswered: 1 },
  }

  // Repeat frequency mapping
  const repeatMap: Record<string, { dormancy_threshold_days: number; report_frequency: string }> = {
    weekly: { dormancy_threshold_days: 30, report_frequency: 'weekly' },
    monthly: { dormancy_threshold_days: 60, report_frequency: 'biweekly' },
    quarterly: { dormancy_threshold_days: 120, report_frequency: 'monthly' },
    annually: { dormancy_threshold_days: 365, report_frequency: 'monthly' },
    one_time: { dormancy_threshold_days: 9999, report_frequency: 'monthly' },
  }

  const sc = salesCycleMap[answers.sales_cycle]
  const tx = transactionMap[answers.avg_transaction]
  const rp = repeatMap[answers.repeat_frequency]

  return {
    industry_preset: 'custom',
    channels: answers.customer_channels,
    nurture_length_days: sc.nurture_length_days,
    nurture_max_touchpoints: sc.nurture_max_touchpoints,
    escalate_after_unanswered: tx.escalate_after_unanswered,
    close_mechanism: answers.close_mechanism,
    max_discount_percent: tx.max_discount_percent,
    dormancy_threshold_days: rp.dormancy_threshold_days,
    report_frequency: rp.report_frequency,
    referral_enabled: answers.repeat_frequency !== 'one_time',
  }
}

export function applyPresetToConfig(preset: IndustryPreset): Partial<FunnelConfig> {
  return {
    industry_preset: preset.id,
    channels: preset.channels,
    social_platforms: preset.social_platforms,
    nurture_length_days: preset.nurture_length_days,
    nurture_max_touchpoints: preset.nurture_max_touchpoints,
    close_mechanism: preset.close_mechanism,
    dormancy_threshold_days: preset.dormancy_threshold_days,
    report_frequency: preset.report_frequency,
  }
}
