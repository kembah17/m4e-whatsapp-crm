import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'
  // Industry workflow bundle automations
  | 'payment_reminder'
  | 'delivery_notification'
  | 'appointment_reminder_24h'
  | 'review_request'
  | 'dormant_reactivation'
  | 'new_enquiry_auto_assign'
  | 'vip_alert'
  | 'overdue_payment_escalation'
  | 'booking_confirmation'
  | 'post_checkout_feedback'
  | 'sunset_campaign'
  // Churn archetype campaign templates
  | 'churn_product_fit'
  | 'churn_price_objection'
  | 'churn_competitor'
  // Human-in-the-loop escalation
  | 'high_value_escalation'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Index (within this seed list) of the Condition parent, if nested. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

export const AUTOMATION_TEMPLATES: Record<TemplateSlug, AutomationTemplateDefinition> = {
  welcome_message: {
    slug: 'welcome_message',
    name: 'Welcome Message',
    description: 'Auto-reply to first-time contacts with a greeting.',
    // first_inbound_message (added in PR #33) catches both brand-new
    // contacts AND manually-added/imported contacts on their first-ever
    // reply, which is what a user setting up a "welcome" automation
    // almost always wants. new_contact_created would miss the
    // manually-imported case.
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi! 👋 Thanks for reaching out. We'll get back to you shortly.",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },
  out_of_office: {
    slug: 'out_of_office',
    name: 'Out of Office',
    description: 'Auto-reply during off-hours so nobody is left waiting.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-09:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Thanks for your message! Our team is offline right now (9am–6pm) and will reply first thing tomorrow.",
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  lead_qualifier: {
    slug: 'lead_qualifier',
    name: 'Lead Qualifier',
    description: 'Ask qualification questions to filter inbound leads.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['pricing', 'quote', 'buy'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Great — happy to help with pricing! Quick question: roughly how many seats are you looking for?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 10, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  follow_up_reminder: {
    slug: 'follow_up_reminder',
    name: 'Follow-up Reminder',
    description: 'Send a nudge if a contact has not replied within 24 hours.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Just circling back — did you have any other questions for us? Happy to help!",
        },
      },
    ],
  },

  // ── Industry Workflow Bundle Automations ────────────────────

  payment_reminder: {
    slug: 'payment_reminder',
    name: 'Payment Reminder',
    description: 'Send a reminder when a payment has been pending for 24 hours. Ideal for invoices, school fees, or order payments.',
    trigger_type: 'time_based',
    trigger_config: { delay_hours: 24, condition: 'deal_stage_is_payment_pending' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'Hi! Just a friendly reminder that your payment is still pending. Please complete your transfer and share the receipt so we can process your order. Thank you!',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },

  delivery_notification: {
    slug: 'delivery_notification',
    name: 'Delivery Notification',
    description: 'Notify the customer when their order has been dispatched for delivery with rider details.',
    trigger_type: 'tag_added',
    trigger_config: { tag: 'dispatched' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'Great news! Your order has been dispatched and is on its way. Our delivery rider will contact you shortly. Please ensure someone is available to receive it.',
        },
      },
    ],
  },

  appointment_reminder_24h: {
    slug: 'appointment_reminder_24h',
    name: 'Appointment Reminder (24h)',
    description: 'Send a reminder 24 hours before a scheduled appointment, consultation, or site visit.',
    trigger_type: 'time_based',
    trigger_config: { delay_hours: -24, condition: 'appointment_scheduled' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'Hello! This is a reminder that you have an appointment with us tomorrow. Please confirm your attendance by replying YES or let us know if you need to reschedule.',
        },
      },
    ],
  },

  review_request: {
    slug: 'review_request',
    name: 'Review Request',
    description: 'Ask for a review or rating 24 hours after successful delivery or service completion.',
    trigger_type: 'tag_added',
    trigger_config: { tag: 'delivered' },
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: 'Hi! How was your experience with us? Reply with a number from 1 (poor) to 5 (excellent) — your feedback helps us improve.',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },

  dormant_reactivation: {
    slug: 'dormant_reactivation',
    name: 'Dormant Contact Reactivation',
    description:
      'Re-engage contacts inactive for 60+ days with a proven 5-phase win-back sequence: check-in → value reminder → limited-time offer → urgency → sunset.',
    trigger_type: 'time_based',
    trigger_config: { delay_days: 60, condition: 'no_interaction' },
    steps: [
      // ── Phase 1 (Day 0): Personalised check-in ──────────────
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}, we noticed it's been a while since we last connected. We hope all is well! We've made some improvements we think you'll love. Would you like to hear what's new?",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' }, // tag: reactivation-started
      },
      // ── Check if contact replied → stop if yes ─────────────
      {
        step_type: 'wait',
        step_config: { amount: 3, unit: 'days' },
      },
      {
        step_type: 'condition',
        step_config: {
          subject: 'message_content',
          operand: '', // any reply from contact
        },
      },
      // Branch YES → contact replied, stop sequence
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' }, // tag: reactivation-replied
        parent_index: 3,
        branch: 'yes',
      },
      // Branch NO → no reply, continue to Phase 2
      // ── Phase 2 (Day 3): Value reminder ─────────────────────
      {
        step_type: 'send_message',
        step_config: {
          text: "Since your last visit, we've added new features and services that other customers are already benefiting from. Here's what you're missing out on — reply HELLO to get a quick update.",
        },
        parent_index: 3,
        branch: 'no',
      },
      // ── Phase 3 (Day 7): Limited-time win-back offer ────────
      {
        step_type: 'wait',
        step_config: { amount: 4, unit: 'days' },
        parent_index: 3,
        branch: 'no',
      },
      {
        step_type: 'send_message',
        step_config: {
          text: "We'd love to welcome you back! As a valued customer, here's an exclusive offer just for you — valid for the next 7 days only. Reply OFFER to claim it before it expires.",
        },
        parent_index: 3,
        branch: 'no',
      },
      // ── Phase 4 (Day 10): Urgency reminder ──────────────────
      {
        step_type: 'wait',
        step_config: { amount: 3, unit: 'days' },
        parent_index: 3,
        branch: 'no',
      },
      {
        step_type: 'send_message',
        step_config: {
          text: "Just a heads-up — your exclusive offer expires in 4 days. We don't want you to miss out. Reply OFFER to claim it now.",
        },
        parent_index: 3,
        branch: 'no',
      },
      // ── Phase 5 (Day 14): Sunset — binary choice ────────────
      {
        step_type: 'wait',
        step_config: { amount: 4, unit: 'days' },
        parent_index: 3,
        branch: 'no',
      },
      {
        step_type: 'send_message',
        step_config: {
          text: "This is our last message to you. We respect your time and don't want to send messages you don't find useful. Reply STAY to keep hearing from us, or we'll remove you from our list. Either way, we wish you all the best!",
        },
        parent_index: 3,
        branch: 'no',
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' }, // tag: reactivation-sunset
        parent_index: 3,
        branch: 'no',
      },
    ],
  },

  new_enquiry_auto_assign: {
    slug: 'new_enquiry_auto_assign',
    name: 'Auto-Assign New Enquiries',
    description: 'Automatically assign new enquiries to team members using round-robin distribution.',
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: 'Thanks for reaching out! A team member has been assigned and will respond shortly.',
        },
      },
    ],
  },

  vip_alert: {
    slug: 'vip_alert',
    name: 'VIP Customer Alert',
    description: 'Alert the business owner or manager when a high-value VIP customer sends a message.',
    trigger_type: 'tag_added',
    trigger_config: { tag: 'vip' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'VIP ALERT: A high-value customer has just messaged. Please prioritise this conversation.',
        },
      },
    ],
  },

  overdue_payment_escalation: {
    slug: 'overdue_payment_escalation',
    name: 'Overdue Payment Escalation',
    description: 'Escalate payments that are overdue by 7+ days with a firmer reminder and internal notification.',
    trigger_type: 'time_based',
    trigger_config: { delay_days: 7, condition: 'payment_overdue' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'Hello. This is a reminder that your payment of the outstanding balance is now 7 days overdue. Please arrange payment at your earliest convenience to avoid any service disruption. If you have already paid, kindly share your payment receipt.',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },

  booking_confirmation: {
    slug: 'booking_confirmation',
    name: 'Booking Confirmation',
    description: 'Send an automatic confirmation when a booking, reservation, or appointment is confirmed.',
    trigger_type: 'tag_added',
    trigger_config: { tag: 'booking-confirmed' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'Your booking has been confirmed! We look forward to seeing you. If you need to make any changes, please let us know at least 24 hours in advance.',
        },
      },
    ],
  },

  post_checkout_feedback: {
    slug: 'post_checkout_feedback',
    name: 'Post-Checkout Feedback',
    description: 'Request feedback after a hotel checkout, event completion, or service delivery.',
    trigger_type: 'tag_added',
    trigger_config: { tag: 'checked-out' },
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 2, unit: 'hours' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: 'Thank you for choosing us! We hope you had a wonderful experience. We would love to hear your feedback. What did you enjoy most, and is there anything we could improve?',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },

  sunset_campaign: {
    slug: 'sunset_campaign',
    name: 'Sunset Campaign',
    description:
      'Gracefully remove unresponsive contacts who completed the full 5-phase reactivation sequence without responding. Gives a final 48-hour window before marking as churned.',
    trigger_type: 'tag_added',
    trigger_config: { tag: 'reactivation-sunset' },
    steps: [
      // Wait 7 days after reactivation phase 5
      {
        step_type: 'wait',
        step_config: { amount: 7, unit: 'days' },
      },
      // Send final removal notice
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}, we have not heard from you in a while and we respect your time. We are removing you from our messaging list. If you would like to stay connected, simply reply STAY within 48 hours and we will keep you on our list. We wish you all the best!",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' }, // tag: sunset_confirmed
      },
      // Wait 48 hours for reply
      {
        step_type: 'wait',
        step_config: { amount: 48, unit: 'hours' },
      },
      // Check if contact replied
      {
        step_type: 'condition',
        step_config: {
          subject: 'message_content',
          operand: '', // any reply
        },
      },
      // Branch YES: contact replied — save from sunset
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' }, // tag: saved_from_sunset
        parent_index: 4,
        branch: 'yes',
      },
      // Branch NO: no reply — mark as churned
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' }, // tag: churned
        parent_index: 4,
        branch: 'no',
      },
    ],
  },


  // ── Churn Archetype Campaign Templates ─────────────────────
  churn_product_fit: {
    slug: 'churn_product_fit',
    name: 'Churn Recovery: Product-Fit Drift',
    description: 'Product update announcement sequence for contacts who churned due to product-fit issues.',
    trigger_type: 'tag_added',
    trigger_config: { tag_id: '' }, // tag: churn_product_fit_drift
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}! 🚀 We have been busy building features our customers asked for. Here is what is new:\n\n✅ [Feature 1]\n✅ [Feature 2]\n✅ [Feature 3]\n\nWe would love to show you how these changes address the challenges you faced. Would you be open to a quick 10-minute walkthrough?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 3, unit: 'days' },
      },
      {
        step_type: 'condition',
        step_config: {
          subject: 'message_content',
          operand: '',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}, just following up on the product updates we shared. We have also added [specific improvement] based on feedback from customers like you. No pressure — just wanted to make sure you knew. Reply YES if you would like a demo!",
        },
        parent_index: 2,
        branch: 'no',
      },
    ],
  },

  churn_price_objection: {
    slug: 'churn_price_objection',
    name: 'Churn Recovery: Price Objection Win-Back',
    description: 'Limited-time win-back offer sequence for price-sensitive churned contacts.',
    trigger_type: 'tag_added',
    trigger_config: { tag_id: '' }, // tag: churn_price_objection
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}! 💰 We value the relationship we built and want to make things work. For the next 7 days, we are offering a special returning-customer rate:\n\n🎁 [X]% off your first 3 months back\n\nThis is our way of saying we appreciate you. Interested? Just reply YES and we will set it up.",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 3, unit: 'days' },
      },
      {
        step_type: 'condition',
        step_config: {
          subject: 'message_content',
          operand: '',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}, just a reminder — your special returning-customer offer expires in 4 days. We have also introduced a new flexible plan that might be a better fit for your budget. Want to hear about it?",
        },
        parent_index: 2,
        branch: 'no',
      },
    ],
  },

  churn_competitor: {
    slug: 'churn_competitor',
    name: 'Churn Recovery: Competitor Win-Back',
    description: 'Value reminder + direct outreach sequence for contacts lost to competitors.',
    trigger_type: 'tag_added',
    trigger_config: { tag_id: '' }, // tag: churn_competitor_poaching
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi {{name}}! We noticed you have been exploring other options and we completely understand. Before you make a final decision, here is what makes us different:\n\n🔒 [Unique value prop 1]\n📊 [Unique value prop 2]\n🤝 [Unique value prop 3]\n\nWe would love 15 minutes to show you what we have been working on. No sales pitch — just an honest conversation. Interested?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 2, unit: 'days' },
      },
      {
        step_type: 'condition',
        step_config: {
          subject: 'message_content',
          operand: '',
        },
      },
      {
        step_type: 'assign_conversation',
        step_config: {
          mode: 'round_robin' as const,
          escalation_context: true,
        } as Record<string, unknown>,
        parent_index: 2,
        branch: 'no',
      },
    ],
  },

  // ── Human-in-the-Loop Escalation ───────────────────────────
  high_value_escalation: {
    slug: 'high_value_escalation',
    name: 'High-Value Contact Escalation',
    description: 'Auto-assign dormant high-value contacts to account owner with context briefing.',
    trigger_type: 'contact_updated',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'contact_field',
          operand: 'total_spent',
          value: '>500000',
        },
      },
      {
        step_type: 'assign_conversation',
        step_config: {
          assign_to: 'account_owner',
          escalation_context: true,
        } as Record<string, unknown>,
        branch: 'yes',
        parent_index: 0,
      },
    ],
  },

}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
