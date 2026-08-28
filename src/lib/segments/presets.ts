/**
 * Pre-built segment templates for common business use cases.
 *
 * Each template provides ready-to-use segment rules that users can
 * apply with one click instead of building rules from scratch.
 */

export interface SegmentTemplate {
  id: string
  name: string
  icon: string
  description: string
  category: 'engagement' | 'lifecycle' | 'value' | 'industry'
  rules: SegmentRule[]
}

export interface SegmentRule {
  field: string
  operator: string
  value: string | number | boolean
}

export const SEGMENT_TEMPLATES: SegmentTemplate[] = [
  // ── Engagement Segments ────────────────────────────────────
  {
    id: 'active_last_30',
    name: 'Active Last 30 Days',
    icon: '⚡',
    description: 'Contacts who interacted within the last 30 days',
    category: 'engagement',
    rules: [
      { field: 'last_interaction_at', operator: 'within_days', value: 30 },
    ],
  },
  {
    id: 'dormant_60_plus',
    name: 'Dormant 60+ Days',
    icon: '💤',
    description: 'Contacts with no interaction for over 60 days',
    category: 'engagement',
    rules: [
      { field: 'last_interaction_at', operator: 'older_than_days', value: 60 },
    ],
  },
  {
    id: 'dormant_90_plus',
    name: 'Dormant 90+ Days',
    icon: '❄️',
    description: 'Contacts with no interaction for over 90 days — reactivation candidates',
    category: 'engagement',
    rules: [
      { field: 'last_interaction_at', operator: 'older_than_days', value: 90 },
    ],
  },
  {
    id: 'never_responded',
    name: 'Never Responded',
    icon: '🚫',
    description: 'Contacts who received messages but never replied',
    category: 'engagement',
    rules: [
      { field: 'messages_received', operator: 'greater_than', value: 0 },
      { field: 'messages_sent', operator: 'equals', value: 0 },
    ],
  },
  {
    id: 'highly_engaged',
    name: 'Highly Engaged',
    icon: '🔥',
    description: 'Contacts with 5+ interactions in the last 30 days',
    category: 'engagement',
    rules: [
      { field: 'interaction_count_30d', operator: 'greater_than', value: 5 },
    ],
  },

  // ── Lifecycle Segments ─────────────────────────────────────
  {
    id: 'new_contacts_7d',
    name: 'New This Week',
    icon: '🆕',
    description: 'Contacts added in the last 7 days',
    category: 'lifecycle',
    rules: [
      { field: 'created_at', operator: 'within_days', value: 7 },
    ],
  },
  {
    id: 'new_contacts_30d',
    name: 'New This Month',
    icon: '📅',
    description: 'Contacts added in the last 30 days',
    category: 'lifecycle',
    rules: [
      { field: 'created_at', operator: 'within_days', value: 30 },
    ],
  },
  {
    id: 'has_email',
    name: 'Has Email Address',
    icon: '📧',
    description: 'Contacts with a valid email for multi-channel outreach',
    category: 'lifecycle',
    rules: [
      { field: 'email', operator: 'is_not_empty', value: true },
    ],
  },
  {
    id: 'missing_email',
    name: 'Missing Email',
    icon: '⚠️',
    description: 'Contacts without email — collect during next interaction',
    category: 'lifecycle',
    rules: [
      { field: 'email', operator: 'is_empty', value: true },
    ],
  },
  {
    id: 'opted_out',
    name: 'Opted Out',
    icon: '🛑',
    description: 'Contacts who opted out of communications',
    category: 'lifecycle',
    rules: [
      { field: 'opted_out', operator: 'equals', value: true },
    ],
  },

  // ── Value Segments ────────────────────────────────────────
  {
    id: 'high_value',
    name: 'High-Value Customers',
    icon: '💎',
    description: 'Customers with total purchases above average',
    category: 'value',
    rules: [
      { field: 'total_purchase_value', operator: 'greater_than', value: 100000 },
    ],
  },
  {
    id: 'repeat_buyers',
    name: 'Repeat Buyers',
    icon: '🔄',
    description: 'Customers with 2+ purchases',
    category: 'value',
    rules: [
      { field: 'purchase_count', operator: 'greater_than', value: 1 },
    ],
  },
  {
    id: 'one_time_buyers',
    name: 'One-Time Buyers',
    icon: '1️⃣',
    description: 'Customers who bought once but never returned',
    category: 'value',
    rules: [
      { field: 'purchase_count', operator: 'equals', value: 1 },
      { field: 'last_purchase_at', operator: 'older_than_days', value: 60 },
    ],
  },
  {
    id: 'at_risk',
    name: 'At-Risk Customers',
    icon: '🚨',
    description: 'Previously active buyers who have gone quiet',
    category: 'value',
    rules: [
      { field: 'purchase_count', operator: 'greater_than', value: 0 },
      { field: 'last_interaction_at', operator: 'older_than_days', value: 45 },
    ],
  },

  // ── Industry-Specific Segments ────────────────────────────
  {
    id: 'birthday_this_month',
    name: 'Birthday This Month',
    icon: '🎂',
    description: 'Contacts with birthdays this month — send special offers',
    category: 'industry',
    rules: [
      { field: 'birthday_month', operator: 'equals', value: 'current_month' },
    ],
  },
  {
    id: 'location_lagos',
    name: 'Lagos Contacts',
    icon: '📍',
    description: 'Contacts located in Lagos',
    category: 'industry',
    rules: [
      { field: 'city', operator: 'equals', value: 'Lagos' },
    ],
  },
  {
    id: 'location_abuja',
    name: 'Abuja Contacts',
    icon: '📍',
    description: 'Contacts located in Abuja',
    category: 'industry',
    rules: [
      { field: 'city', operator: 'equals', value: 'Abuja' },
    ],
  },
  {
    id: 'vip_customers',
    name: 'VIP Customers',
    icon: '⭐',
    description: 'Top customers by purchase value and frequency',
    category: 'value',
    rules: [
      { field: 'purchase_count', operator: 'greater_than', value: 3 },
      { field: 'total_purchase_value', operator: 'greater_than', value: 500000 },
    ],
  },
]

export function getSegmentTemplate(id: string): SegmentTemplate | undefined {
  return SEGMENT_TEMPLATES.find((t) => t.id === id)
}

export function getSegmentTemplatesByCategory(
  category: SegmentTemplate['category']
): SegmentTemplate[] {
  return SEGMENT_TEMPLATES.filter((t) => t.category === category)
}
