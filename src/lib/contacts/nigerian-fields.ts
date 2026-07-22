import { createClient } from '@/lib/supabase/client'
import type {
  ContactType,
  PreferredLanguage,
  NigerianState,
  NigerianLGA,
} from '@/types/business-growth'

// ============================================================
// Nigerian States & LGAs
// ============================================================

// Hardcoded fallback - all 37 Nigerian states + FCT
export const NIGERIAN_STATES_FALLBACK: Array<{ name: string; code: string; geo_zone: string }> = [
  { name: 'Abia', code: 'AB', geo_zone: 'South East' },
  { name: 'Adamawa', code: 'AD', geo_zone: 'North East' },
  { name: 'Akwa Ibom', code: 'AK', geo_zone: 'South South' },
  { name: 'Anambra', code: 'AN', geo_zone: 'South East' },
  { name: 'Bauchi', code: 'BA', geo_zone: 'North East' },
  { name: 'Bayelsa', code: 'BY', geo_zone: 'South South' },
  { name: 'Benue', code: 'BE', geo_zone: 'North Central' },
  { name: 'Borno', code: 'BO', geo_zone: 'North East' },
  { name: 'Cross River', code: 'CR', geo_zone: 'South South' },
  { name: 'Delta', code: 'DE', geo_zone: 'South South' },
  { name: 'Ebonyi', code: 'EB', geo_zone: 'South East' },
  { name: 'Edo', code: 'ED', geo_zone: 'South South' },
  { name: 'Ekiti', code: 'EK', geo_zone: 'South West' },
  { name: 'Enugu', code: 'EN', geo_zone: 'South East' },
  { name: 'Federal Capital Territory', code: 'FC', geo_zone: 'North Central' },
  { name: 'Gombe', code: 'GO', geo_zone: 'North East' },
  { name: 'Imo', code: 'IM', geo_zone: 'South East' },
  { name: 'Jigawa', code: 'JI', geo_zone: 'North West' },
  { name: 'Kaduna', code: 'KD', geo_zone: 'North West' },
  { name: 'Kano', code: 'KN', geo_zone: 'North West' },
  { name: 'Katsina', code: 'KT', geo_zone: 'North West' },
  { name: 'Kebbi', code: 'KE', geo_zone: 'North West' },
  { name: 'Kogi', code: 'KO', geo_zone: 'North Central' },
  { name: 'Kwara', code: 'KW', geo_zone: 'North Central' },
  { name: 'Lagos', code: 'LA', geo_zone: 'South West' },
  { name: 'Nasarawa', code: 'NA', geo_zone: 'North Central' },
  { name: 'Niger', code: 'NI', geo_zone: 'North Central' },
  { name: 'Ogun', code: 'OG', geo_zone: 'South West' },
  { name: 'Ondo', code: 'ON', geo_zone: 'South West' },
  { name: 'Osun', code: 'OS', geo_zone: 'South West' },
  { name: 'Oyo', code: 'OY', geo_zone: 'South West' },
  { name: 'Plateau', code: 'PL', geo_zone: 'North Central' },
  { name: 'Rivers', code: 'RI', geo_zone: 'South South' },
  { name: 'Sokoto', code: 'SO', geo_zone: 'North West' },
  { name: 'Taraba', code: 'TA', geo_zone: 'North East' },
  { name: 'Yobe', code: 'YO', geo_zone: 'North East' },
  { name: 'Zamfara', code: 'ZA', geo_zone: 'North West' },
]

/** Fetch Nigerian states from DB, fallback to hardcoded list */
export async function getNigerianStates(): Promise<NigerianState[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('nigerian_states')
      .select('id, name, code, geo_zone')
      .order('name')
    if (error || !data?.length) {
      return NIGERIAN_STATES_FALLBACK.map((s, i) => ({ id: i + 1, ...s }))
    }
    return data as NigerianState[]
  } catch {
    return NIGERIAN_STATES_FALLBACK.map((s, i) => ({ id: i + 1, ...s }))
  }
}

/** Fetch LGAs for a given state ID */
export async function getLGAsByState(stateId: number): Promise<NigerianLGA[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('nigerian_lgas')
      .select('id, state_id, name')
      .eq('state_id', stateId)
      .order('name')
    if (error) return []
    return (data ?? []) as NigerianLGA[]
  } catch {
    return []
  }
}

// ============================================================
// Dropdown Options
// ============================================================

export const PREFERRED_LANGUAGES: Array<{ value: PreferredLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'pcm', label: 'Pidgin English' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ig', label: 'Igbo' },
  { value: 'ha', label: 'Hausa' },
]

export const CONTACT_TYPES: Array<{ value: ContactType; label: string }> = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Business' },
  { value: 'wholesale', label: 'Wholesale' },
]

export const REFERRAL_SOURCES = [
  'WhatsApp',
  'Walk-in',
  'Social Media',
  'Friend/Family',
  'Google',
  'Flyer',
  'Radio',
  'TV',
  'Other',
] as const

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS' },
  { value: 'ussd', label: 'USSD' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
] as const

export const UNITS_OF_MEASURE = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'litres', label: 'Litres' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'cartons', label: 'Cartons' },
  { value: 'dozen', label: 'Dozen' },
] as const
