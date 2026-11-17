export interface TemplatePreset {
  name: string;
  category: 'Marketing' | 'Utility';
  language: string;
  body_text: string;
  header_type?: 'text';
  header_content?: string;
  footer_text?: string;
  buttons?: { type: 'QUICK_REPLY'; text: string }[];
}

export const STARTER_TEMPLATE_PRESETS: TemplatePreset[] = [
  // ── Utility Templates ──────────────────────────────────
  {
    name: 'welcome_new_customer',
    category: 'Utility',
    language: 'en_US',
    header_type: 'text',
    header_content: 'Welcome to {{1}}!',
    body_text: 'Hello {{1}}, thank you for choosing us! We\'re excited to serve you. If you have any questions, simply reply to this message and our team will assist you promptly.',
    footer_text: 'Reply STOP to opt out',
  },
  {
    name: 'order_confirmation',
    category: 'Utility',
    language: 'en_US',
    header_type: 'text',
    header_content: 'Order Confirmed ✅',
    body_text: 'Hi {{1}}, your order #{{2}} has been confirmed! Expected delivery: {{3}}. We\'ll keep you updated on the progress.',
    footer_text: 'Reply for support',
    buttons: [{ type: 'QUICK_REPLY', text: 'Track Order' }],
  },
  {
    name: 'appointment_reminder',
    category: 'Utility',
    language: 'en_US',
    header_type: 'text',
    header_content: 'Appointment Reminder',
    body_text: 'Hi {{1}}, this is a reminder about your appointment on {{2}} at {{3}}. Please reply to confirm or reschedule.',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm' },
      { type: 'QUICK_REPLY', text: 'Reschedule' },
    ],
  },
  {
    name: 'payment_received',
    category: 'Utility',
    language: 'en_US',
    header_type: 'text',
    header_content: 'Payment Received 💰',
    body_text: 'Hi {{1}}, we\'ve received your payment of {{2}}. Transaction reference: {{3}}. Thank you for your prompt payment!',
    footer_text: 'Keep this for your records',
  },
  {
    name: 'delivery_update',
    category: 'Utility',
    language: 'en_US',
    header_type: 'text',
    header_content: 'Delivery Update 🚚',
    body_text: 'Hi {{1}}, your order is {{2}}. {{3}}',
    buttons: [{ type: 'QUICK_REPLY', text: 'Contact Support' }],
  },
  {
    name: 'feedback_request',
    category: 'Utility',
    language: 'en_US',
    body_text: 'Hi {{1}}, we hope you enjoyed your recent experience with us! We\'d love to hear your feedback. How would you rate our service?',
    buttons: [
      { type: 'QUICK_REPLY', text: '⭐ Excellent' },
      { type: 'QUICK_REPLY', text: '👍 Good' },
      { type: 'QUICK_REPLY', text: '👎 Needs Work' },
    ],
  },

  // ── Marketing Templates ────────────────────────────────
  {
    name: 'special_offer',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: '🎉 Special Offer!',
    body_text: 'Hi {{1}}, we have an exclusive offer just for you! {{2}}. This offer is valid until {{3}}. Don\'t miss out!',
    footer_text: 'Reply STOP to opt out',
    buttons: [{ type: 'QUICK_REPLY', text: 'Tell Me More' }],
  },
  {
    name: 'new_product_launch',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: '🆕 New Arrival!',
    body_text: 'Hi {{1}}, exciting news! We\'ve just launched {{2}}. Be among the first to check it out. {{3}}',
    footer_text: 'Reply STOP to opt out',
    buttons: [{ type: 'QUICK_REPLY', text: 'Learn More' }],
  },
  {
    name: 'seasonal_promotion',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: '🎊 {{1}} Sale!',
    body_text: 'Hi {{2}}, our {{1}} sale is here! Enjoy up to {{3}} off selected items. Visit us today or shop online. Offer ends {{4}}.',
    footer_text: 'Reply STOP to opt out',
    buttons: [{ type: 'QUICK_REPLY', text: 'Shop Now' }],
  },
  {
    name: 'customer_reactivation',
    category: 'Marketing',
    language: 'en_US',
    body_text:
      'Hi {{1}}, we miss you! It\'s been a while since your last visit. We\'d love to welcome you back with a special {{2}} discount on your next purchase. Valid for {{3}} days.',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Claim Offer' },
      { type: 'QUICK_REPLY', text: 'Not Interested' },
    ],
  },

  // ── Reactivation Sequence Templates (5-phase win-back) ─────
  {
    name: 'reactivation_checkin',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: 'We miss you!',
    body_text:
      '{{1}}, still thinking about {{2}}? It\'s been a while and we\'d love to reconnect. We\'ve made some exciting improvements since your last visit.',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Tell Me More' },
      { type: 'QUICK_REPLY', text: 'Not Now' },
    ],
  },
  {
    name: 'reactivation_value',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: 'What changed since you last visited',
    body_text:
      'Hi {{1}}, since you\'ve been away, customers like you have been enjoying {{2}}. Here\'s what\'s new: {{3}}. We think you\'ll love it.',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Show Me' },
      { type: 'QUICK_REPLY', text: 'No Thanks' },
    ],
  },
  {
    name: 'reactivation_offer',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: 'A quick question, {{1}}',
    body_text:
      'We\'d love to welcome you back with something special: {{2}}. This is exclusively for returning customers and expires in exactly 7 days. Reply CLAIM to activate your offer.',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Claim Now' },
      { type: 'QUICK_REPLY', text: 'Not Interested' },
    ],
  },
  {
    name: 'reactivation_urgency',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: 'Your offer expires soon',
    body_text:
      'Hi {{1}}, your exclusive offer expires in {{2}}. We don\'t want you to miss out on {{3}}. This is your last chance to claim it.',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Claim Before Expiry' },
      { type: 'QUICK_REPLY', text: 'Let It Go' },
    ],
  },
  {
    name: 'reactivation_sunset',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: 'This is our last message to you',
    body_text:
      'Hi {{1}}, we respect your time and don\'t want to send messages you don\'t find useful. This is our final message. Reply STAY to keep hearing from us, or we\'ll remove you from our list. Either way, we wish you all the best!',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Stay' },
      { type: 'QUICK_REPLY', text: 'Remove Me' },
    ],
  },
  {
    name: 'referral_request',
    category: 'Marketing',
    language: 'en_US',
    body_text: 'Hi {{1}}, thank you for being a valued customer! Know someone who could benefit from our services? Refer a friend and you both get {{2}}. Simply share our contact or reply with their name.',
    footer_text: 'Reply STOP to opt out',
    buttons: [{ type: 'QUICK_REPLY', text: 'Refer a Friend' }],
  },
  {
    name: 'event_invitation',
    category: 'Marketing',
    language: 'en_US',
    header_type: 'text',
    header_content: '📅 You\'re Invited!',
    body_text: 'Hi {{1}}, you\'re invited to {{2}} on {{3}}. {{4}}. We\'d love to see you there!',
    footer_text: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Count Me In' },
      { type: 'QUICK_REPLY', text: 'More Details' },
    ],
  },
];
