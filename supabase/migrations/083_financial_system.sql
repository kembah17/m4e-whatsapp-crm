-- Migration 083: Financial System Foundation
-- Adds expenses tracking, revenue centers, and financial targets

-- A. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  revenue_center_id UUID,  -- FK added after revenue_centers created
  category TEXT NOT NULL,  -- rent, utilities, salaries, supplies, marketing, transport, logistics, maintenance, other
  subcategory TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'NGN',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,  -- cash, bank_transfer, pos, card, mobile_transfer
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,  -- weekly, monthly, quarterly, annually
  vendor TEXT,
  approved_by UUID REFERENCES auth.users(id),
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- B. Revenue centers
CREATE TABLE IF NOT EXISTS revenue_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, name)
);

-- C. Financial targets
CREATE TABLE IF NOT EXISTS financial_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- revenue, profit, collections, expenses
  period_type TEXT NOT NULL,  -- monthly, quarterly, annually
  period_start DATE NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  revenue_center_id UUID REFERENCES revenue_centers(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D. Add FK for expenses -> revenue_centers
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_revenue_center
  FOREIGN KEY (revenue_center_id) REFERENCES revenue_centers(id) ON DELETE SET NULL;

-- E. Add attribution columns to existing tables
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS revenue_center_id UUID REFERENCES revenue_centers(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE offline_payments ADD COLUMN IF NOT EXISTS revenue_center_id UUID REFERENCES revenue_centers(id) ON DELETE SET NULL;
ALTER TABLE offline_payments ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS revenue_center_id UUID REFERENCES revenue_centers(id) ON DELETE SET NULL;

-- F. RLS Policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_account_isolation" ON expenses
  FOR ALL USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "revenue_centers_account_isolation" ON revenue_centers
  FOR ALL USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "financial_targets_account_isolation" ON financial_targets
  FOR ALL USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));

-- G. Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_account_date ON expenses(account_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(account_id, category);
CREATE INDEX IF NOT EXISTS idx_revenue_centers_account ON revenue_centers(account_id);
CREATE INDEX IF NOT EXISTS idx_financial_targets_account ON financial_targets(account_id, target_type, period_start);
CREATE INDEX IF NOT EXISTS idx_invoices_revenue_center ON invoices(revenue_center_id) WHERE revenue_center_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_salesperson ON invoices(salesperson_id) WHERE salesperson_id IS NOT NULL;
