-- Migration 068: Business Growth Engine
-- Unified migration for all operational features
-- Features: Nigerian Contact Fields, Trust Score, Inventory, Debt Book,
--           Installment Plans, Invoices/Quotes, Price Negotiation,
--           Voice Transcription, Receipt Scanner, AI Business Insights,
--           Referral Tracking, Loyalty Programme, Tier Gating, Dual Analytics
-- Date: 2026-07-22

-- ============================================================
-- 1. NIGERIAN CONTACT FIELDS (extend contacts table)
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lga TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'individual'; -- individual, business, wholesale
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trust_score NUMERIC(5,2) DEFAULT 50.00; -- 0-100
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_spent NUMERIC(15,2) DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze'; -- bronze, silver, gold, platinum

CREATE INDEX IF NOT EXISTS idx_contacts_state ON contacts(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_birthday ON contacts(birthday) WHERE birthday IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_trust_score ON contacts(trust_score);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_loyalty_tier ON contacts(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_contacts_referred_by ON contacts(referred_by_contact_id) WHERE referred_by_contact_id IS NOT NULL;

-- ============================================================
-- 2. TRUST SCORE CONFIGURATION
-- ============================================================
CREATE TABLE IF NOT EXISTS trust_score_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Weight factors (must sum to 100)
  weight_payment_speed INTEGER DEFAULT 25,
  weight_order_frequency INTEGER DEFAULT 20,
  weight_order_value INTEGER DEFAULT 15,
  weight_communication INTEGER DEFAULT 15,
  weight_referrals INTEGER DEFAULT 10,
  weight_returns INTEGER DEFAULT 10,
  weight_loyalty INTEGER DEFAULT 5,
  -- Thresholds
  high_trust_threshold NUMERIC(5,2) DEFAULT 75.00,
  low_trust_threshold NUMERIC(5,2) DEFAULT 35.00,
  -- Auto-update settings
  auto_recalculate BOOLEAN DEFAULT true,
  recalculate_interval_days INTEGER DEFAULT 7,
  last_recalculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE trust_score_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_score_config_account" ON trust_score_config
  FOR ALL USING (is_account_member(account_id));

-- Trust score history for tracking changes
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  old_score NUMERIC(5,2),
  new_score NUMERIC(5,2),
  change_reason TEXT, -- payment_received, order_completed, complaint, referral_made, return_filed
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_score_history_account" ON trust_score_history
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_trust_history_contact ON trust_score_history(contact_id, created_at DESC);

-- ============================================================
-- 3. INVENTORY MANAGEMENT (minimal - extend products)
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 20;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'pieces'; -- pieces, kg, litres, boxes, cartons, dozen
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_phone TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock_quantity, reorder_point) WHERE track_inventory = true;

-- Stock movement log
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- sale, restock, adjustment, return, damage, transfer
  quantity INTEGER NOT NULL, -- positive for in, negative for out
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type TEXT, -- order, invoice, manual, return
  reference_id UUID,
  notes TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_account" ON stock_movements
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- Inventory alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- low_stock, out_of_stock, overstock, expiring
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_alerts_account" ON inventory_alerts
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_unresolved ON inventory_alerts(account_id, is_resolved) WHERE is_resolved = false;

-- ============================================================
-- 4. DEBT / CREDIT BOOK
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  -- Debt details
  entry_type TEXT NOT NULL DEFAULT 'credit_sale', -- credit_sale, loan, service_credit, advance_payment, other
  description TEXT NOT NULL,
  original_amount NUMERIC(15,2) NOT NULL,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  outstanding NUMERIC(15,2) GENERATED ALWAYS AS (original_amount - amount_paid) STORED,
  currency TEXT DEFAULT 'NGN',
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  -- Status
  status TEXT DEFAULT 'outstanding', -- outstanding, partial, paid, overdue, written_off, disputed
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_frequency_days INTEGER DEFAULT 7, -- configurable per entry
  last_reminder_sent_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  max_reminders INTEGER DEFAULT 5, -- configurable
  -- References
  invoice_id UUID, -- links to invoices table
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE debt_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_entries_account" ON debt_entries
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_debt_entries_contact ON debt_entries(contact_id);
CREATE INDEX IF NOT EXISTS idx_debt_entries_status ON debt_entries(account_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_entries_due ON debt_entries(due_date) WHERE status IN ('outstanding', 'partial');
CREATE INDEX IF NOT EXISTS idx_debt_entries_overdue ON debt_entries(account_id, due_date) WHERE status = 'overdue';

-- Debt payments log
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  debt_entry_id UUID NOT NULL REFERENCES debt_entries(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  payment_method TEXT NOT NULL, -- bank_transfer, cash, pos, ussd, wallet, card, mobile_money
  payment_reference TEXT, -- bank ref, receipt number
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proof_url TEXT, -- uploaded receipt image
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_payments_account" ON debt_payments
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_debt_payments_entry ON debt_payments(debt_entry_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_contact ON debt_payments(contact_id);

-- ============================================================
-- 5. INSTALLMENT PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  debt_entry_id UUID REFERENCES debt_entries(id) ON DELETE SET NULL,
  -- Plan details
  plan_name TEXT NOT NULL, -- e.g. "iPhone 15 - 6 months"
  total_amount NUMERIC(15,2) NOT NULL,
  down_payment NUMERIC(15,2) DEFAULT 0,
  number_of_installments INTEGER NOT NULL,
  installment_amount NUMERIC(15,2) NOT NULL,
  frequency TEXT DEFAULT 'monthly', -- weekly, biweekly, monthly, custom
  currency TEXT DEFAULT 'NGN',
  -- Status
  status TEXT DEFAULT 'active', -- active, completed, defaulted, cancelled
  installments_paid INTEGER DEFAULT 0,
  total_paid NUMERIC(15,2) DEFAULT 0,
  next_due_date DATE,
  -- Late payment handling (configurable)
  grace_period_days INTEGER DEFAULT 3,
  late_fee_type TEXT DEFAULT 'none', -- none, fixed, percentage
  late_fee_amount NUMERIC(10,2) DEFAULT 0,
  -- References
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installment_plans_account" ON installment_plans
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_installment_plans_contact ON installment_plans(contact_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON installment_plans(account_id, status);
CREATE INDEX IF NOT EXISTS idx_installment_plans_next_due ON installment_plans(next_due_date) WHERE status = 'active';

-- Individual installment schedule entries
CREATE TABLE IF NOT EXISTS installment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount_due NUMERIC(15,2) NOT NULL,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  late_fee NUMERIC(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending', -- pending, paid, partial, overdue, waived
  payment_method TEXT,
  payment_reference TEXT,
  proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE installment_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installment_schedule_account" ON installment_schedule
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_installment_schedule_plan ON installment_schedule(plan_id, installment_number);
CREATE INDEX IF NOT EXISTS idx_installment_schedule_due ON installment_schedule(due_date) WHERE status IN ('pending', 'overdue');

-- ============================================================
-- 6. INVOICES & QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  -- Document type
  doc_type TEXT NOT NULL DEFAULT 'invoice', -- invoice, quotation, proforma, receipt, credit_note
  doc_number TEXT NOT NULL, -- auto-generated: INV-001, QUO-001, etc.
  -- Amounts
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'none', -- none, percentage, fixed
  discount_value NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0, -- VAT percentage
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  currency TEXT DEFAULT 'NGN',
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  valid_until DATE, -- for quotations
  -- Status
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, paid, partial, overdue, cancelled, expired
  -- Business details (snapshot at time of creation)
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_logo_url TEXT,
  business_bank_details JSONB DEFAULT '{}', -- {bank, account_number, account_name}
  -- Customer details (snapshot)
  customer_name TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  -- Content
  notes TEXT, -- appears on invoice
  terms TEXT, -- payment terms
  footer_text TEXT,
  -- References
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  converted_from_id UUID REFERENCES invoices(id) ON DELETE SET NULL, -- quotation -> invoice
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Metadata
  sent_via TEXT, -- whatsapp, email, manual
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  pdf_url TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_account" ON invoices
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(account_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(account_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_invoices_doc_number ON invoices(account_id, doc_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date) WHERE status IN ('sent', 'viewed', 'partial');

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  -- Item details
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL,
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
-- invoice_items inherits access through invoice_id join
CREATE POLICY "invoice_items_via_invoice" ON invoice_items
  FOR ALL USING (invoice_id IN (
    SELECT id FROM invoices WHERE account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  ));
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id, sort_order);

-- Add FK from debt_entries to invoices (now that invoices table exists)
ALTER TABLE debt_entries ADD CONSTRAINT fk_debt_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================================
-- 7. PRICE NEGOTIATION HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS price_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  -- Negotiation details
  original_price NUMERIC(15,2) NOT NULL,
  offered_price NUMERIC(15,2), -- what customer asked for
  counter_price NUMERIC(15,2), -- what business countered with
  final_price NUMERIC(15,2), -- agreed price
  discount_percent NUMERIC(5,2),
  -- Context
  negotiation_channel TEXT DEFAULT 'whatsapp', -- whatsapp, phone, in_person, email
  outcome TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired, counter_offered
  reason TEXT, -- why discount was given/refused
  valid_until DATE, -- price valid until
  -- Metadata
  notes TEXT,
  message_id TEXT, -- reference to WhatsApp message
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE price_negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_negotiations_account" ON price_negotiations
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_price_negotiations_contact ON price_negotiations(contact_id);
CREATE INDEX IF NOT EXISTS idx_price_negotiations_product ON price_negotiations(product_id);

-- ============================================================
-- 8. VOICE NOTE TRANSCRIPTION
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- WhatsApp message ID
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Audio details
  media_url TEXT,
  duration_seconds INTEGER,
  -- Transcription
  transcript TEXT,
  language TEXT DEFAULT 'en', -- detected language
  confidence NUMERIC(5,4), -- 0-1
  -- AI extraction
  summary TEXT, -- AI-generated summary
  action_items JSONB DEFAULT '[]', -- extracted action items
  sentiment TEXT, -- positive, negative, neutral
  key_phrases TEXT[] DEFAULT '{}',
  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  processing_time_ms INTEGER,
  -- Metadata
  model_used TEXT, -- which AI model was used
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_transcriptions_account" ON voice_transcriptions
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_message ON voice_transcriptions(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_contact ON voice_transcriptions(contact_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_search ON voice_transcriptions USING gin(to_tsvector('english', COALESCE(transcript, '')));

-- ============================================================
-- 9. RECEIPT SCANNER / PAYMENT PROOF
-- ============================================================
CREATE TABLE IF NOT EXISTS scanned_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Source
  source TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, upload, email
  media_url TEXT NOT NULL,
  message_id TEXT, -- WhatsApp message ID if from chat
  -- Extracted data
  extracted_amount NUMERIC(15,2),
  extracted_bank TEXT,
  extracted_account_number TEXT,
  extracted_account_name TEXT,
  extracted_reference TEXT,
  extracted_date DATE,
  extracted_sender TEXT,
  raw_text TEXT, -- full OCR text
  confidence NUMERIC(5,4), -- 0-1
  -- Matching
  matched_debt_id UUID REFERENCES debt_entries(id) ON DELETE SET NULL,
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_installment_id UUID REFERENCES installment_schedule(id) ON DELETE SET NULL,
  match_confidence NUMERIC(5,4),
  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, matched, unmatched, confirmed, rejected
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  -- Metadata
  model_used TEXT,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scanned_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scanned_receipts_account" ON scanned_receipts
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_scanned_receipts_contact ON scanned_receipts(contact_id);
CREATE INDEX IF NOT EXISTS idx_scanned_receipts_status ON scanned_receipts(account_id, status);

-- ============================================================
-- 10. AI BUSINESS INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Insight details
  insight_type TEXT NOT NULL, -- trend, anomaly, opportunity, risk, recommendation
  category TEXT NOT NULL, -- sales, customers, inventory, payments, engagement, seasonal
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Data backing
  metric_name TEXT, -- e.g. "weekend_conversion_rate"
  metric_value NUMERIC(15,4),
  comparison_value NUMERIC(15,4), -- baseline to compare against
  change_percent NUMERIC(8,2),
  -- Actionability
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  suggested_action TEXT,
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMPTZ,
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  -- Metadata
  data_points INTEGER, -- how many data points backed this insight
  confidence NUMERIC(5,4),
  model_used TEXT,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE business_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_insights_account" ON business_insights
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_business_insights_type ON business_insights(account_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_business_insights_priority ON business_insights(account_id, priority) WHERE is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_business_insights_category ON business_insights(account_id, category);

-- ============================================================
-- 11. REFERRAL TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Reward settings (configurable per business)
  is_active BOOLEAN DEFAULT true,
  reward_type TEXT DEFAULT 'points', -- points, discount_percent, discount_fixed, cashback, custom
  reward_value NUMERIC(10,2) DEFAULT 100, -- points or amount
  reward_currency TEXT DEFAULT 'NGN',
  -- Conditions
  require_purchase BOOLEAN DEFAULT true, -- referred person must purchase
  min_purchase_amount NUMERIC(15,2) DEFAULT 0,
  max_referrals_per_month INTEGER DEFAULT 0, -- 0 = unlimited
  -- Messaging
  referral_message_template TEXT DEFAULT 'Hi! I think you would love {business_name}. Tell them {referrer_name} sent you!',
  thank_you_message TEXT DEFAULT 'Thank you for referring {referred_name}! You have earned {reward_value} {reward_type}.',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_config_account" ON referral_config
  FOR ALL USING (is_account_member(account_id));

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  referrer_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Referral details
  referral_code TEXT, -- unique code if using codes
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, word_of_mouth, social, email
  -- Status
  status TEXT DEFAULT 'pending', -- pending, contacted, converted, expired, rewarded
  converted_at TIMESTAMPTZ,
  -- Reward
  reward_type TEXT,
  reward_value NUMERIC(10,2),
  reward_issued BOOLEAN DEFAULT false,
  reward_issued_at TIMESTAMPTZ,
  -- Metadata
  first_purchase_amount NUMERIC(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_account" ON referrals
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_contact_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_contact_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(account_id, status);

-- ============================================================
-- 12. LOYALTY PROGRAMME
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  programme_name TEXT DEFAULT 'Loyalty Rewards',
  -- Points settings (configurable)
  points_per_naira NUMERIC(10,4) DEFAULT 0.1, -- 1 point per N10 spent
  points_per_referral INTEGER DEFAULT 100,
  points_per_review INTEGER DEFAULT 50,
  birthday_bonus_points INTEGER DEFAULT 200,
  -- Tier thresholds (configurable)
  silver_threshold INTEGER DEFAULT 500,
  gold_threshold INTEGER DEFAULT 2000,
  platinum_threshold INTEGER DEFAULT 5000,
  -- Tier benefits
  silver_discount_percent NUMERIC(5,2) DEFAULT 2.00,
  gold_discount_percent NUMERIC(5,2) DEFAULT 5.00,
  platinum_discount_percent NUMERIC(5,2) DEFAULT 10.00,
  -- Redemption
  points_to_naira_rate NUMERIC(10,4) DEFAULT 0.5, -- 1 point = N0.50
  min_redemption_points INTEGER DEFAULT 100,
  -- Expiry
  points_expire BOOLEAN DEFAULT false,
  points_expiry_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_config_account" ON loyalty_config
  FOR ALL USING (is_account_member(account_id));

-- Loyalty transactions (points earned/redeemed)
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  -- Transaction
  transaction_type TEXT NOT NULL, -- earn_purchase, earn_referral, earn_review, earn_birthday, earn_bonus, redeem, expire, adjust
  points INTEGER NOT NULL, -- positive for earn, negative for redeem/expire
  balance_after INTEGER NOT NULL,
  -- Reference
  description TEXT NOT NULL,
  reference_type TEXT, -- purchase, referral, review, manual, order
  reference_id UUID,
  -- Metadata
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_transactions_account" ON loyalty_transactions
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_contact ON loyalty_transactions(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(account_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_expiry ON loyalty_transactions(expires_at) WHERE expires_at IS NOT NULL AND points > 0;

-- ============================================================
-- 13. TIER GATING / FEATURE ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_access_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Current tier
  current_tier TEXT DEFAULT 'starter', -- starter, professional, business, enterprise
  -- Feature overrides (admin can enable/disable per account)
  feature_overrides JSONB DEFAULT '{}', -- {"debt_book": true, "loyalty": false}
  -- Usage limits
  max_contacts INTEGER DEFAULT 500,
  max_broadcasts_per_month INTEGER DEFAULT 10,
  max_campaigns INTEGER DEFAULT 3,
  max_invoices_per_month INTEGER DEFAULT 20,
  max_ai_queries_per_day INTEGER DEFAULT 50,
  -- Upsell tracking
  upsell_prompts_shown JSONB DEFAULT '{}', -- {"debt_book": "2026-07-01", ...}
  last_upsell_shown_at TIMESTAMPTZ,
  upsell_cooldown_days INTEGER DEFAULT 7,
  -- Preview mode
  preview_features TEXT[] DEFAULT '{}', -- features in preview/trial mode
  preview_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE feature_access_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_access_config_account" ON feature_access_config
  FOR ALL USING (is_account_member(account_id));

-- ============================================================
-- 14. OPERATIONAL ANALYTICS SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS operational_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Sales metrics
  total_revenue NUMERIC(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value NUMERIC(15,2) DEFAULT 0,
  -- Debt metrics
  total_outstanding NUMERIC(15,2) DEFAULT 0,
  total_overdue NUMERIC(15,2) DEFAULT 0,
  debt_entries_count INTEGER DEFAULT 0,
  overdue_entries_count INTEGER DEFAULT 0,
  -- Inventory metrics
  total_products INTEGER DEFAULT 0,
  low_stock_count INTEGER DEFAULT 0,
  out_of_stock_count INTEGER DEFAULT 0,
  inventory_value NUMERIC(15,2) DEFAULT 0,
  -- Customer metrics
  total_contacts INTEGER DEFAULT 0,
  new_contacts INTEGER DEFAULT 0,
  active_contacts INTEGER DEFAULT 0,
  avg_trust_score NUMERIC(5,2) DEFAULT 0,
  -- Engagement metrics
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  -- Loyalty metrics
  total_loyalty_points_issued INTEGER DEFAULT 0,
  total_loyalty_points_redeemed INTEGER DEFAULT 0,
  active_loyalty_members INTEGER DEFAULT 0,
  -- Referral metrics
  total_referrals INTEGER DEFAULT 0,
  converted_referrals INTEGER DEFAULT 0,
  referral_revenue NUMERIC(15,2) DEFAULT 0,
  -- Branch breakdown
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_snapshots_unique 
  ON operational_snapshots(account_id, snapshot_date, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::UUID));

ALTER TABLE operational_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operational_snapshots_account" ON operational_snapshots
  FOR ALL USING (is_account_member(account_id));
CREATE INDEX IF NOT EXISTS idx_operational_snapshots_date ON operational_snapshots(account_id, snapshot_date DESC);

-- ============================================================
-- 15. NIGERIAN STATES & LGA REFERENCE DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS nigerian_states (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- e.g. 'FC' for FCT, 'LA' for Lagos
  geo_zone TEXT NOT NULL -- North Central, North East, North West, South East, South South, South West
);

CREATE TABLE IF NOT EXISTS nigerian_lgas (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES nigerian_states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(state_id, name)
);

-- No RLS on reference tables - they are read-only public data
ALTER TABLE nigerian_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nigerian_states_read" ON nigerian_states FOR SELECT USING (true);
CREATE POLICY "nigerian_states_admin" ON nigerian_states FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
);

ALTER TABLE nigerian_lgas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nigerian_lgas_read" ON nigerian_lgas FOR SELECT USING (true);
CREATE POLICY "nigerian_lgas_admin" ON nigerian_lgas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
);

CREATE INDEX IF NOT EXISTS idx_nigerian_lgas_state ON nigerian_lgas(state_id);

-- Insert Nigerian states (37 states + FCT)
INSERT INTO nigerian_states (name, code, geo_zone) VALUES
  ('Abia', 'AB', 'South East'),
  ('Adamawa', 'AD', 'North East'),
  ('Akwa Ibom', 'AK', 'South South'),
  ('Anambra', 'AN', 'South East'),
  ('Bauchi', 'BA', 'North East'),
  ('Bayelsa', 'BY', 'South South'),
  ('Benue', 'BE', 'North Central'),
  ('Borno', 'BO', 'North East'),
  ('Cross River', 'CR', 'South South'),
  ('Delta', 'DE', 'South South'),
  ('Ebonyi', 'EB', 'South East'),
  ('Edo', 'ED', 'South South'),
  ('Ekiti', 'EK', 'South West'),
  ('Enugu', 'EN', 'South East'),
  ('Federal Capital Territory', 'FC', 'North Central'),
  ('Gombe', 'GO', 'North East'),
  ('Imo', 'IM', 'South East'),
  ('Jigawa', 'JI', 'North West'),
  ('Kaduna', 'KD', 'North West'),
  ('Kano', 'KN', 'North West'),
  ('Katsina', 'KT', 'North West'),
  ('Kebbi', 'KE', 'North West'),
  ('Kogi', 'KO', 'North Central'),
  ('Kwara', 'KW', 'North Central'),
  ('Lagos', 'LA', 'South West'),
  ('Nasarawa', 'NA', 'North Central'),
  ('Niger', 'NI', 'North Central'),
  ('Ogun', 'OG', 'South West'),
  ('Ondo', 'ON', 'South West'),
  ('Osun', 'OS', 'South West'),
  ('Oyo', 'OY', 'South West'),
  ('Plateau', 'PL', 'North Central'),
  ('Rivers', 'RI', 'South South'),
  ('Sokoto', 'SO', 'North West'),
  ('Taraba', 'TA', 'North East'),
  ('Yobe', 'YO', 'North East'),
  ('Zamfara', 'ZA', 'North West')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 16. RPC FUNCTIONS
-- ============================================================

-- Calculate trust score for a contact
CREATE OR REPLACE FUNCTION calculate_trust_score(p_account_id UUID, p_contact_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config trust_score_config%ROWTYPE;
  v_score NUMERIC(5,2) := 50.00;
  v_payment_score NUMERIC := 50;
  v_frequency_score NUMERIC := 50;
  v_value_score NUMERIC := 50;
  v_communication_score NUMERIC := 50;
  v_referral_score NUMERIC := 50;
  v_return_score NUMERIC := 50;
  v_loyalty_score NUMERIC := 50;
  v_total_orders INTEGER;
  v_total_spent NUMERIC;
  v_avg_sentiment NUMERIC;
  v_referral_count INTEGER;
  v_old_score NUMERIC;
BEGIN
  -- Get config (or use defaults)
  SELECT * INTO v_config FROM trust_score_config WHERE account_id = p_account_id;

  -- Get order stats
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_total_orders, v_total_spent
  FROM purchase_history
  WHERE account_id = p_account_id AND contact_id = p_contact_id;

  -- Frequency score (more orders = higher)
  v_frequency_score := LEAST(100, v_total_orders * 10);

  -- Value score (higher spend = higher)
  v_value_score := LEAST(100, (v_total_spent / GREATEST(1, v_total_orders)) / 100);

  -- Communication score (from sentiment)
  SELECT COALESCE(AVG(
    CASE sentiment
      WHEN 'positive' THEN 80
      WHEN 'neutral' THEN 50
      WHEN 'negative' THEN 20
      WHEN 'urgent' THEN 10
      ELSE 50
    END
  ), 50) INTO v_communication_score
  FROM message_sentiments ms
  JOIN messages m ON m.id::text = ms.message_id
  WHERE ms.account_id = p_account_id AND m.contact_id = p_contact_id;

  -- Referral score
  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE account_id = p_account_id AND referrer_contact_id = p_contact_id AND status = 'converted';
  v_referral_score := LEAST(100, v_referral_count * 25);

  -- Payment score (from debt history)
  SELECT COALESCE(100 - (COUNT(*) FILTER (WHERE status = 'overdue') * 20), 100)
  INTO v_payment_score
  FROM debt_entries
  WHERE account_id = p_account_id AND contact_id = p_contact_id;
  v_payment_score := GREATEST(0, v_payment_score);

  -- Loyalty score
  SELECT COALESCE(loyalty_points, 0) INTO v_loyalty_score
  FROM contacts WHERE id = p_contact_id;
  v_loyalty_score := LEAST(100, v_loyalty_score / 10);

  -- Weighted average
  v_score := (
    v_payment_score * COALESCE(v_config.weight_payment_speed, 25) +
    v_frequency_score * COALESCE(v_config.weight_order_frequency, 20) +
    v_value_score * COALESCE(v_config.weight_order_value, 15) +
    v_communication_score * COALESCE(v_config.weight_communication, 15) +
    v_referral_score * COALESCE(v_config.weight_referrals, 10) +
    v_payment_score * COALESCE(v_config.weight_returns, 10) +
    v_loyalty_score * COALESCE(v_config.weight_loyalty, 5)
  ) / 100.0;

  v_score := GREATEST(0, LEAST(100, v_score));

  -- Get old score for history
  SELECT trust_score INTO v_old_score FROM contacts WHERE id = p_contact_id;

  -- Update contact
  UPDATE contacts SET trust_score = v_score, trust_score_updated_at = now() WHERE id = p_contact_id;

  -- Log change if significant (> 2 points)
  IF ABS(COALESCE(v_old_score, 50) - v_score) > 2 THEN
    INSERT INTO trust_score_history (account_id, contact_id, old_score, new_score, change_reason, details)
    VALUES (p_account_id, p_contact_id, v_old_score, v_score, 'recalculation',
      jsonb_build_object('payment', v_payment_score, 'frequency', v_frequency_score,
        'value', v_value_score, 'communication', v_communication_score,
        'referrals', v_referral_score, 'loyalty', v_loyalty_score));
  END IF;

  RETURN v_score;
END;
$$;

-- Get operational dashboard summary
CREATE OR REPLACE FUNCTION get_operational_summary(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'debt', (
      SELECT jsonb_build_object(
        'total_outstanding', COALESCE(SUM(outstanding), 0),
        'total_overdue', COALESCE(SUM(outstanding) FILTER (WHERE status = 'overdue'), 0),
        'entries_count', COUNT(*),
        'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue')
      ) FROM debt_entries WHERE account_id = p_account_id AND status NOT IN ('paid', 'written_off')
    ),
    'inventory', (
      SELECT jsonb_build_object(
        'total_products', COUNT(*),
        'tracked_products', COUNT(*) FILTER (WHERE track_inventory = true),
        'low_stock', COUNT(*) FILTER (WHERE track_inventory = true AND stock_quantity <= reorder_point AND stock_quantity > 0),
        'out_of_stock', COUNT(*) FILTER (WHERE track_inventory = true AND stock_quantity <= 0),
        'total_value', COALESCE(SUM(stock_quantity * price) FILTER (WHERE track_inventory = true), 0)
      ) FROM products WHERE account_id = p_account_id AND status = 'active'
    ),
    'invoices', (
      SELECT jsonb_build_object(
        'total_unpaid', COALESCE(SUM(total - amount_paid) FILTER (WHERE status IN ('sent', 'viewed', 'partial')), 0),
        'total_overdue', COALESCE(SUM(total - amount_paid) FILTER (WHERE status = 'overdue'), 0),
        'pending_count', COUNT(*) FILTER (WHERE status IN ('draft', 'sent', 'viewed', 'partial')),
        'this_month_revenue', COALESCE(SUM(amount_paid) FILTER (WHERE date_trunc('month', issue_date) = date_trunc('month', CURRENT_DATE)), 0)
      ) FROM invoices WHERE account_id = p_account_id
    ),
    'loyalty', (
      SELECT jsonb_build_object(
        'active_members', COUNT(*) FILTER (WHERE loyalty_points > 0),
        'total_points_outstanding', COALESCE(SUM(loyalty_points), 0),
        'avg_trust_score', COALESCE(ROUND(AVG(trust_score), 1), 50)
      ) FROM contacts WHERE account_id = p_account_id
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'converted', COUNT(*) FILTER (WHERE status = 'converted'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'conversion_rate', CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC / COUNT(*) * 100, 1) ELSE 0 END
      ) FROM referrals WHERE account_id = p_account_id
    ),
    'installments', (
      SELECT jsonb_build_object(
        'active_plans', COUNT(*) FILTER (WHERE status = 'active'),
        'total_expected', COALESCE(SUM(total_amount - total_paid) FILTER (WHERE status = 'active'), 0),
        'overdue_installments', (
          SELECT COUNT(*) FROM installment_schedule s
          JOIN installment_plans p ON p.id = s.plan_id
          WHERE p.account_id = p_account_id AND s.status = 'overdue'
        )
      ) FROM installment_plans WHERE account_id = p_account_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_doc_number(p_account_id UUID, p_doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_prefix := CASE p_doc_type
    WHEN 'invoice' THEN 'INV'
    WHEN 'quotation' THEN 'QUO'
    WHEN 'proforma' THEN 'PRO'
    WHEN 'receipt' THEN 'REC'
    WHEN 'credit_note' THEN 'CN'
    ELSE 'DOC'
  END;

  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE account_id = p_account_id AND doc_type = p_doc_type;

  v_number := v_prefix || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

-- Security: revoke anon access on new functions
REVOKE EXECUTE ON FUNCTION calculate_trust_score(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_operational_summary(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_doc_number(UUID, TEXT) FROM anon;

-- Grant to authenticated
GRANT EXECUTE ON FUNCTION calculate_trust_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_operational_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_doc_number(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trust_score(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_operational_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION generate_doc_number(UUID, TEXT) TO service_role;
