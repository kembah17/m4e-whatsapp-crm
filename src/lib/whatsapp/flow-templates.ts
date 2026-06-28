/**
 * Pre-built WhatsApp Flow JSON templates.
 * Each returns { name, categories, flow_json } ready for the Flows API.
 */

export interface FlowTemplate {
  name: string
  description: string
  categories: string[]
  flow_json: object
}

export function customerFeedbackFlow(): FlowTemplate {
  return {
    name: 'Customer Feedback',
    description: 'Collect customer satisfaction ratings and comments',
    categories: ['SURVEY'],
    flow_json: {
      version: '6.0',
      screens: [
        {
          id: 'SCREEN_1',
          title: 'Customer Feedback',
          data: {},
          layout: {
            type: 'SingleColumnLayout',
            children: [
              { type: 'TextHeading', text: 'How was your experience?' },
              {
                type: 'RadioButtonsGroup',
                name: 'rating',
                label: 'Rating',
                required: true,
                'data-source': [
                  { id: '5', title: '⭐⭐⭐⭐⭐ Excellent' },
                  { id: '4', title: '⭐⭐⭐⭐ Good' },
                  { id: '3', title: '⭐⭐⭐ Average' },
                  { id: '2', title: '⭐⭐ Poor' },
                  { id: '1', title: '⭐ Very Poor' },
                ],
              },
              {
                type: 'TextArea',
                name: 'comments',
                label: 'Additional comments (optional)',
                required: false,
              },
              {
                type: 'Footer',
                label: 'Submit Feedback',
                'on-click-action': {
                  name: 'complete',
                  payload: { rating: '${form.rating}', comments: '${form.comments}' },
                },
              },
            ],
          },
        },
      ],
    },
  }
}

export function leadCaptureFlow(): FlowTemplate {
  return {
    name: 'Lead Capture',
    description: 'Capture prospect information for follow-up',
    categories: ['LEAD_GENERATION'],
    flow_json: {
      version: '6.0',
      screens: [
        {
          id: 'SCREEN_1',
          title: 'Tell Us About You',
          data: {},
          layout: {
            type: 'SingleColumnLayout',
            children: [
              { type: 'TextHeading', text: 'Get a free consultation' },
              { type: 'TextInput', name: 'full_name', label: 'Full Name', required: true, 'input-type': 'text' },
              { type: 'TextInput', name: 'email', label: 'Email Address', required: true, 'input-type': 'email' },
              { type: 'TextInput', name: 'company', label: 'Company Name', required: false, 'input-type': 'text' },
              {
                type: 'Dropdown',
                name: 'interest',
                label: 'What are you interested in?',
                required: true,
                'data-source': [
                  { id: 'marketing', title: 'Digital Marketing' },
                  { id: 'branding', title: 'Brand Identity' },
                  { id: 'social', title: 'Social Media Management' },
                  { id: 'web', title: 'Website Development' },
                  { id: 'other', title: 'Other' },
                ],
              },
              {
                type: 'Footer',
                label: 'Submit',
                'on-click-action': {
                  name: 'complete',
                  payload: {
                    full_name: '${form.full_name}',
                    email: '${form.email}',
                    company: '${form.company}',
                    interest: '${form.interest}',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }
}

export function appointmentBookingFlow(): FlowTemplate {
  return {
    name: 'Appointment Booking',
    description: 'Let customers book appointments via WhatsApp',
    categories: ['APPOINTMENT_BOOKING'],
    flow_json: {
      version: '6.0',
      screens: [
        {
          id: 'SCREEN_1',
          title: 'Book an Appointment',
          data: {},
          layout: {
            type: 'SingleColumnLayout',
            children: [
              { type: 'TextHeading', text: 'Schedule a meeting' },
              { type: 'TextInput', name: 'name', label: 'Your Name', required: true, 'input-type': 'text' },
              { type: 'DatePicker', name: 'date', label: 'Preferred Date', required: true },
              {
                type: 'Dropdown',
                name: 'time_slot',
                label: 'Preferred Time',
                required: true,
                'data-source': [
                  { id: '09:00', title: '9:00 AM' },
                  { id: '10:00', title: '10:00 AM' },
                  { id: '11:00', title: '11:00 AM' },
                  { id: '14:00', title: '2:00 PM' },
                  { id: '15:00', title: '3:00 PM' },
                  { id: '16:00', title: '4:00 PM' },
                ],
              },
              {
                type: 'TextArea',
                name: 'notes',
                label: 'Any notes? (optional)',
                required: false,
              },
              {
                type: 'Footer',
                label: 'Book Appointment',
                'on-click-action': {
                  name: 'complete',
                  payload: {
                    name: '${form.name}',
                    date: '${form.date}',
                    time_slot: '${form.time_slot}',
                    notes: '${form.notes}',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }
}

export function orderDetailsFlow(): FlowTemplate {
  return {
    name: 'Order Details',
    description: 'Collect order or service request details',
    categories: ['OTHER'],
    flow_json: {
      version: '6.0',
      screens: [
        {
          id: 'SCREEN_1',
          title: 'Order Details',
          data: {},
          layout: {
            type: 'SingleColumnLayout',
            children: [
              { type: 'TextHeading', text: 'Place your order' },
              { type: 'TextInput', name: 'product_name', label: 'Product / Service', required: true, 'input-type': 'text' },
              { type: 'TextInput', name: 'quantity', label: 'Quantity', required: true, 'input-type': 'number' },
              { type: 'TextInput', name: 'delivery_address', label: 'Delivery Address', required: true, 'input-type': 'text' },
              { type: 'TextInput', name: 'phone', label: 'Phone Number', required: true, 'input-type': 'phone' },
              {
                type: 'TextArea',
                name: 'special_instructions',
                label: 'Special Instructions (optional)',
                required: false,
              },
              {
                type: 'Footer',
                label: 'Place Order',
                'on-click-action': {
                  name: 'complete',
                  payload: {
                    product_name: '${form.product_name}',
                    quantity: '${form.quantity}',
                    delivery_address: '${form.delivery_address}',
                    phone: '${form.phone}',
                    special_instructions: '${form.special_instructions}',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }
}

export function surveyFlow(): FlowTemplate {
  return {
    name: 'Customer Survey',
    description: 'Multi-question survey for market research',
    categories: ['SURVEY'],
    flow_json: {
      version: '6.0',
      screens: [
        {
          id: 'SCREEN_1',
          title: 'Quick Survey',
          data: {},
          layout: {
            type: 'SingleColumnLayout',
            children: [
              { type: 'TextHeading', text: 'Help us improve!' },
              {
                type: 'Dropdown',
                name: 'how_found',
                label: 'How did you find us?',
                required: true,
                'data-source': [
                  { id: 'social', title: 'Social Media' },
                  { id: 'search', title: 'Google Search' },
                  { id: 'referral', title: 'Friend / Referral' },
                  { id: 'ad', title: 'Advertisement' },
                  { id: 'other', title: 'Other' },
                ],
              },
              {
                type: 'RadioButtonsGroup',
                name: 'recommend',
                label: 'Would you recommend us?',
                required: true,
                'data-source': [
                  { id: 'yes', title: 'Yes, definitely!' },
                  { id: 'maybe', title: 'Maybe' },
                  { id: 'no', title: 'No' },
                ],
              },
              {
                type: 'TextArea',
                name: 'suggestions',
                label: 'Any suggestions?',
                required: false,
              },
              {
                type: 'Footer',
                label: 'Submit Survey',
                'on-click-action': {
                  name: 'complete',
                  payload: {
                    how_found: '${form.how_found}',
                    recommend: '${form.recommend}',
                    suggestions: '${form.suggestions}',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }
}

/** All available templates keyed by slug. */
export const FLOW_TEMPLATES: Record<string, () => FlowTemplate> = {
  customer_feedback: customerFeedbackFlow,
  lead_capture: leadCaptureFlow,
  appointment_booking: appointmentBookingFlow,
  order_details: orderDetailsFlow,
  survey: surveyFlow,
}
