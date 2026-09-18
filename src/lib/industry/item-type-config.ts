// ============================================================
// Industry Item Type Configuration
// ============================================================
// DESIGN PRINCIPLE: These are DEFAULTS and SUGGESTIONS, not restrictions.
// Any account can enable ANY item type regardless of their primary industry.
// Industry bundles pre-configure the most relevant types, but users can:
//   1. Enable additional types (hotel enables menu_item for their bar)
//   2. Disable irrelevant types (hide what they don't need)
//   3. Customise labels ("Room Types" instead of "Assets")
//   4. Add metadata fields specific to their business
//
// This supports the user's requirement:
//   "We should be able to easily match their respective databases
//    with relevant industry data specifications"
// ============================================================

import type { ItemType, ItemRole } from '@/types'

// ============================================================
// Metadata Schema Field Definition
// ============================================================
// Defines what metadata fields are suggested for each item type.
// These appear as optional fields in the product form.
// Clients can fill in what they know — no field is mandatory.

export interface MetadataFieldDef {
  key: string           // JSONB key in metadata
  label: string         // Display label
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'textarea'
  placeholder?: string  // Input placeholder
  options?: string[]    // For select/multiselect
  unit?: string         // Display unit (e.g., "kg", "minutes")
  helpText?: string     // Tooltip/help text
  required?: boolean    // Whether this field is strongly recommended (never enforced)
}

// ============================================================
// Item Type Definition
// ============================================================

export interface ItemTypeDefinition {
  type: ItemType
  label: string              // Default singular label
  labelPlural: string        // Default plural label
  icon: string               // Emoji icon
  description: string        // What this type is for
  defaultRole: ItemRole      // Default revenue role
  supportsInventory: boolean // Whether track_inventory makes sense
  supportsBOM: boolean       // Whether product_components makes sense
  supportsAvailability: boolean // Whether product_availability makes sense
  metadataFields: MetadataFieldDef[] // Suggested metadata fields
}

// ============================================================
// Master Item Type Registry
// ============================================================
// Complete definition of every item type with its metadata schema.
// This is the single source of truth for item type behaviour.

export const ITEM_TYPE_REGISTRY: Record<ItemType, ItemTypeDefinition> = {
  product: {
    type: 'product',
    label: 'Product',
    labelPlural: 'Products',
    icon: '📦',
    description: 'Physical goods for sale — retail items, manufactured goods, agricultural produce',
    defaultRole: 'revenue',
    supportsInventory: true,
    supportsBOM: true,
    supportsAvailability: false,
    metadataFields: [
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Peak, Dangote' },
      { key: 'weight', label: 'Weight', type: 'number', unit: 'kg', placeholder: '0.00' },
      { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'L x W x H cm' },
      { key: 'colour', label: 'Colour', type: 'text', placeholder: 'e.g., Red, Blue' },
      { key: 'size', label: 'Size', type: 'text', placeholder: 'e.g., S, M, L, XL or 42' },
      { key: 'barcode', label: 'Barcode', type: 'text', placeholder: 'EAN/UPC barcode' },
      { key: 'shelf_life_days', label: 'Shelf Life', type: 'number', unit: 'days' },
      { key: 'storage_conditions', label: 'Storage Conditions', type: 'text', placeholder: 'e.g., Cool dry place' },
      { key: 'nafdac_no', label: 'NAFDAC Number', type: 'text', placeholder: 'e.g., A4-1234' },
      { key: 'son_certified', label: 'SON Certified', type: 'boolean' },
      { key: 'country_of_origin', label: 'Country of Origin', type: 'text', placeholder: 'e.g., Nigeria' },
    ],
  },

  service: {
    type: 'service',
    label: 'Service',
    labelPlural: 'Services',
    icon: '🔧',
    description: 'Services for sale — consulting, delivery, maintenance, professional services',
    defaultRole: 'revenue',
    supportsInventory: false,
    supportsBOM: false,
    supportsAvailability: true,
    metadataFields: [
      { key: 'duration_minutes', label: 'Duration', type: 'number', unit: 'minutes', placeholder: '60' },
      { key: 'rate_type', label: 'Rate Type', type: 'select', options: ['fixed', 'hourly', 'daily', 'project', 'retainer'] },
      { key: 'delivery_mode', label: 'Delivery Mode', type: 'select', options: ['in-person', 'remote', 'hybrid', 'on-site'] },
      { key: 'sla_hours', label: 'SLA (Response Time)', type: 'number', unit: 'hours' },
      { key: 'practice_area', label: 'Practice Area', type: 'text', placeholder: 'e.g., Tax Advisory, Family Law' },
      { key: 'min_engagement_hours', label: 'Minimum Engagement', type: 'number', unit: 'hours' },
      { key: 'coverage_area', label: 'Coverage Area', type: 'text', placeholder: 'e.g., Lagos-Ibadan corridor' },
      { key: 'requires_appointment', label: 'Requires Appointment', type: 'boolean' },
      { key: 'max_capacity', label: 'Max Capacity', type: 'number', helpText: 'Maximum clients/sessions per day' },
    ],
  },

  menu_item: {
    type: 'menu_item',
    label: 'Menu Item',
    labelPlural: 'Menu Items',
    icon: '🍽️',
    description: 'Prepared items for sale — restaurant meals, bar drinks, bakery items',
    defaultRole: 'revenue',
    supportsInventory: false, // Stock tracked via ingredients (BOM)
    supportsBOM: true,        // Recipe/ingredient tracking
    supportsAvailability: false,
    metadataFields: [
      { key: 'prep_time_minutes', label: 'Prep Time', type: 'number', unit: 'minutes', placeholder: '25' },
      { key: 'serves', label: 'Serves', type: 'number', placeholder: '1' },
      { key: 'calories', label: 'Calories', type: 'number', unit: 'kcal' },
      { key: 'allergens', label: 'Allergens', type: 'multiselect', options: ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'] },
      { key: 'spice_level', label: 'Spice Level', type: 'select', options: ['mild', 'medium', 'hot', 'extra-hot'] },
      { key: 'dietary', label: 'Dietary', type: 'multiselect', options: ['vegetarian', 'vegan', 'halal', 'gluten-free', 'keto', 'low-carb'] },
      { key: 'meal_type', label: 'Meal Type', type: 'select', options: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink', 'side'] },
      { key: 'is_signature', label: 'Signature Dish', type: 'boolean' },
      { key: 'available_times', label: 'Available Times', type: 'text', placeholder: 'e.g., 11am-3pm (lunch only)' },
    ],
  },

  ingredient: {
    type: 'ingredient',
    label: 'Ingredient',
    labelPlural: 'Ingredients',
    icon: '🧅',
    description: 'Raw inputs consumed in production — cooking ingredients, raw materials, components',
    defaultRole: 'operational',
    supportsInventory: true,
    supportsBOM: false, // Ingredients ARE the BOM components
    supportsAvailability: false,
    metadataFields: [
      { key: 'grade', label: 'Grade/Quality', type: 'text', placeholder: 'e.g., Grade A, Premium' },
      { key: 'origin', label: 'Origin/Source', type: 'text', placeholder: 'e.g., Ogun State, Imported' },
      { key: 'shelf_life_days', label: 'Shelf Life', type: 'number', unit: 'days' },
      { key: 'storage_temp', label: 'Storage Temperature', type: 'select', options: ['room-temp', 'refrigerated', 'frozen', 'cool-dry'] },
      { key: 'min_order_qty', label: 'Minimum Order Qty', type: 'number' },
      { key: 'is_perishable', label: 'Perishable', type: 'boolean' },
      { key: 'substitute_for', label: 'Can Substitute For', type: 'text', placeholder: 'e.g., Palm oil → Vegetable oil' },
    ],
  },

  supply: {
    type: 'supply',
    label: 'Supply',
    labelPlural: 'Supplies',
    icon: '🧴',
    description: 'Operational consumables — cleaning supplies, packaging, office supplies, PPE',
    defaultRole: 'operational',
    supportsInventory: true,
    supportsBOM: false,
    supportsAvailability: false,
    metadataFields: [
      { key: 'department', label: 'Department', type: 'text', placeholder: 'e.g., Housekeeping, Kitchen, Office' },
      { key: 'consumption_rate', label: 'Consumption Rate', type: 'text', placeholder: 'e.g., 5 per week' },
      { key: 'is_disposable', label: 'Disposable', type: 'boolean' },
      { key: 'safety_stock_days', label: 'Safety Stock (Days)', type: 'number', unit: 'days' },
    ],
  },

  asset: {
    type: 'asset',
    label: 'Asset',
    labelPlural: 'Assets',
    icon: '🏨',
    description: 'Bookable assets — hotel rooms, vehicles, equipment, event spaces, facilities',
    defaultRole: 'revenue',
    supportsInventory: false,
    supportsBOM: false,
    supportsAvailability: true, // Date-based booking
    metadataFields: [
      { key: 'capacity', label: 'Capacity', type: 'number', placeholder: 'e.g., 2 guests, 50 seats' },
      { key: 'total_units', label: 'Total Units', type: 'number', placeholder: 'e.g., 5 rooms of this type', required: true },
      { key: 'amenities', label: 'Amenities', type: 'multiselect', options: ['wifi', 'ac', 'tv', 'pool', 'gym', 'parking', 'breakfast', 'minibar', 'balcony', 'kitchen', 'laundry'] },
      { key: 'floor', label: 'Floor/Location', type: 'text', placeholder: 'e.g., 3rd Floor, Building A' },
      { key: 'size_sqm', label: 'Size', type: 'number', unit: 'sqm' },
      { key: 'bed_type', label: 'Bed Type', type: 'select', options: ['single', 'double', 'queen', 'king', 'twin', 'bunk', 'sofa-bed'] },
      { key: 'view', label: 'View', type: 'select', options: ['ocean', 'pool', 'garden', 'city', 'courtyard', 'none'] },
      { key: 'check_in_time', label: 'Check-in Time', type: 'text', placeholder: 'e.g., 14:00' },
      { key: 'check_out_time', label: 'Check-out Time', type: 'text', placeholder: 'e.g., 11:00' },
      { key: 'min_stay_nights', label: 'Minimum Stay', type: 'number', unit: 'nights' },
      { key: 'max_occupancy', label: 'Max Occupancy', type: 'number' },
    ],
  },

  programme: {
    type: 'programme',
    label: 'Programme',
    labelPlural: 'Programmes',
    icon: '🎓',
    description: 'Educational programmes — classes, courses, training, workshops, terms',
    defaultRole: 'revenue',
    supportsInventory: false,
    supportsBOM: true,  // Course materials as components
    supportsAvailability: true, // Term/session availability
    metadataFields: [
      { key: 'duration_weeks', label: 'Duration', type: 'number', unit: 'weeks' },
      { key: 'class_capacity', label: 'Class Capacity', type: 'number' },
      { key: 'age_range', label: 'Age Range', type: 'text', placeholder: 'e.g., 5-12 years' },
      { key: 'term', label: 'Term/Session', type: 'text', placeholder: 'e.g., 2026/2027 First Term' },
      { key: 'schedule', label: 'Schedule', type: 'text', placeholder: 'e.g., Mon-Fri 8am-2pm' },
      { key: 'level', label: 'Level', type: 'select', options: ['beginner', 'intermediate', 'advanced', 'all-levels'] },
      { key: 'certification', label: 'Certification', type: 'text', placeholder: 'e.g., WAEC, NECO, Certificate' },
      { key: 'instructor', label: 'Instructor', type: 'text' },
      { key: 'prerequisites', label: 'Prerequisites', type: 'textarea', placeholder: 'What students need before enrolling' },
    ],
  },

  property: {
    type: 'property',
    label: 'Property',
    labelPlural: 'Properties',
    icon: '🏠',
    description: 'Real estate listings — houses, flats, land, commercial spaces',
    defaultRole: 'revenue',
    supportsInventory: false,
    supportsBOM: false,
    supportsAvailability: true, // Viewing availability
    metadataFields: [
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['flat', 'duplex', 'bungalow', 'terrace', 'detached', 'semi-detached', 'penthouse', 'studio', 'land', 'commercial', 'warehouse', 'shop'] },
      { key: 'listing_type', label: 'Listing Type', type: 'select', options: ['sale', 'rent', 'short-let', 'lease'] },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
      { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
      { key: 'sqm', label: 'Size', type: 'number', unit: 'sqm' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g., Lekki Phase 1, Lagos' },
      { key: 'state', label: 'State', type: 'text', placeholder: 'e.g., Lagos' },
      { key: 'lga', label: 'LGA', type: 'text', placeholder: 'e.g., Eti-Osa' },
      { key: 'year_built', label: 'Year Built', type: 'number' },
      { key: 'furnishing', label: 'Furnishing', type: 'select', options: ['furnished', 'semi-furnished', 'unfurnished'] },
      { key: 'title_document', label: 'Title Document', type: 'select', options: ['c-of-o', 'governor-consent', 'deed-of-assignment', 'survey-plan', 'receipt-of-purchase', 'none'] },
      { key: 'features', label: 'Features', type: 'multiselect', options: ['bq', 'swimming-pool', 'gym', 'generator', 'security', 'cctv', 'elevator', 'parking', 'garden', 'waterfront'] },
      { key: 'service_charge', label: 'Service Charge', type: 'number', unit: '₦/year' },
    ],
  },

  package: {
    type: 'package',
    label: 'Package',
    labelPlural: 'Packages',
    icon: '🎁',
    description: 'Bundled offerings — combo meals, service packages, gift sets, event packages',
    defaultRole: 'revenue',
    supportsInventory: false,
    supportsBOM: true,  // Package components
    supportsAvailability: true,
    metadataFields: [
      { key: 'includes_count', label: 'Items Included', type: 'number' },
      { key: 'savings_percent', label: 'Savings vs Individual', type: 'number', unit: '%' },
      { key: 'validity_days', label: 'Validity Period', type: 'number', unit: 'days' },
      { key: 'is_customisable', label: 'Customisable', type: 'boolean', helpText: 'Can customer swap items?' },
      { key: 'target_occasion', label: 'Target Occasion', type: 'text', placeholder: 'e.g., Birthday, Corporate, Wedding' },
    ],
  },

  subscription: {
    type: 'subscription',
    label: 'Subscription',
    labelPlural: 'Subscriptions',
    icon: '🔄',
    description: 'Recurring offerings — retainers, memberships, maintenance plans, SaaS',
    defaultRole: 'revenue',
    supportsInventory: false,
    supportsBOM: true,  // What's included in the subscription
    supportsAvailability: false,
    metadataFields: [
      { key: 'billing_cycle', label: 'Billing Cycle', type: 'select', options: ['weekly', 'monthly', 'quarterly', 'biannual', 'annual'] },
      { key: 'trial_days', label: 'Trial Period', type: 'number', unit: 'days' },
      { key: 'auto_renew', label: 'Auto-Renew', type: 'boolean' },
      { key: 'cancellation_notice_days', label: 'Cancellation Notice', type: 'number', unit: 'days' },
      { key: 'max_users', label: 'Max Users/Seats', type: 'number' },
      { key: 'tier', label: 'Tier', type: 'select', options: ['basic', 'standard', 'premium', 'enterprise'] },
    ],
  },
}

// ============================================================
// Industry Bundle Configuration
// ============================================================
// Maps each industry to its DEFAULT item types.
// These are pre-enabled when an account selects their industry.
// Users can ALWAYS enable additional types or disable defaults.

export interface IndustryItemTypeBundle {
  industry: string
  displayName: string
  description: string
  // Primary types: enabled by default, shown prominently
  primaryTypes: {
    type: ItemType
    labelOverride?: string        // Custom label for this industry
    labelPluralOverride?: string  // Custom plural label
    roleOverride?: ItemRole       // Override default role
  }[]
  // Secondary types: available but not enabled by default
  // Shown as "You can also track..." suggestions
  secondaryTypes: {
    type: ItemType
    reason: string  // Why this might be relevant
  }[]
  // Default unit of measure for this industry
  defaultUnit: string
  // Suggested categories for this industry
  suggestedCategories: string[]
  // Import field aliases: common column names in this industry's spreadsheets
  // Maps common names → BGE field names for smart import matching
  importAliases: Record<string, string>
}

export const INDUSTRY_BUNDLES: Record<string, IndustryItemTypeBundle> = {
  retail: {
    industry: 'retail',
    displayName: 'Retail / FMCG',
    description: 'Shops, supermarkets, wholesale, consumer goods',
    primaryTypes: [
      { type: 'product' },
      { type: 'supply', labelOverride: 'Store Supply', labelPluralOverride: 'Store Supplies' },
    ],
    secondaryTypes: [
      { type: 'package', reason: 'Bundle products into gift sets or combo deals' },
      { type: 'subscription', reason: 'Offer subscription boxes or loyalty memberships' },
      { type: 'service', reason: 'Track delivery or installation services' },
    ],
    defaultUnit: 'pieces',
    suggestedCategories: [
      'Electronics', 'Clothing', 'Food & Beverages', 'Health & Beauty',
      'Home & Kitchen', 'Stationery', 'Accessories', 'Baby & Kids',
    ],
    importAliases: {
      'item name': 'name', 'product name': 'name', 'item': 'name',
      'selling price': 'price', 'retail price': 'price', 'unit price': 'price',
      'cost price': 'cost', 'buying price': 'cost', 'wholesale price': 'cost',
      'item code': 'sku', 'product code': 'sku', 'barcode': 'sku',
      'item group': 'category', 'department': 'category', 'section': 'category',
      'stock': 'stock_quantity', 'qty': 'stock_quantity', 'quantity': 'stock_quantity',
      'in stock': 'stock_quantity', 'stock qty': 'stock_quantity',
      'description': 'description', 'details': 'description',
      'brand': 'metadata.brand', 'size': 'metadata.size', 'colour': 'metadata.colour',
      'color': 'metadata.colour', 'weight': 'metadata.weight',
    },
  },

  hotel: {
    industry: 'hotel',
    displayName: 'Hotels & Hospitality',
    description: 'Hotels, guest houses, resorts, short-lets, event centres',
    primaryTypes: [
      { type: 'asset', labelOverride: 'Room Type', labelPluralOverride: 'Room Types' },
      { type: 'service', labelOverride: 'Hotel Service', labelPluralOverride: 'Hotel Services' },
      { type: 'package', labelOverride: 'Stay Package', labelPluralOverride: 'Stay Packages' },
    ],
    secondaryTypes: [
      { type: 'menu_item', reason: 'Track restaurant/bar menu items' },
      { type: 'ingredient', reason: 'Track kitchen/bar ingredients' },
      { type: 'supply', reason: 'Track housekeeping and operational supplies' },
      { type: 'subscription', reason: 'Offer loyalty memberships or corporate rates' },
    ],
    defaultUnit: 'nights',
    suggestedCategories: [
      'Standard Rooms', 'Deluxe Rooms', 'Suites', 'Conference Rooms',
      'Event Spaces', 'Restaurant', 'Bar', 'Spa & Wellness',
      'Laundry', 'Transport', 'Tours & Activities',
    ],
    importAliases: {
      'room type': 'name', 'room name': 'name', 'room category': 'name',
      'rate': 'price', 'room rate': 'price', 'price per night': 'price',
      'rack rate': 'price', 'nightly rate': 'price',
      'rooms': 'metadata.total_units', 'total rooms': 'metadata.total_units',
      'no of rooms': 'metadata.total_units', 'quantity': 'metadata.total_units',
      'max guests': 'metadata.max_occupancy', 'occupancy': 'metadata.max_occupancy',
      'capacity': 'metadata.capacity', 'pax': 'metadata.capacity',
      'bed type': 'metadata.bed_type', 'bed': 'metadata.bed_type',
      'floor': 'metadata.floor', 'view': 'metadata.view',
      'amenities': 'metadata.amenities', 'facilities': 'metadata.amenities',
      'description': 'description', 'details': 'description',
    },
  },

  restaurant: {
    industry: 'restaurant',
    displayName: 'Restaurant / Food Service',
    description: 'Restaurants, cafes, bakeries, catering, food trucks',
    primaryTypes: [
      { type: 'menu_item' },
      { type: 'ingredient' },
      { type: 'supply', labelOverride: 'Kitchen Supply', labelPluralOverride: 'Kitchen Supplies' },
    ],
    secondaryTypes: [
      { type: 'package', reason: 'Create combo meals or catering packages' },
      { type: 'service', reason: 'Track catering or delivery services' },
      { type: 'product', reason: 'Sell packaged items (sauces, spices, merchandise)' },
      { type: 'subscription', reason: 'Offer meal plans or catering retainers' },
    ],
    defaultUnit: 'portions',
    suggestedCategories: [
      'Starters', 'Main Course', 'Soups', 'Rice Dishes', 'Grills',
      'Sides', 'Desserts', 'Drinks', 'Cocktails', 'Specials',
    ],
    importAliases: {
      'dish': 'name', 'meal': 'name', 'menu item': 'name', 'food item': 'name',
      'price': 'price', 'selling price': 'price', 'menu price': 'price',
      'cost': 'cost', 'food cost': 'cost', 'ingredient cost': 'cost',
      'category': 'category', 'menu section': 'category', 'course': 'category',
      'prep time': 'metadata.prep_time_minutes', 'preparation time': 'metadata.prep_time_minutes',
      'serves': 'metadata.serves', 'portions': 'metadata.serves',
      'calories': 'metadata.calories', 'kcal': 'metadata.calories',
      'description': 'description', 'details': 'description',
    },
  },

  healthcare: {
    industry: 'healthcare',
    displayName: 'Healthcare / Clinic',
    description: 'Clinics, hospitals, pharmacies, diagnostic centres, dental practices',
    primaryTypes: [
      { type: 'service', labelOverride: 'Medical Service', labelPluralOverride: 'Medical Services' },
      { type: 'product', labelOverride: 'Medication', labelPluralOverride: 'Medications', roleOverride: 'both' },
      { type: 'supply', labelOverride: 'Medical Supply', labelPluralOverride: 'Medical Supplies' },
    ],
    secondaryTypes: [
      { type: 'package', reason: 'Create health check packages or treatment bundles' },
      { type: 'subscription', reason: 'Offer health plans or retainer packages' },
      { type: 'programme', reason: 'Track wellness programmes or therapy courses' },
      { type: 'asset', reason: 'Track equipment or room bookings' },
    ],
    defaultUnit: 'units',
    suggestedCategories: [
      'Consultation', 'Laboratory', 'Pharmacy', 'Dental', 'Surgery',
      'Imaging', 'Physiotherapy', 'Wellness', 'Emergency',
    ],
    importAliases: {
      'drug name': 'name', 'medication': 'name', 'medicine': 'name', 'service': 'name',
      'price': 'price', 'fee': 'price', 'charge': 'price', 'consultation fee': 'price',
      'cost': 'cost', 'purchase price': 'cost',
      'category': 'category', 'department': 'category', 'specialty': 'category',
      'dosage': 'metadata.strength', 'strength': 'metadata.strength',
      'form': 'metadata.dosage_form', 'dosage form': 'metadata.dosage_form',
      'nafdac': 'metadata.nafdac_no', 'nafdac no': 'metadata.nafdac_no',
      'batch': 'sku', 'batch no': 'sku',
      'description': 'description', 'indication': 'description',
    },
  },

  education: {
    industry: 'education',
    displayName: 'Education',
    description: 'Schools, training centres, tutoring, online courses, coaching',
    primaryTypes: [
      { type: 'programme', labelOverride: 'Course', labelPluralOverride: 'Courses' },
      { type: 'product', labelOverride: 'Learning Material', labelPluralOverride: 'Learning Materials' },
      { type: 'service', labelOverride: 'Tutoring Service', labelPluralOverride: 'Tutoring Services' },
    ],
    secondaryTypes: [
      { type: 'supply', reason: 'Track school supplies and stationery' },
      { type: 'package', reason: 'Create course bundles or term packages' },
      { type: 'subscription', reason: 'Offer ongoing tutoring or access plans' },
      { type: 'asset', reason: 'Track classroom or facility bookings' },
    ],
    defaultUnit: 'units',
    suggestedCategories: [
      'Primary', 'Secondary', 'Tertiary', 'Professional Development',
      'Languages', 'Technology', 'Arts', 'Sciences', 'Exam Prep',
    ],
    importAliases: {
      'course name': 'name', 'programme': 'name', 'class': 'name', 'subject': 'name',
      'fee': 'price', 'tuition': 'price', 'course fee': 'price', 'term fee': 'price',
      'category': 'category', 'department': 'category', 'faculty': 'category',
      'duration': 'metadata.duration_weeks', 'weeks': 'metadata.duration_weeks',
      'capacity': 'metadata.class_capacity', 'class size': 'metadata.class_capacity',
      'term': 'metadata.term', 'session': 'metadata.term',
      'level': 'metadata.level', 'age range': 'metadata.age_range',
      'description': 'description', 'details': 'description',
    },
  },

  real_estate: {
    industry: 'real_estate',
    displayName: 'Real Estate',
    description: 'Property sales, rentals, property management, real estate agencies',
    primaryTypes: [
      { type: 'property' },
      { type: 'service', labelOverride: 'Agency Service', labelPluralOverride: 'Agency Services' },
    ],
    secondaryTypes: [
      { type: 'package', reason: 'Create property viewing packages or management bundles' },
      { type: 'subscription', reason: 'Offer property management retainers' },
    ],
    defaultUnit: 'units',
    suggestedCategories: [
      'Residential Sale', 'Residential Rent', 'Commercial Sale', 'Commercial Rent',
      'Land', 'Short-Let', 'Property Management',
    ],
    importAliases: {
      'property': 'name', 'title': 'name', 'listing': 'name', 'address': 'name',
      'price': 'price', 'asking price': 'price', 'rent': 'price', 'value': 'price',
      'type': 'metadata.property_type', 'property type': 'metadata.property_type',
      'bedrooms': 'metadata.bedrooms', 'beds': 'metadata.bedrooms',
      'bathrooms': 'metadata.bathrooms', 'baths': 'metadata.bathrooms',
      'size': 'metadata.sqm', 'sqm': 'metadata.sqm', 'area': 'metadata.sqm',
      'location': 'metadata.location', 'area': 'metadata.location',
      'state': 'metadata.state', 'lga': 'metadata.lga',
      'furnishing': 'metadata.furnishing', 'furnished': 'metadata.furnishing',
      'title doc': 'metadata.title_document', 'document': 'metadata.title_document',
      'description': 'description', 'details': 'description',
    },
  },

  manufacturing: {
    industry: 'manufacturing',
    displayName: 'Manufacturing',
    description: 'Factories, production, FMCG manufacturing, processing',
    primaryTypes: [
      { type: 'product', labelOverride: 'Finished Good', labelPluralOverride: 'Finished Goods' },
      { type: 'ingredient', labelOverride: 'Raw Material', labelPluralOverride: 'Raw Materials' },
      { type: 'supply', labelOverride: 'Production Supply', labelPluralOverride: 'Production Supplies' },
    ],
    secondaryTypes: [
      { type: 'package', reason: 'Create product bundles or wholesale packages' },
      { type: 'service', reason: 'Track custom manufacturing or OEM services' },
      { type: 'asset', reason: 'Track equipment and machinery' },
    ],
    defaultUnit: 'units',
    suggestedCategories: [
      'Finished Goods', 'Raw Materials', 'Work-in-Progress', 'Packaging',
      'Spare Parts', 'Chemicals', 'Consumables',
    ],
    importAliases: {
      'product': 'name', 'item': 'name', 'material': 'name', 'part': 'name',
      'selling price': 'price', 'unit price': 'price',
      'cost': 'cost', 'material cost': 'cost', 'production cost': 'cost',
      'sku': 'sku', 'part number': 'sku', 'item code': 'sku',
      'category': 'category', 'type': 'category',
      'weight': 'metadata.weight_kg', 'material': 'metadata.material',
      'son': 'metadata.son_certified', 'nafdac': 'metadata.nafdac_no',
      'stock': 'stock_quantity', 'qty': 'stock_quantity',
      'description': 'description', 'specification': 'description',
    },
  },

  logistics: {
    industry: 'logistics',
    displayName: 'Logistics & Transport',
    description: 'Courier, haulage, freight, warehousing, fleet management',
    primaryTypes: [
      { type: 'service', labelOverride: 'Delivery Service', labelPluralOverride: 'Delivery Services' },
      { type: 'asset', labelOverride: 'Vehicle', labelPluralOverride: 'Fleet' },
      { type: 'supply', labelOverride: 'Fleet Supply', labelPluralOverride: 'Fleet Supplies' },
    ],
    secondaryTypes: [
      { type: 'package', reason: 'Create delivery packages or bulk shipping deals' },
      { type: 'subscription', reason: 'Offer logistics retainers or monthly plans' },
    ],
    defaultUnit: 'trips',
    suggestedCategories: [
      'Same-Day Delivery', 'Next-Day Delivery', 'Interstate', 'International',
      'Warehousing', 'Last-Mile', 'Bulk/Haulage', 'Express',
    ],
    importAliases: {
      'service': 'name', 'route': 'name', 'delivery type': 'name',
      'rate': 'price', 'price': 'price', 'charge': 'price', 'fee': 'price',
      'cost': 'cost', 'fuel cost': 'cost',
      'category': 'category', 'service type': 'category',
      'sla': 'metadata.sla_hours', 'delivery time': 'metadata.sla_hours',
      'coverage': 'metadata.coverage_area', 'route': 'metadata.coverage_area',
      'max weight': 'metadata.max_weight_kg', 'weight limit': 'metadata.max_weight_kg',
      'description': 'description', 'details': 'description',
    },
  },

  professional_services: {
    industry: 'professional_services',
    displayName: 'Professional Services',
    description: 'Law firms, accounting, consulting, agencies, freelancers',
    primaryTypes: [
      { type: 'service' },
      { type: 'package', labelOverride: 'Service Package', labelPluralOverride: 'Service Packages' },
      { type: 'subscription', labelOverride: 'Retainer', labelPluralOverride: 'Retainers' },
    ],
    secondaryTypes: [
      { type: 'product', reason: 'Sell templates, guides, or digital products' },
      { type: 'programme', reason: 'Offer training or workshop programmes' },
    ],
    defaultUnit: 'hours',
    suggestedCategories: [
      'Consultation', 'Advisory', 'Audit', 'Compliance', 'Litigation',
      'Tax', 'Corporate', 'Training', 'Strategy',
    ],
    importAliases: {
      'service': 'name', 'offering': 'name', 'engagement': 'name',
      'fee': 'price', 'rate': 'price', 'hourly rate': 'price', 'price': 'price',
      'cost': 'cost',
      'category': 'category', 'practice area': 'category', 'department': 'category',
      'duration': 'metadata.duration_minutes', 'hours': 'metadata.min_engagement_hours',
      'rate type': 'metadata.rate_type', 'billing': 'metadata.rate_type',
      'description': 'description', 'scope': 'description',
    },
  },

  agriculture: {
    industry: 'agriculture',
    displayName: 'Agriculture / Farming',
    description: 'Farms, agribusiness, processing, livestock, fisheries',
    primaryTypes: [
      { type: 'product', labelOverride: 'Farm Produce', labelPluralOverride: 'Farm Produce' },
      { type: 'ingredient', labelOverride: 'Farm Input', labelPluralOverride: 'Farm Inputs' },
      { type: 'supply', labelOverride: 'Farm Supply', labelPluralOverride: 'Farm Supplies' },
    ],
    secondaryTypes: [
      { type: 'service', reason: 'Track processing or distribution services' },
      { type: 'package', reason: 'Create produce bundles or wholesale packages' },
      { type: 'asset', reason: 'Track farm equipment and machinery' },
    ],
    defaultUnit: 'kg',
    suggestedCategories: [
      'Grains', 'Tubers', 'Vegetables', 'Fruits', 'Livestock', 'Poultry',
      'Fish', 'Dairy', 'Processed', 'Seeds & Seedlings', 'Fertiliser',
    ],
    importAliases: {
      'produce': 'name', 'crop': 'name', 'product': 'name', 'item': 'name',
      'price': 'price', 'selling price': 'price', 'market price': 'price',
      'cost': 'cost', 'production cost': 'cost', 'input cost': 'cost',
      'category': 'category', 'type': 'category',
      'grade': 'metadata.grade', 'quality': 'metadata.grade',
      'origin': 'metadata.origin_state', 'state': 'metadata.origin_state',
      'harvest': 'metadata.harvest_season', 'season': 'metadata.harvest_season',
      'weight': 'metadata.weight', 'quantity': 'stock_quantity',
      'description': 'description', 'details': 'description',
    },
  },
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the industry bundle for an account, falling back to a generic default.
 * Returns a bundle that enables product + service as minimum.
 */
export function getIndustryBundle(industry: string): IndustryItemTypeBundle {
  return INDUSTRY_BUNDLES[industry] ?? {
    industry: industry,
    displayName: industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: 'Custom industry configuration',
    primaryTypes: [
      { type: 'product' as ItemType },
      { type: 'service' as ItemType },
    ],
    secondaryTypes: [
      { type: 'supply' as ItemType, reason: 'Track operational supplies' },
      { type: 'package' as ItemType, reason: 'Create bundled offerings' },
    ],
    defaultUnit: 'units',
    suggestedCategories: [],
    importAliases: {
      'name': 'name', 'item': 'name', 'product': 'name',
      'price': 'price', 'cost': 'cost', 'category': 'category',
      'description': 'description', 'sku': 'sku',
    },
  }
}

/**
 * Get all enabled item types for an account.
 * Merges industry defaults with any custom account_item_type_config.
 */
export function getEnabledItemTypes(
  industry: string,
  accountConfigs?: { item_type: string; is_enabled: boolean }[]
): ItemType[] {
  const bundle = getIndustryBundle(industry)
  const primaryTypes = bundle.primaryTypes.map(t => t.type)

  if (!accountConfigs || accountConfigs.length === 0) {
    return primaryTypes
  }

  // Start with primary types, then apply account overrides
  const enabledSet = new Set<ItemType>(primaryTypes)

  for (const config of accountConfigs) {
    if (config.is_enabled) {
      enabledSet.add(config.item_type as ItemType)
    } else {
      enabledSet.delete(config.item_type as ItemType)
    }
  }

  return Array.from(enabledSet)
}

/**
 * Get the display label for an item type, considering industry overrides.
 */
export function getItemTypeLabel(
  itemType: ItemType,
  industry: string,
  plural: boolean = false
): string {
  const bundle = getIndustryBundle(industry)
  const override = bundle.primaryTypes.find(t => t.type === itemType)

  if (override) {
    return plural
      ? (override.labelPluralOverride ?? ITEM_TYPE_REGISTRY[itemType].labelPlural)
      : (override.labelOverride ?? ITEM_TYPE_REGISTRY[itemType].label)
  }

  return plural
    ? ITEM_TYPE_REGISTRY[itemType].labelPlural
    : ITEM_TYPE_REGISTRY[itemType].label
}

/**
 * Smart import field matching.
 * Given a column header from a client's spreadsheet, find the best BGE field match.
 * Uses the industry's import aliases for intelligent matching.
 */
export function matchImportField(
  columnHeader: string,
  industry: string
): string | null {
  const bundle = getIndustryBundle(industry)
  const normalised = columnHeader.toLowerCase().trim()

  // Exact match first
  if (bundle.importAliases[normalised]) {
    return bundle.importAliases[normalised]
  }

  // Partial match (column contains alias)
  for (const [alias, field] of Object.entries(bundle.importAliases)) {
    if (normalised.includes(alias) || alias.includes(normalised)) {
      return field
    }
  }

  // Generic fallback matches
  const genericMap: Record<string, string> = {
    'name': 'name', 'title': 'name', 'item': 'name', 'product': 'name',
    'price': 'price', 'amount': 'price', 'rate': 'price',
    'cost': 'cost', 'buying': 'cost',
    'category': 'category', 'group': 'category', 'type': 'category',
    'description': 'description', 'desc': 'description', 'details': 'description',
    'sku': 'sku', 'code': 'sku', 'id': 'sku',
    'image': 'image_url', 'photo': 'image_url', 'picture': 'image_url',
    'tag': 'tags', 'tags': 'tags', 'label': 'tags',
    'status': 'status', 'active': 'status',
  }

  for (const [keyword, field] of Object.entries(genericMap)) {
    if (normalised.includes(keyword)) {
      return field
    }
  }

  return null
}
