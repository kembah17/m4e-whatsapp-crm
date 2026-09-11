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
          text: 'Hi! We hope you enjoyed your experience with us. Could you take a moment to rate our service? Your feedback helps us serve you better. Reply with a number from 1 (poor) to 5 (excellent).',
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
    description: 'Re-engage contacts who have been inactive for 60+ days with a personalised message.',
    trigger_type: 'time_based',
    trigger_config: { delay_days: 60, condition: 'no_interaction' },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: 'Hello! It has been a while since we heard from you. We have some exciting new offers and updates. Would you like to hear about them? Reply YES to get started!',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
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
          text: 'Thank you for reaching out! A team member has been assigned to assist you and will respond shortly.',
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

}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
