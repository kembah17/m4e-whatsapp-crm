-- Migration 069: Support Desk / Help Desk / Ticket System
-- Created: 2026-07-23
-- Depends on: 068_business_growth_engine.sql

-- ============================================================
-- Table: ticket_categories
-- ============================================================
CREATE TABLE ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'tag',
  color TEXT DEFAULT '#6366f1',
  auto_assign_to UUID REFERENCES profiles(id),
  sla_policy_id UUID, -- FK added after sla_policies created
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Table: sla_policies
-- ============================================================
CREATE TABLE sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('critical','high','normal','low')),
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  escalation_minutes INTEGER,
  escalate_to UUID REFERENCES profiles(id),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from ticket_categories to sla_policies
ALTER TABLE ticket_categories ADD CONSTRAINT fk_ticket_categories_sla
  FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id);

-- ============================================================
-- Table: support_tickets
-- ============================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  category_id UUID REFERENCES ticket_categories(id),
  sla_policy_id UUID REFERENCES sla_policies(id),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','waiting_internal','escalated','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical','high','normal','low')),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','manual','ai_handoff','sentiment_escalation','email')),
  assigned_to UUID REFERENCES profiles(id),
  escalated_to UUID REFERENCES profiles(id),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_first_response_due TIMESTAMPTZ,
  sla_resolution_due TIMESTAMPTZ,
  sla_first_response_breached BOOLEAN DEFAULT false,
  sla_resolution_breached BOOLEAN DEFAULT false,
  ai_suggested_category TEXT,
  ai_suggested_priority TEXT,
  ai_confidence NUMERIC(3,2),
  sentiment_score NUMERIC(3,2),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Table: ticket_messages
-- ============================================================
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  sender_type TEXT NOT NULL DEFAULT 'agent' CHECK (sender_type IN ('agent','customer','system','ai')),
  message_type TEXT NOT NULL DEFAULT 'reply' CHECK (message_type IN ('reply','internal_note','status_change','assignment','escalation','sla_warning','resolution')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT false,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Table: ticket_satisfaction
-- ============================================================
CREATE TABLE ticket_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  survey_sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_support_tickets_account ON support_tickets(account_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(account_id, status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_tickets_contact ON support_tickets(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_support_tickets_priority ON support_tickets(account_id, priority);
CREATE INDEX idx_support_tickets_sla_due ON support_tickets(sla_first_response_due) WHERE sla_first_response_breached = false;
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_categories_account ON ticket_categories(account_id);
CREATE INDEX idx_sla_policies_account ON sla_policies(account_id);
CREATE INDEX idx_ticket_satisfaction_ticket ON ticket_satisfaction(ticket_id);
CREATE UNIQUE INDEX idx_support_tickets_number ON support_tickets(account_id, ticket_number);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_satisfaction ENABLE ROW LEVEL SECURITY;

-- ticket_categories policies
CREATE POLICY "ticket_categories_select" ON ticket_categories FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "ticket_categories_insert" ON ticket_categories FOR INSERT WITH CHECK (is_account_member(account_id));
CREATE POLICY "ticket_categories_update" ON ticket_categories FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "ticket_categories_delete" ON ticket_categories FOR DELETE USING (is_account_member(account_id));

-- sla_policies policies
CREATE POLICY "sla_policies_select" ON sla_policies FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "sla_policies_insert" ON sla_policies FOR INSERT WITH CHECK (is_account_member(account_id));
CREATE POLICY "sla_policies_update" ON sla_policies FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "sla_policies_delete" ON sla_policies FOR DELETE USING (is_account_member(account_id));

-- support_tickets policies
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (is_account_member(account_id));
CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "support_tickets_delete" ON support_tickets FOR DELETE USING (is_account_member(account_id));

-- ticket_messages policies
CREATE POLICY "ticket_messages_select" ON ticket_messages FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "ticket_messages_insert" ON ticket_messages FOR INSERT WITH CHECK (is_account_member(account_id));
CREATE POLICY "ticket_messages_update" ON ticket_messages FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "ticket_messages_delete" ON ticket_messages FOR DELETE USING (is_account_member(account_id));

-- ticket_satisfaction policies
CREATE POLICY "ticket_satisfaction_select" ON ticket_satisfaction FOR SELECT USING (is_account_member(account_id));
CREATE POLICY "ticket_satisfaction_insert" ON ticket_satisfaction FOR INSERT WITH CHECK (is_account_member(account_id));
CREATE POLICY "ticket_satisfaction_update" ON ticket_satisfaction FOR UPDATE USING (is_account_member(account_id));
CREATE POLICY "ticket_satisfaction_delete" ON ticket_satisfaction FOR DELETE USING (is_account_member(account_id));

-- Super admin policies
CREATE POLICY "ticket_categories_super_admin" ON ticket_categories FOR ALL USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()));
CREATE POLICY "sla_policies_super_admin" ON sla_policies FOR ALL USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()));
CREATE POLICY "support_tickets_super_admin" ON support_tickets FOR ALL USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ticket_messages_super_admin" ON ticket_messages FOR ALL USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ticket_satisfaction_super_admin" ON ticket_satisfaction FOR ALL USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- RPC: Generate next ticket number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_ticket_number(p_account_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM support_tickets WHERE account_id = p_account_id;
  RETURN 'TKT-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- RPC: Get support dashboard stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_support_stats(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_open', COUNT(*) FILTER (WHERE status IN ('open','in_progress','waiting_customer','waiting_internal','escalated')),
    'total_resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'total_closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'critical_open', COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('resolved','closed')),
    'high_open', COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('resolved','closed')),
    'sla_breached', COUNT(*) FILTER (WHERE (sla_first_response_breached = true OR sla_resolution_breached = true) AND status NOT IN ('resolved','closed')),
    'avg_resolution_hours', ROUND(EXTRACT(EPOCH FROM AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL)) / 3600, 1),
    'avg_first_response_hours', ROUND(EXTRACT(EPOCH FROM AVG(first_response_at - created_at) FILTER (WHERE first_response_at IS NOT NULL)) / 3600, 1),
    'escalated', COUNT(*) FILTER (WHERE status = 'escalated'),
    'waiting_customer', COUNT(*) FILTER (WHERE status = 'waiting_customer'),
    'today_created', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'today_resolved', COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE)
  ) INTO v_result
  FROM support_tickets
  WHERE account_id = p_account_id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION generate_ticket_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_support_stats(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION generate_ticket_number(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_support_stats(UUID) FROM anon;
