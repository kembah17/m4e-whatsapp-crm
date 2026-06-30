// ============================================================
// Quick Reply Templates — built-in + custom quick replies
// ============================================================

export interface QuickReply {
  id: string
  title: string
  message: string
  category: string
  industry: string
  shortcut?: string
}

export const QUICK_REPLY_CATEGORIES = [
  'greeting',
  'closing',
  'faq',
  'pricing',
  'scheduling',
  'follow-up',
  'support',
  'general',
] as const

export type QuickReplyCategory = (typeof QUICK_REPLY_CATEGORIES)[number]

export const QUICK_REPLY_TEMPLATES: QuickReply[] = [
  // ---- General (all industries) ----
  { id: 'gen-1', title: 'Welcome greeting', message: 'Hello! 👋 Thank you for reaching out. How can I help you today?', category: 'greeting', industry: 'general', shortcut: '/hi' },
  { id: 'gen-2', title: 'Thank you & close', message: "Thank you for your time! If you have any other questions, don't hesitate to reach out. Have a wonderful day! 😊", category: 'closing', industry: 'general', shortcut: '/thanks' },
  { id: 'gen-3', title: 'Business hours', message: "Our business hours are Monday to Friday, 9 AM – 6 PM, and Saturday 10 AM – 4 PM. We'll respond to your message as soon as we're back!", category: 'faq', industry: 'general', shortcut: '/hours' },
  { id: 'gen-4', title: 'Request callback', message: "I'd love to discuss this further. Could you share a convenient time for a quick call? 📞", category: 'scheduling', industry: 'general', shortcut: '/callback' },
  { id: 'gen-5', title: 'Follow-up check', message: 'Hi! Just checking in to see if you had any questions about our last conversation. We\'re here to help! 😊', category: 'follow-up', industry: 'general', shortcut: '/followup' },
  { id: 'gen-6', title: 'Send location', message: "Here's our address: [ADDRESS]. You can find us on Google Maps here: [LINK]. See you soon!", category: 'faq', industry: 'general', shortcut: '/location' },
  { id: 'gen-7', title: 'Payment info', message: 'We accept bank transfer, card payments, and cash. For bank transfer, here are our details:\n\nBank: [BANK]\nAccount: [NUMBER]\nName: [NAME]', category: 'pricing', industry: 'general', shortcut: '/pay' },
  { id: 'gen-8', title: 'Apology', message: 'We sincerely apologize for the inconvenience. Let me look into this right away and get back to you with a solution. 🙏', category: 'support', industry: 'general', shortcut: '/sorry' },
  { id: 'gen-9', title: 'On it', message: "Got it! I'm looking into this now and will get back to you shortly. 🔄", category: 'support', industry: 'general', shortcut: '/onit' },
  { id: 'gen-10', title: 'Referral ask', message: "We're glad you had a great experience! 🌟 If you know anyone who could benefit from our services, we'd appreciate a referral. Thank you!", category: 'closing', industry: 'general', shortcut: '/refer' },

  // ---- Retail ----
  { id: 'ret-1', title: 'Product availability', message: 'Let me check if that item is currently in stock. One moment please! 📦', category: 'faq', industry: 'retail', shortcut: '/stock' },
  { id: 'ret-2', title: 'Order status', message: 'I\'ll check your order status right away. Could you share your order number or the name used for the purchase?', category: 'support', industry: 'retail' },
  { id: 'ret-3', title: 'Delivery info', message: 'We deliver within Lagos in 1–2 business days and nationwide in 3–5 business days. Delivery fee depends on your location. 🚚', category: 'faq', industry: 'retail' },
  { id: 'ret-4', title: 'New arrivals', message: 'We just got new stock in! 🎉 Would you like me to send you photos of our latest arrivals?', category: 'follow-up', industry: 'retail' },
  { id: 'ret-5', title: 'Return policy', message: 'We accept returns within 7 days of purchase, provided the item is unused and in its original packaging. Would you like to start a return?', category: 'faq', industry: 'retail' },

  // ---- Restaurant ----
  { id: 'rest-1', title: 'Menu request', message: "Here's our menu! 🍽️ Would you like to place an order or make a reservation?", category: 'faq', industry: 'restaurant' },
  { id: 'rest-2', title: 'Reservation confirm', message: 'Your reservation is confirmed! 🎉\n\nDate: [DATE]\nTime: [TIME]\nGuests: [NUMBER]\n\nWe look forward to seeing you!', category: 'scheduling', industry: 'restaurant' },
  { id: 'rest-3', title: 'Order received', message: 'Your order has been received! 👨‍🍳 Estimated preparation time is [TIME] minutes. We\'ll notify you when it\'s ready.', category: 'support', industry: 'restaurant' },
  { id: 'rest-4', title: 'Delivery ETA', message: 'Your order is on its way! 🛵 Estimated delivery time: [TIME] minutes. Thank you for your patience!', category: 'support', industry: 'restaurant' },

  // ---- Healthcare ----
  { id: 'hc-1', title: 'Appointment booking', message: "I'd be happy to help you book an appointment. What date and time works best for you? Our available slots are [SLOTS].", category: 'scheduling', industry: 'healthcare' },
  { id: 'hc-2', title: 'Appointment reminder', message: 'This is a friendly reminder about your appointment:\n\nDate: [DATE]\nTime: [TIME]\nDoctor: [DOCTOR]\n\nPlease arrive 15 minutes early. See you then! 🏥', category: 'follow-up', industry: 'healthcare' },
  { id: 'hc-3', title: 'Lab results', message: 'Your lab results are ready. Please visit the clinic to collect them or schedule a consultation to discuss the findings with your doctor.', category: 'support', industry: 'healthcare' },

  // ---- Real Estate ----
  { id: 're-1', title: 'Property inquiry', message: "Thank you for your interest! 🏠 I'd love to share more details about this property. Would you prefer photos, a virtual tour, or an in-person viewing?", category: 'greeting', industry: 'real_estate' },
  { id: 're-2', title: 'Viewing schedule', message: "Great! Let's schedule a viewing. What dates and times work for you this week? I have availability on [DATES].", category: 'scheduling', industry: 'real_estate' },
  { id: 're-3', title: 'Price & terms', message: 'Here are the details:\n\nPrice: [PRICE]\nPayment plan: [PLAN]\nLocation: [LOCATION]\n\nWould you like to proceed with an inspection?', category: 'pricing', industry: 'real_estate' },

  // ---- Fashion ----
  { id: 'fash-1', title: 'Size guide', message: "Here's our size guide! 📏 Could you share your measurements (bust, waist, hips) so I can recommend the perfect fit?", category: 'faq', industry: 'fashion' },
  { id: 'fash-2', title: 'Custom order', message: "We'd love to create something special for you! ✨ Please share your preferred style, fabric, and any reference images. Turnaround time is typically [DAYS] days.", category: 'pricing', industry: 'fashion' },
  { id: 'fash-3', title: 'Ready to wear', message: 'This piece is ready to ship! 👗 Available sizes: [SIZES]. Which would you like?', category: 'faq', industry: 'fashion' },

  // ---- Beauty ----
  { id: 'bty-1', title: 'Service menu', message: "Here are our services and prices! 💅 Which treatment are you interested in? I'll check availability for you.", category: 'faq', industry: 'beauty' },
  { id: 'bty-2', title: 'Booking confirm', message: 'Your appointment is booked! ✨\n\nService: [SERVICE]\nDate: [DATE]\nTime: [TIME]\nStylist: [STYLIST]\n\nPlease arrive 10 minutes early.', category: 'scheduling', industry: 'beauty' },
  { id: 'bty-3', title: 'Aftercare tips', message: 'Thank you for visiting! 💖 Here are some aftercare tips to maintain your [SERVICE]:\n\n1. [TIP1]\n2. [TIP2]\n3. [TIP3]\n\nSee you next time!', category: 'closing', industry: 'beauty' },

  // ---- Education ----
  { id: 'edu-1', title: 'Course inquiry', message: 'Thank you for your interest in our programs! 🎓 Here are the details:\n\nCourse: [COURSE]\nDuration: [DURATION]\nFee: [FEE]\n\nWould you like to enroll?', category: 'faq', industry: 'education' },
  { id: 'edu-2', title: 'Class schedule', message: "Here's the schedule for [COURSE]:\n\nDays: [DAYS]\nTime: [TIME]\nStart date: [DATE]\n\nShall I reserve a spot for you?", category: 'scheduling', industry: 'education' },
  { id: 'edu-3', title: 'Certificate ready', message: 'Congratulations! 🎉 Your certificate for [COURSE] is ready for collection. Please visit our office with a valid ID.', category: 'follow-up', industry: 'education' },
]

/** Filter templates by industry — always includes 'general' */
export function getTemplatesForIndustry(industry: string): QuickReply[] {
  return QUICK_REPLY_TEMPLATES.filter(
    (t) => t.industry === 'general' || t.industry === industry
  )
}

/** Search templates by title or message content */
export function searchTemplates(templates: QuickReply[], query: string): QuickReply[] {
  const q = query.toLowerCase()
  return templates.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      (t.shortcut && t.shortcut.toLowerCase().includes(q))
  )
}
