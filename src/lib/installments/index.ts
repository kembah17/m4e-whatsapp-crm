import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  InstallmentPlan,
  InstallmentScheduleEntry,
  InstallmentPlanStatus,
  InstallmentStatus,
  InstallmentFrequency,
  LateFeeType,
} from '@/types/business-growth'

/* ------------------------------------------------------------------ */
/*  Plan CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function getInstallmentPlans(
  accountId: string,
  filters?: {
    status?: InstallmentPlanStatus
    contact_id?: string
    limit?: number
    offset?: number
  },
) {
  const db = supabaseAdmin()
  let query = db
    .from('installment_plans')
    .select('*, contact:contacts!contact_id(name, phone)', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id)

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { plans: (data ?? []) as InstallmentPlan[], total: count ?? 0 }
}

export async function getInstallmentPlan(accountId: string, planId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('installment_plans')
    .select('*, contact:contacts!contact_id(name, phone)')
    .eq('account_id', accountId)
    .eq('id', planId)
    .single()
  if (error) throw new Error(error.message)
  return data as InstallmentPlan
}

export async function getInstallmentSchedule(planId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('installment_schedule')
    .select('*')
    .eq('plan_id', planId)
    .order('installment_number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InstallmentScheduleEntry[]
}

export async function createInstallmentPlan(
  accountId: string,
  input: {
    contact_id: string
    plan_name: string
    total_amount: number
    down_payment?: number
    number_of_installments: number
    frequency: InstallmentFrequency
    currency?: string
    grace_period_days?: number
    late_fee_type?: LateFeeType
    late_fee_amount?: number
    product_id?: string | null
    deal_id?: string | null
    debt_entry_id?: string | null
    notes?: string | null
    created_by?: string | null
  },
) {
  const db = supabaseAdmin()
  const downPayment = input.down_payment ?? 0
  const remaining = input.total_amount - downPayment
  const installmentAmount = Math.ceil((remaining / input.number_of_installments) * 100) / 100

  // Create the plan
  const { data: plan, error: planError } = await db
    .from('installment_plans')
    .insert({
      account_id: accountId,
      contact_id: input.contact_id,
      debt_entry_id: input.debt_entry_id ?? null,
      plan_name: input.plan_name,
      total_amount: input.total_amount,
      down_payment: downPayment,
      number_of_installments: input.number_of_installments,
      installment_amount: installmentAmount,
      frequency: input.frequency,
      currency: input.currency || 'NGN',
      status: 'active' as InstallmentPlanStatus,
      installments_paid: 0,
      total_paid: downPayment,
      grace_period_days: input.grace_period_days ?? 3,
      late_fee_type: input.late_fee_type || 'none',
      late_fee_amount: input.late_fee_amount ?? 0,
      product_id: input.product_id ?? null,
      deal_id: input.deal_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single()
  if (planError) throw new Error(planError.message)

  // Generate schedule entries
  const scheduleEntries = generateSchedule(
    accountId,
    plan.id,
    input.number_of_installments,
    installmentAmount,
    input.frequency,
    remaining,
  )

  const { error: schedError } = await db
    .from('installment_schedule')
    .insert(scheduleEntries)
  if (schedError) throw new Error(schedError.message)

  // Set next_due_date on plan
  if (scheduleEntries.length > 0) {
    await db
      .from('installment_plans')
      .update({ next_due_date: scheduleEntries[0].due_date })
      .eq('id', plan.id)
  }

  return plan as InstallmentPlan
}

export async function updateInstallmentPlan(
  accountId: string,
  planId: string,
  updates: Partial<Pick<InstallmentPlan,
    | 'plan_name' | 'status' | 'grace_period_days'
    | 'late_fee_type' | 'late_fee_amount' | 'notes'
  >>,
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('installment_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('id', planId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as InstallmentPlan
}

/* ------------------------------------------------------------------ */
/*  Payments                                                           */
/* ------------------------------------------------------------------ */

export async function recordInstallmentPayment(
  scheduleEntryId: string,
  payment: {
    amount: number
    payment_method?: string | null
    payment_reference?: string | null
    proof_url?: string | null
    notes?: string | null
  },
) {
  const db = supabaseAdmin()

  // Get the schedule entry
  const { data: entry, error: entryError } = await db
    .from('installment_schedule')
    .select('*, plan:installment_plans!plan_id(*)')
    .eq('id', scheduleEntryId)
    .single()
  if (entryError) throw new Error(entryError.message)

  const newAmountPaid = (entry.amount_paid || 0) + payment.amount
  const newStatus: InstallmentStatus =
    newAmountPaid >= entry.amount_due ? 'paid' : 'partial'

  // Update schedule entry
  const { error: updateError } = await db
    .from('installment_schedule')
    .update({
      amount_paid: newAmountPaid,
      status: newStatus,
      paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
      payment_method: payment.payment_method ?? null,
      payment_reference: payment.payment_reference ?? null,
      proof_url: payment.proof_url ?? null,
      notes: payment.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleEntryId)
  if (updateError) throw new Error(updateError.message)

  // Update plan totals
  const plan = entry.plan as InstallmentPlan
  const newTotalPaid = (plan.total_paid || 0) + payment.amount
  const newInstallmentsPaid = newStatus === 'paid'
    ? (plan.installments_paid || 0) + 1
    : plan.installments_paid || 0

  const planStatus: InstallmentPlanStatus =
    newInstallmentsPaid >= plan.number_of_installments ? 'completed' : 'active'

  // Find next due date
  const { data: nextEntries } = await db
    .from('installment_schedule')
    .select('due_date')
    .eq('plan_id', plan.id)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)

  const nextDueDate = nextEntries?.[0]?.due_date ?? null

  await db
    .from('installment_plans')
    .update({
      total_paid: newTotalPaid,
      installments_paid: newInstallmentsPaid,
      status: planStatus,
      next_due_date: nextDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.id)

  return { entry_status: newStatus, plan_status: planStatus }
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

export async function checkOverdueInstallments(accountId: string) {
  const db = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await db
    .from('installment_schedule')
    .update({ status: 'overdue' as InstallmentStatus, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .in('status', ['pending', 'partial'])
    .lt('due_date', today)
  if (error) throw new Error(error.message)
}

export async function getContactInstallments(accountId: string, contactId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('installment_plans')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as InstallmentPlan[]
}

/* ------------------------------------------------------------------ */
/*  Schedule Generation Helper                                         */
/* ------------------------------------------------------------------ */

function generateSchedule(
  accountId: string,
  planId: string,
  count: number,
  installmentAmount: number,
  frequency: InstallmentFrequency,
  totalRemaining: number,
): Array<Record<string, unknown>> {
  const entries: Array<Record<string, unknown>> = []
  const startDate = new Date()
  let runningTotal = 0

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(startDate)
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + 7 * (i + 1))
        break
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + 14 * (i + 1))
        break
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + (i + 1))
        break
      default: // custom - default to monthly
        dueDate.setMonth(dueDate.getMonth() + (i + 1))
    }

    // Last installment gets the remainder to avoid rounding issues
    const amount = i === count - 1
      ? totalRemaining - runningTotal
      : installmentAmount
    runningTotal += amount

    entries.push({
      account_id: accountId,
      plan_id: planId,
      installment_number: i + 1,
      amount_due: Math.round(amount * 100) / 100,
      amount_paid: 0,
      late_fee: 0,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending' as InstallmentStatus,
    })
  }

  return entries
}
