// ============================================================
// Industry-specific support category & SLA presets
// Tailored for Nigerian mid-market businesses
// ============================================================

export interface SupportCategoryPreset {
  name: string
  description: string
  icon: string
  color: string
}

export interface SupportIndustryPreset {
  industry: string
  label: string
  description: string
  categories: SupportCategoryPreset[]
  slaAdjustments?: {
    // Multiplier for default SLA times (0.5 = half the time, 2.0 = double)
    responseMultiplier: number
    resolutionMultiplier: number
  }
}

export const SUPPORT_INDUSTRY_PRESETS: SupportIndustryPreset[] = [
  {
    industry: 'retail',
    label: 'Retail & E-commerce',
    description: 'Product returns, order issues, stock inquiries',
    categories: [
      { name: 'Order Issue', description: 'Problems with orders, wrong items, missing items', icon: 'package', color: '#ef4444' },
      { name: 'Return & Exchange', description: 'Product returns, exchanges, and refunds', icon: 'refresh-cw', color: '#f59e0b' },
      { name: 'Product Inquiry', description: 'Questions about products, availability, pricing', icon: 'search', color: '#3b82f6' },
      { name: 'Delivery Issue', description: 'Late delivery, damaged goods, wrong address', icon: 'truck', color: '#8b5cf6' },
      { name: 'Payment Problem', description: 'Payment failures, overcharges, refund requests', icon: 'credit-card', color: '#ec4899' },
      { name: 'Stock Inquiry', description: 'Product availability and restock questions', icon: 'box', color: '#10b981' },
      { name: 'General Inquiry', description: 'General questions and information', icon: 'help-circle', color: '#6366f1' },
      { name: 'Complaint', description: 'Customer complaints and escalations', icon: 'alert-triangle', color: '#dc2626' },
    ],
    slaAdjustments: { responseMultiplier: 0.75, resolutionMultiplier: 0.75 },
  },
  {
    industry: 'restaurant',
    label: 'Restaurant & Food Service',
    description: 'Food quality, delivery, reservations',
    categories: [
      { name: 'Food Quality', description: 'Issues with food taste, temperature, or preparation', icon: 'utensils', color: '#ef4444' },
      { name: 'Order Problem', description: 'Wrong order, missing items, incorrect portions', icon: 'package', color: '#f59e0b' },
      { name: 'Delivery Issue', description: 'Late delivery, cold food, wrong address', icon: 'truck', color: '#8b5cf6' },
      { name: 'Reservation', description: 'Booking issues, cancellations, special requests', icon: 'calendar', color: '#3b82f6' },
      { name: 'Billing Issue', description: 'Overcharges, wrong bill, payment problems', icon: 'credit-card', color: '#ec4899' },
      { name: 'Hygiene Concern', description: 'Cleanliness and food safety concerns', icon: 'shield', color: '#dc2626' },
      { name: 'Feedback', description: 'General feedback and suggestions', icon: 'message-circle', color: '#10b981' },
    ],
    slaAdjustments: { responseMultiplier: 0.5, resolutionMultiplier: 0.5 },
  },
  {
    industry: 'healthcare',
    label: 'Healthcare & Pharmacy',
    description: 'Appointments, prescriptions, billing',
    categories: [
      { name: 'Appointment Issue', description: 'Scheduling, rescheduling, cancellations', icon: 'calendar', color: '#3b82f6' },
      { name: 'Prescription Query', description: 'Medication questions, refills, availability', icon: 'pill', color: '#10b981' },
      { name: 'Billing & Insurance', description: 'Bills, insurance claims, payment plans', icon: 'credit-card', color: '#f59e0b' },
      { name: 'Wait Time', description: 'Long wait times and delays', icon: 'clock', color: '#ef4444' },
      { name: 'Service Quality', description: 'Quality of care and service concerns', icon: 'heart', color: '#ec4899' },
      { name: 'Lab Results', description: 'Test results, reports, follow-ups', icon: 'file-text', color: '#8b5cf6' },
      { name: 'Emergency', description: 'Urgent medical concerns', icon: 'alert-circle', color: '#dc2626' },
      { name: 'General Inquiry', description: 'General health and service questions', icon: 'help-circle', color: '#6366f1' },
    ],
    slaAdjustments: { responseMultiplier: 0.5, resolutionMultiplier: 0.75 },
  },
  {
    industry: 'real_estate',
    label: 'Real Estate & Property',
    description: 'Property issues, maintenance, payments',
    categories: [
      { name: 'Maintenance Request', description: 'Repairs, plumbing, electrical issues', icon: 'wrench', color: '#ef4444' },
      { name: 'Rent & Payment', description: 'Rent payments, receipts, arrears', icon: 'credit-card', color: '#f59e0b' },
      { name: 'Property Viewing', description: 'Schedule viewings, property inquiries', icon: 'home', color: '#3b82f6' },
      { name: 'Lease Issue', description: 'Lease terms, renewals, disputes', icon: 'file-text', color: '#8b5cf6' },
      { name: 'Security Concern', description: 'Security issues, access problems', icon: 'shield', color: '#dc2626' },
      { name: 'Utility Problem', description: 'Water, electricity, waste management', icon: 'zap', color: '#ec4899' },
      { name: 'Complaint', description: 'Noise, neighbor disputes, facility issues', icon: 'alert-triangle', color: '#f97316' },
      { name: 'General Inquiry', description: 'General property and service questions', icon: 'help-circle', color: '#6366f1' },
    ],
    slaAdjustments: { responseMultiplier: 1.0, resolutionMultiplier: 1.5 },
  },
  {
    industry: 'professional_services',
    label: 'Professional Services',
    description: 'Consulting, legal, accounting services',
    categories: [
      { name: 'Service Delivery', description: 'Issues with service quality or timelines', icon: 'briefcase', color: '#3b82f6' },
      { name: 'Billing & Invoice', description: 'Invoice disputes, payment terms, receipts', icon: 'credit-card', color: '#f59e0b' },
      { name: 'Document Request', description: 'Reports, certificates, documentation needs', icon: 'file-text', color: '#8b5cf6' },
      { name: 'Appointment', description: 'Meeting scheduling and rescheduling', icon: 'calendar', color: '#10b981' },
      { name: 'Compliance Issue', description: 'Regulatory and compliance concerns', icon: 'shield', color: '#ef4444' },
      { name: 'Feedback', description: 'Service feedback and improvement suggestions', icon: 'message-circle', color: '#ec4899' },
      { name: 'General Inquiry', description: 'General questions about services', icon: 'help-circle', color: '#6366f1' },
    ],
    slaAdjustments: { responseMultiplier: 1.0, resolutionMultiplier: 1.0 },
  },
  {
    industry: 'education',
    label: 'Education & Training',
    description: 'Enrollment, courses, certificates',
    categories: [
      { name: 'Enrollment Issue', description: 'Registration, admission, class placement', icon: 'user-plus', color: '#3b82f6' },
      { name: 'Course Content', description: 'Curriculum questions, materials, resources', icon: 'book', color: '#8b5cf6' },
      { name: 'Payment & Fees', description: 'Tuition, fees, payment plans, refunds', icon: 'credit-card', color: '#f59e0b' },
      { name: 'Certificate Request', description: 'Certificates, transcripts, verification', icon: 'award', color: '#10b981' },
      { name: 'Schedule Issue', description: 'Class times, exam dates, calendar conflicts', icon: 'calendar', color: '#ec4899' },
      { name: 'Technical Problem', description: 'Online platform, login, access issues', icon: 'monitor', color: '#ef4444' },
      { name: 'General Inquiry', description: 'General questions about programs', icon: 'help-circle', color: '#6366f1' },
    ],
    slaAdjustments: { responseMultiplier: 1.0, resolutionMultiplier: 1.25 },
  },
  {
    industry: 'logistics',
    label: 'Logistics & Delivery',
    description: 'Shipments, tracking, warehouse issues',
    categories: [
      { name: 'Shipment Tracking', description: 'Package location, delivery status updates', icon: 'map-pin', color: '#3b82f6' },
      { name: 'Delayed Delivery', description: 'Late shipments and delivery delays', icon: 'clock', color: '#ef4444' },
      { name: 'Damaged Goods', description: 'Items damaged during transit', icon: 'alert-triangle', color: '#dc2626' },
      { name: 'Wrong Delivery', description: 'Wrong address, wrong items delivered', icon: 'x-circle', color: '#f59e0b' },
      { name: 'Pickup Request', description: 'Schedule pickups, collection issues', icon: 'truck', color: '#8b5cf6' },
      { name: 'Pricing & Quote', description: 'Shipping rates, quotes, billing', icon: 'credit-card', color: '#ec4899' },
      { name: 'Claims', description: 'Insurance claims, compensation requests', icon: 'file-text', color: '#f97316' },
      { name: 'General Inquiry', description: 'General logistics questions', icon: 'help-circle', color: '#6366f1' },
    ],
    slaAdjustments: { responseMultiplier: 0.5, resolutionMultiplier: 0.75 },
  },
  {
    industry: 'hospitality',
    label: 'Hospitality & Hotels',
    description: 'Bookings, room issues, guest services',
    categories: [
      { name: 'Booking Issue', description: 'Reservation problems, cancellations, modifications', icon: 'calendar', color: '#3b82f6' },
      { name: 'Room Problem', description: 'Room condition, amenities, maintenance', icon: 'home', color: '#ef4444' },
      { name: 'Service Quality', description: 'Staff service, response time, attitude', icon: 'star', color: '#f59e0b' },
      { name: 'Billing Issue', description: 'Charges, receipts, payment disputes', icon: 'credit-card', color: '#ec4899' },
      { name: 'Facility Complaint', description: 'Pool, gym, restaurant, parking issues', icon: 'building', color: '#8b5cf6' },
      { name: 'Lost & Found', description: 'Lost items, property claims', icon: 'search', color: '#10b981' },
      { name: 'General Inquiry', description: 'General hotel and service questions', icon: 'help-circle', color: '#6366f1' },
    ],
    slaAdjustments: { responseMultiplier: 0.5, resolutionMultiplier: 0.5 },
  },
]
