import type { IndustryWorkflowBundle } from './types'
import { RETAIL_SALES_BUNDLE, RETAIL_FULFILMENT_BUNDLE } from './industries/retail'
import { REAL_ESTATE_SALES_BUNDLE, REAL_ESTATE_TENANT_BUNDLE } from './industries/real-estate'
import { RESTAURANT_ORDER_BUNDLE, RESTAURANT_CATERING_BUNDLE } from './industries/restaurant'
import { PROFESSIONAL_SERVICES_SALES_BUNDLE, PROFESSIONAL_SERVICES_DELIVERY_BUNDLE } from './industries/professional-services'
import { HOTEL_RESERVATION_BUNDLE, HOTEL_EVENT_BUNDLE } from './industries/hotels'
import { HEALTHCARE_CONSULTATION_BUNDLE, HEALTHCARE_DISPENSING_BUNDLE } from './industries/healthcare'
import { AGRICULTURE_SALES_BUNDLE, AGRICULTURE_PROCUREMENT_BUNDLE } from './industries/agriculture'
import { MANUFACTURING_SALES_BUNDLE, MANUFACTURING_PRODUCTION_BUNDLE } from './industries/manufacturing'
import { LOGISTICS_SHIPMENT_BUNDLE, LOGISTICS_CLAIMS_BUNDLE } from './industries/logistics'
import { EDUCATION_ADMISSIONS_BUNDLE, EDUCATION_FEES_BUNDLE } from './industries/education'

export const ALL_BUNDLES: IndustryWorkflowBundle[] = [
  // Priority 1 — Core Industries
  RETAIL_SALES_BUNDLE,
  RETAIL_FULFILMENT_BUNDLE,
  REAL_ESTATE_SALES_BUNDLE,
  REAL_ESTATE_TENANT_BUNDLE,
  RESTAURANT_ORDER_BUNDLE,
  RESTAURANT_CATERING_BUNDLE,
  PROFESSIONAL_SERVICES_SALES_BUNDLE,
  PROFESSIONAL_SERVICES_DELIVERY_BUNDLE,
  HOTEL_RESERVATION_BUNDLE,
  HOTEL_EVENT_BUNDLE,
  // Priority 2 — Extended Industries
  HEALTHCARE_CONSULTATION_BUNDLE,
  HEALTHCARE_DISPENSING_BUNDLE,
  AGRICULTURE_SALES_BUNDLE,
  AGRICULTURE_PROCUREMENT_BUNDLE,
  MANUFACTURING_SALES_BUNDLE,
  MANUFACTURING_PRODUCTION_BUNDLE,
  LOGISTICS_SHIPMENT_BUNDLE,
  LOGISTICS_CLAIMS_BUNDLE,
  EDUCATION_ADMISSIONS_BUNDLE,
  EDUCATION_FEES_BUNDLE,
]

/** Look up a single bundle by its unique ID */
export function getBundleById(id: string): IndustryWorkflowBundle | undefined {
  return ALL_BUNDLES.find(b => b.id === id)
}

/** Get both bundles (sales + operations) for a given industry */
export function getBundlesByIndustry(industry: string): IndustryWorkflowBundle[] {
  return ALL_BUNDLES.filter(b => b.industry.toLowerCase() === industry.toLowerCase())
}

/** List all unique industry names */
export function getAvailableIndustries(): string[] {
  return [...new Set(ALL_BUNDLES.map(b => b.industry))]
}

/** Get bundles filtered by process type */
export function getBundlesByProcess(process: 'sales' | 'operations'): IndustryWorkflowBundle[] {
  return ALL_BUNDLES.filter(b => b.process === process)
}

/** Get total count of all bundles */
export function getBundleCount(): number {
  return ALL_BUNDLES.length
}
