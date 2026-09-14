// Financial system types for the Business Growth Engine

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'supplies'
  | 'marketing'
  | 'transport'
  | 'logistics'
  | 'maintenance'
  | 'other'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  utilities: 'Utilities',
  salaries: 'Salaries & Wages',
  supplies: 'Supplies',
  marketing: 'Marketing & Advertising',
  transport: 'Transport',
  logistics: 'Logistics',
  maintenance: 'Maintenance',
  other: 'Other',
}

export interface Expense {
  id: string
  account_id: string
  branch_id: string | null
  revenue_center_id: string | null
  category: ExpenseCategory
  subcategory: string | null
  description: string
  amount: number
  currency: string
  expense_date: string
  payment_method: string | null
  receipt_url: string | null
  is_recurring: boolean
  recurring_frequency: string | null
  vendor: string | null
  approved_by: string | null
  recorded_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RevenueCenter {
  id: string
  account_id: string
  branch_id: string | null
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface FinancialTarget {
  id: string
  account_id: string
  target_type: 'revenue' | 'profit' | 'collections' | 'expenses'
  period_type: 'monthly' | 'quarterly' | 'annually'
  period_start: string
  target_amount: number
  revenue_center_id: string | null
  branch_id: string | null
  notes: string | null
  created_at: string
}

export interface PeriodMetrics {
  totalSales: number
  totalCOGS: number
  grossProfit: number
  grossMargin: number
  totalCollected: number
  totalOutstanding: number
  totalExpenses: number
  netPosition: number
}

export interface FinancialSummary extends PeriodMetrics {
  previousPeriod: PeriodMetrics
  changePercent: PeriodMetrics
}

export interface AgingBucket {
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_90_plus: number
  attention_required: number
}

export interface RevenueCenterPerformance {
  center_name: string
  revenue: number
  cogs: number
  profit: number
  margin: number
  collections_rate: number
  growth_vs_previous: number
  status: 'green' | 'yellow' | 'red'
}

export interface FinancialDiagnostic {
  id: string
  message: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  priority: number
  metric_value: number | null
  comparison_value: number | null
  suggested_action: string
}

export interface IndustryMetricConfig {
  industry: string
  headline_metrics: Array<{ key: string; label: string; format: 'currency' | 'percent' | 'number' }>
  detail_metrics: Array<{ key: string; label: string; format: 'currency' | 'percent' | 'number' }>
}

export interface RevenueByChannel {
  channel: string
  amount: number
  count: number
  percentage: number
}

export interface TopCustomer {
  contact_name: string
  contact_id: string
  revenue: number
  orders: number
  outstanding: number
}

export interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  collections: number
  profit: number
}
