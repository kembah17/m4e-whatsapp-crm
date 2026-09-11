// ============================================================
// Multi-Tier Inventory - Industry Preset Templates
// 10 Nigerian-market industry presets for quick setup
// ============================================================

import type { IndustryPreset } from '@/types/inventory'

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  // ── 1. Retail ──────────────────────────────────────────────
  {
    industry: 'retail',
    description: 'Retail & General Merchandise',
    defaultLocations: [
      {
        name: 'Main Store',
        type: 'store',
        children: [
          { name: 'Sales Floor', type: 'zone' },
          { name: 'Checkout Area', type: 'zone' },
          { name: 'Display Window', type: 'zone' },
        ],
      },
      {
        name: 'Back Store',
        type: 'warehouse',
        children: [
          { name: 'Receiving Bay', type: 'zone' },
          { name: 'Storage Room', type: 'zone' },
          { name: 'Returns Area', type: 'zone' },
        ],
      },
    ],
    defaultCategories: [
      'Electronics',
      'Clothing',
      'Accessories',
      'Home & Living',
      'Beauty & Personal Care',
      'Food & Beverages',
      'Stationery',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 10, quantity: 50 },
    batchTrackingEnabled: false,
    expiryTrackingEnabled: false,
  },

  // ── 2. Restaurant / Food Service ───────────────────────────
  {
    industry: 'restaurant',
    description: 'Restaurant & Food Service',
    defaultLocations: [
      {
        name: 'Main Kitchen',
        type: 'warehouse',
        children: [
          { name: 'Dry Store', type: 'zone' },
          { name: 'Cold Room', type: 'zone' },
          { name: 'Prep Station', type: 'zone' },
        ],
      },
      { name: 'Bar', type: 'store' },
      { name: 'Service Area', type: 'store' },
    ],
    defaultCategories: [
      'Proteins',
      'Vegetables',
      'Spices',
      'Beverages',
      'Dry Goods',
      'Dairy',
      'Packaging',
    ],
    unitOfMeasure: 'kg',
    reorderDefaults: { point: 5, quantity: 20 },
    batchTrackingEnabled: true,
    expiryTrackingEnabled: true,
  },

  // ── 3. Healthcare / Pharmacy ───────────────────────────────
  {
    industry: 'healthcare',
    description: 'Healthcare & Pharmacy',
    defaultLocations: [
      {
        name: 'Pharmacy Store',
        type: 'warehouse',
        children: [
          { name: 'Controlled Substances', type: 'zone' },
          { name: 'General Medicines', type: 'zone' },
          { name: 'Cold Chain Storage', type: 'zone' },
        ],
      },
      { name: 'Dispensary Counter', type: 'store' },
      { name: 'Emergency Stock', type: 'zone' },
    ],
    defaultCategories: [
      'Prescription Drugs',
      'Over-the-Counter',
      'Supplements',
      'Medical Supplies',
      'First Aid',
      'Personal Care',
      'Baby Products',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 15, quantity: 100 },
    batchTrackingEnabled: true,
    expiryTrackingEnabled: true,
  },

  // ── 4. Agriculture ─────────────────────────────────────────
  {
    industry: 'agriculture',
    description: 'Agriculture & Agribusiness',
    defaultLocations: [
      {
        name: 'Main Warehouse',
        type: 'warehouse',
        children: [
          { name: 'Grain Silo', type: 'bin' },
          { name: 'Chemical Store', type: 'zone' },
          { name: 'Equipment Bay', type: 'zone' },
        ],
      },
      { name: 'Processing Area', type: 'zone' },
      { name: 'Loading Dock', type: 'zone' },
    ],
    defaultCategories: [
      'Seeds',
      'Fertilizers',
      'Pesticides',
      'Harvested Produce',
      'Animal Feed',
      'Equipment Parts',
      'Packaging Materials',
    ],
    unitOfMeasure: 'kg',
    reorderDefaults: { point: 50, quantity: 500 },
    batchTrackingEnabled: true,
    expiryTrackingEnabled: true,
  },

  // ── 5. Manufacturing ───────────────────────────────────────
  {
    industry: 'manufacturing',
    description: 'Manufacturing & Production',
    defaultLocations: [
      {
        name: 'Raw Materials Store',
        type: 'warehouse',
        children: [
          { name: 'Metals', type: 'zone' },
          { name: 'Chemicals', type: 'zone' },
          { name: 'Components', type: 'zone' },
        ],
      },
      { name: 'Production Floor', type: 'zone' },
      {
        name: 'Finished Goods',
        type: 'warehouse',
        children: [
          { name: 'Quality Hold', type: 'zone' },
          { name: 'Ready to Ship', type: 'zone' },
        ],
      },
    ],
    defaultCategories: [
      'Raw Materials',
      'Work in Progress',
      'Finished Goods',
      'Packaging',
      'Spare Parts',
      'Consumables',
      'Tools',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 20, quantity: 100 },
    batchTrackingEnabled: true,
    expiryTrackingEnabled: false,
  },

  // ── 6. Hotels / Hospitality ────────────────────────────────
  {
    industry: 'hospitality',
    description: 'Hotels & Hospitality',
    defaultLocations: [
      {
        name: 'Central Store',
        type: 'warehouse',
        children: [
          { name: 'Linen Room', type: 'zone' },
          { name: 'Amenities Store', type: 'zone' },
          { name: 'Cleaning Supplies', type: 'zone' },
        ],
      },
      {
        name: 'Kitchen',
        type: 'warehouse',
        children: [
          { name: 'Dry Store', type: 'zone' },
          { name: 'Cold Room', type: 'zone' },
        ],
      },
      { name: 'Bar & Lounge', type: 'store' },
      { name: 'Housekeeping', type: 'zone' },
    ],
    defaultCategories: [
      'Food & Beverages',
      'Linens & Towels',
      'Toiletries & Amenities',
      'Cleaning Supplies',
      'Kitchen Supplies',
      'Maintenance Parts',
      'Office Supplies',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 20, quantity: 100 },
    batchTrackingEnabled: false,
    expiryTrackingEnabled: true,
  },

  // ── 7. Real Estate ─────────────────────────────────────────
  {
    industry: 'real_estate',
    description: 'Real Estate & Property Management',
    defaultLocations: [
      {
        name: 'Maintenance Store',
        type: 'warehouse',
        children: [
          { name: 'Plumbing Supplies', type: 'zone' },
          { name: 'Electrical Supplies', type: 'zone' },
          { name: 'Paint & Finishes', type: 'zone' },
        ],
      },
      { name: 'Site Office', type: 'store' },
      { name: 'Equipment Yard', type: 'zone' },
    ],
    defaultCategories: [
      'Building Materials',
      'Plumbing',
      'Electrical',
      'Paint & Finishes',
      'Hardware',
      'Safety Equipment',
      'Cleaning Supplies',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 5, quantity: 25 },
    batchTrackingEnabled: false,
    expiryTrackingEnabled: false,
  },

  // ── 8. Education ───────────────────────────────────────────
  {
    industry: 'education',
    description: 'Schools & Educational Institutions',
    defaultLocations: [
      {
        name: 'Main Store',
        type: 'warehouse',
        children: [
          { name: 'Textbooks', type: 'zone' },
          { name: 'Stationery', type: 'zone' },
          { name: 'Lab Equipment', type: 'zone' },
        ],
      },
      { name: 'Library', type: 'store' },
      { name: 'Tuck Shop', type: 'store' },
    ],
    defaultCategories: [
      'Textbooks',
      'Stationery',
      'Lab Equipment',
      'Sports Equipment',
      'Uniforms',
      'Cleaning Supplies',
      'Food & Snacks',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 10, quantity: 50 },
    batchTrackingEnabled: false,
    expiryTrackingEnabled: false,
  },

  // ── 9. Logistics ───────────────────────────────────────────
  {
    industry: 'logistics',
    description: 'Logistics & Distribution',
    defaultLocations: [
      {
        name: 'Distribution Centre',
        type: 'warehouse',
        children: [
          { name: 'Inbound Dock', type: 'zone' },
          { name: 'Sorting Area', type: 'zone' },
          { name: 'Outbound Dock', type: 'zone' },
        ],
      },
      { name: 'Transit Hub', type: 'transit' },
      { name: 'Returns Processing', type: 'zone' },
    ],
    defaultCategories: [
      'Packaging Materials',
      'Labels & Tags',
      'Pallets & Crates',
      'Vehicle Parts',
      'Fuel & Lubricants',
      'Safety Gear',
      'Office Supplies',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 50, quantity: 200 },
    batchTrackingEnabled: true,
    expiryTrackingEnabled: false,
  },

  // ── 10. Professional Services ──────────────────────────────
  {
    industry: 'professional_services',
    description: 'Professional & Business Services',
    defaultLocations: [
      {
        name: 'Office Store',
        type: 'warehouse',
        children: [
          { name: 'Stationery Cupboard', type: 'shelf' },
          { name: 'IT Equipment', type: 'zone' },
          { name: 'Pantry', type: 'zone' },
        ],
      },
    ],
    defaultCategories: [
      'Office Supplies',
      'IT Equipment',
      'Printer Consumables',
      'Cleaning Supplies',
      'Pantry Items',
      'Branded Materials',
      'Client Gifts',
    ],
    unitOfMeasure: 'pieces',
    reorderDefaults: { point: 5, quantity: 20 },
    batchTrackingEnabled: false,
    expiryTrackingEnabled: false,
  },
]

/**
 * Look up a preset by industry key.
 */
export function getPreset(industry: string): IndustryPreset | undefined {
  return INDUSTRY_PRESETS.find((p) => p.industry === industry)
}

/**
 * Return a flat list of { value, label } for UI selectors.
 */
export function getPresetOptions(): { value: string; label: string }[] {
  return INDUSTRY_PRESETS.map((p) => ({
    value: p.industry,
    label: p.description,
  }))
}
