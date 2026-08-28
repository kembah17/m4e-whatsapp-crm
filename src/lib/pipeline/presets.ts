/**
 * Industry-specific pipeline stage presets.
 *
 * Each preset provides a tailored set of pipeline stages for a specific
 * industry or operational use case. Users can select a preset when
 * creating a new pipeline instead of using the generic default stages.
 */

export interface PipelinePreset {
  id: string
  name: string
  icon: string
  description: string
  category: 'sales' | 'operations'
  stages: { name: string; color: string; position: number }[]
}

export const PIPELINE_PRESETS: PipelinePreset[] = [
  // ── Sales Pipelines ──────────────────────────────────────
  {
    id: 'default_sales',
    name: 'General Sales',
    icon: '💼',
    description: 'Standard sales pipeline for most businesses',
    category: 'sales',
    stages: [
      { name: 'New Lead', color: '#3b82f6', position: 0 },
      { name: 'Qualified', color: '#eab308', position: 1 },
      { name: 'Proposal Sent', color: '#f97316', position: 2 },
      { name: 'Negotiation', color: '#8b5cf6', position: 3 },
      { name: 'Won', color: '#22c55e', position: 4 },
    ],
  },
  {
    id: 'real_estate_sales',
    name: 'Real Estate Sales',
    icon: '🏠',
    description: 'Property sales from enquiry to closing',
    category: 'sales',
    stages: [
      { name: 'Enquiry', color: '#3b82f6', position: 0 },
      { name: 'Site Visit Scheduled', color: '#06b6d4', position: 1 },
      { name: 'Site Visit Done', color: '#eab308', position: 2 },
      { name: 'Offer Made', color: '#f97316', position: 3 },
      { name: 'Documentation', color: '#8b5cf6', position: 4 },
      { name: 'Payment Plan', color: '#ec4899', position: 5 },
      { name: 'Closed', color: '#22c55e', position: 6 },
    ],
  },
  {
    id: 'professional_services_sales',
    name: 'Professional Services',
    icon: '💼',
    description: 'Consulting, legal, accounting client acquisition',
    category: 'sales',
    stages: [
      { name: 'Initial Contact', color: '#3b82f6', position: 0 },
      { name: 'Discovery Call', color: '#06b6d4', position: 1 },
      { name: 'Needs Assessment', color: '#eab308', position: 2 },
      { name: 'Proposal Sent', color: '#f97316', position: 3 },
      { name: 'Contract Review', color: '#8b5cf6', position: 4 },
      { name: 'Retainer Signed', color: '#22c55e', position: 5 },
    ],
  },
  {
    id: 'retail_sales',
    name: 'Retail / E-Commerce',
    icon: '🛍️',
    description: 'Product enquiry to purchase and repeat',
    category: 'sales',
    stages: [
      { name: 'Product Enquiry', color: '#3b82f6', position: 0 },
      { name: 'Quote Sent', color: '#eab308', position: 1 },
      { name: 'Payment Pending', color: '#f97316', position: 2 },
      { name: 'Order Confirmed', color: '#8b5cf6', position: 3 },
      { name: 'Delivered', color: '#22c55e', position: 4 },
      { name: 'Repeat Customer', color: '#10b981', position: 5 },
    ],
  },
  {
    id: 'agriculture_sales',
    name: 'Agriculture Sales',
    icon: '🌾',
    description: 'Farm produce and agro-input sales cycle',
    category: 'sales',
    stages: [
      { name: 'Buyer Enquiry', color: '#3b82f6', position: 0 },
      { name: 'Sample/Quote', color: '#eab308', position: 1 },
      { name: 'Order Placed', color: '#f97316', position: 2 },
      { name: 'Harvest/Processing', color: '#8b5cf6', position: 3 },
      { name: 'Delivery', color: '#06b6d4', position: 4 },
      { name: 'Payment Received', color: '#22c55e', position: 5 },
    ],
  },
  {
    id: 'manufacturing_sales',
    name: 'Manufacturing Sales',
    icon: '🏭',
    description: 'B2B manufacturing order pipeline',
    category: 'sales',
    stages: [
      { name: 'RFQ Received', color: '#3b82f6', position: 0 },
      { name: 'Technical Review', color: '#06b6d4', position: 1 },
      { name: 'Quotation Sent', color: '#eab308', position: 2 },
      { name: 'Sample Approved', color: '#f97316', position: 3 },
      { name: 'PO Received', color: '#8b5cf6', position: 4 },
      { name: 'Production', color: '#ec4899', position: 5 },
      { name: 'Delivered & Paid', color: '#22c55e', position: 6 },
    ],
  },
  {
    id: 'hospitality_sales',
    name: 'Hotels & Events',
    icon: '🏨',
    description: 'Booking pipeline for hotels and event centres',
    category: 'sales',
    stages: [
      { name: 'Enquiry', color: '#3b82f6', position: 0 },
      { name: 'Availability Check', color: '#06b6d4', position: 1 },
      { name: 'Quote Sent', color: '#eab308', position: 2 },
      { name: 'Deposit Paid', color: '#f97316', position: 3 },
      { name: 'Booking Confirmed', color: '#8b5cf6', position: 4 },
      { name: 'Checked In', color: '#ec4899', position: 5 },
      { name: 'Completed', color: '#22c55e', position: 6 },
    ],
  },

  // ── Operational Pipelines ────────────────────────────────
  {
    id: 'client_onboarding',
    name: 'Client Onboarding',
    icon: '🚀',
    description: 'Track new client setup and activation',
    category: 'operations',
    stages: [
      { name: 'Welcome', color: '#3b82f6', position: 0 },
      { name: 'Documents Collected', color: '#06b6d4', position: 1 },
      { name: 'Account Setup', color: '#eab308', position: 2 },
      { name: 'Training', color: '#f97316', position: 3 },
      { name: 'First Campaign', color: '#8b5cf6', position: 4 },
      { name: 'Active', color: '#22c55e', position: 5 },
    ],
  },
  {
    id: 'order_fulfilment',
    name: 'Order Fulfilment',
    icon: '📦',
    description: 'Track orders from placement to delivery',
    category: 'operations',
    stages: [
      { name: 'Order Received', color: '#3b82f6', position: 0 },
      { name: 'Payment Confirmed', color: '#06b6d4', position: 1 },
      { name: 'Processing', color: '#eab308', position: 2 },
      { name: 'Packed', color: '#f97316', position: 3 },
      { name: 'Shipped', color: '#8b5cf6', position: 4 },
      { name: 'Delivered', color: '#22c55e', position: 5 },
    ],
  },
  {
    id: 'project_delivery',
    name: 'Project Delivery',
    icon: '📋',
    description: 'Track project milestones and deliverables',
    category: 'operations',
    stages: [
      { name: 'Kickoff', color: '#3b82f6', position: 0 },
      { name: 'Discovery', color: '#06b6d4', position: 1 },
      { name: 'In Progress', color: '#eab308', position: 2 },
      { name: 'Review', color: '#f97316', position: 3 },
      { name: 'Revision', color: '#8b5cf6', position: 4 },
      { name: 'Delivered', color: '#22c55e', position: 5 },
    ],
  },
  {
    id: 'support_escalation',
    name: 'Support Escalation',
    icon: '🚨',
    description: 'Track customer issues from report to resolution',
    category: 'operations',
    stages: [
      { name: 'Reported', color: '#ef4444', position: 0 },
      { name: 'Acknowledged', color: '#f97316', position: 1 },
      { name: 'Investigating', color: '#eab308', position: 2 },
      { name: 'Fix in Progress', color: '#8b5cf6', position: 3 },
      { name: 'Resolved', color: '#22c55e', position: 4 },
    ],
  },
]

export function getPipelinePreset(id: string): PipelinePreset | undefined {
  return PIPELINE_PRESETS.find((p) => p.id === id)
}

export function getPipelinePresetsByCategory(category: 'sales' | 'operations'): PipelinePreset[] {
  return PIPELINE_PRESETS.filter((p) => p.category === category)
}
