-- 041_campaign_engine.sql
-- Campaign tracking, pre-built templates, and ROI attribution
-- Enables self-service campaign launching with automated tracking

-- ============================================================
-- 1. Campaign Templates (pre-built blueprints)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'reactivation', 'cart_recovery', 'post_purchase',
    'lifecycle', 'engagement', 'revenue', 'feedback'
  )),
  icon text NOT NULL DEFAULT 'Zap',
  -- Template configuration
  default_channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (default_channel IN ('whatsapp', 'email', 'sms', 'auto')),
  message_templates jsonb NOT NULL DEFAULT '[]',
  -- Sequence: array of {delay_minutes, message_key, channel, condition?}
  sequence_steps jsonb NOT NULL DEFAULT '[]',
  -- Audience filter: {segment?, recency?, tags?, min_purchases?, custom_filter?}
  audience_filter jsonb NOT NULL DEFAULT '{}',
  -- Expected metrics for ROI projection
  expected_open_rate decimal(5,2),
  expected_reply_rate decimal(5,2),
  expected_conversion_rate decimal(5,2),
  -- Metadata
  tier integer NOT NULL DEFAULT 1 CHECK (tier IN (1, 2, 3)),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS on templates - they are system-wide read-only
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_select ON campaign_templates FOR SELECT
  USING (true);

-- ============================================================
-- 2. Campaigns (user-launched instances of templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  template_id uuid REFERENCES campaign_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  -- Campaign configuration (copied from template + user customizations)
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'sms', 'auto')),
  message_templates jsonb NOT NULL DEFAULT '[]',
  sequence_steps jsonb NOT NULL DEFAULT '[]',
  audience_filter jsonb NOT NULL DEFAULT '{}',
  -- Schedule
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  -- Audience stats
  total_audience integer NOT NULL DEFAULT 0,
  -- Linked automation/broadcast IDs (created when campaign launches)
  automation_id uuid REFERENCES automations(id) ON DELETE SET NULL,
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE SET NULL,
  -- Metadata
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_account ON campaigns(account_id);
CREATE INDEX idx_campaigns_status ON campaigns(account_id, status);
CREATE INDEX idx_campaigns_template ON campaigns(template_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_select ON campaigns FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY campaigns_insert ON campaigns FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));
CREATE POLICY campaigns_update ON campaigns FOR UPDATE
  USING (is_account_member(account_id, 'admin'));
CREATE POLICY campaigns_delete ON campaigns FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- ============================================================
-- 3. Campaign Events (revenue attribution & tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'sent', 'delivered', 'read', 'replied', 'clicked',
    'converted', 'purchased', 'opted_out', 'failed'
  )),
  -- Revenue attribution
  revenue_amount decimal(12,2),
  purchase_id uuid REFERENCES purchase_history(id) ON DELETE SET NULL,
  -- Step tracking (which message in the sequence)
  sequence_step integer,
  channel text,
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_account ON campaign_events(account_id);
CREATE INDEX idx_campaign_events_contact ON campaign_events(contact_id);
CREATE INDEX idx_campaign_events_type ON campaign_events(campaign_id, event_type);
CREATE INDEX idx_campaign_events_date ON campaign_events(account_id, created_at DESC);

ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_events_select ON campaign_events FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY campaign_events_insert ON campaign_events FOR INSERT
  WITH CHECK (is_account_member(account_id));

-- ============================================================
-- 4. Campaign Performance Summary (materialized view via RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION get_campaign_performance(
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'campaign_id', p_campaign_id,
    'total_sent', COUNT(*) FILTER (WHERE event_type = 'sent'),
    'total_delivered', COUNT(*) FILTER (WHERE event_type = 'delivered'),
    'total_read', COUNT(*) FILTER (WHERE event_type = 'read'),
    'total_replied', COUNT(*) FILTER (WHERE event_type = 'replied'),
    'total_clicked', COUNT(*) FILTER (WHERE event_type = 'clicked'),
    'total_converted', COUNT(*) FILTER (WHERE event_type = 'converted'),
    'total_purchased', COUNT(*) FILTER (WHERE event_type = 'purchased'),
    'total_opted_out', COUNT(*) FILTER (WHERE event_type = 'opted_out'),
    'total_failed', COUNT(*) FILTER (WHERE event_type = 'failed'),
    'total_revenue', COALESCE(SUM(revenue_amount) FILTER (WHERE event_type = 'purchased'), 0),
    'unique_contacts', COUNT(DISTINCT contact_id),
    'delivery_rate', CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0
      THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'delivered')::decimal /
           COUNT(*) FILTER (WHERE event_type = 'sent') * 100, 1)
      ELSE 0 END,
    'read_rate', CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'delivered') > 0
      THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'read')::decimal /
           COUNT(*) FILTER (WHERE event_type = 'delivered') * 100, 1)
      ELSE 0 END,
    'reply_rate', CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'read') > 0
      THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'replied')::decimal /
           COUNT(*) FILTER (WHERE event_type = 'read') * 100, 1)
      ELSE 0 END,
    'conversion_rate', CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0
      THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'converted')::decimal /
           COUNT(*) FILTER (WHERE event_type = 'sent') * 100, 1)
      ELSE 0 END
  ) INTO result
  FROM campaign_events
  WHERE campaign_id = p_campaign_id;

  RETURN result;
END;
$$;

-- ============================================================
-- 5. Account Campaign Summary (for dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION get_account_campaign_summary(
  p_account_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_campaigns', COUNT(DISTINCT c.id),
    'active_campaigns', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active'),
    'completed_campaigns', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed'),
    'total_messages_sent', COUNT(e.id) FILTER (WHERE e.event_type = 'sent'),
    'total_revenue_recovered', COALESCE(SUM(e.revenue_amount) FILTER (WHERE e.event_type = 'purchased'), 0),
    'total_customers_reactivated', COUNT(DISTINCT e.contact_id) FILTER (WHERE e.event_type = 'converted'),
    'avg_conversion_rate', CASE
      WHEN COUNT(e.id) FILTER (WHERE e.event_type = 'sent') > 0
      THEN ROUND(COUNT(e.id) FILTER (WHERE e.event_type = 'converted')::decimal /
           COUNT(e.id) FILTER (WHERE e.event_type = 'sent') * 100, 1)
      ELSE 0 END,
    'avg_reply_rate', CASE
      WHEN COUNT(e.id) FILTER (WHERE e.event_type = 'sent') > 0
      THEN ROUND(COUNT(e.id) FILTER (WHERE e.event_type = 'replied')::decimal /
           COUNT(e.id) FILTER (WHERE e.event_type = 'sent') * 100, 1)
      ELSE 0 END
  ) INTO result
  FROM campaigns c
  LEFT JOIN campaign_events e ON e.campaign_id = c.id
    AND e.created_at >= now() - (p_days || ' days')::interval
  WHERE c.account_id = p_account_id
    AND c.created_at >= now() - (p_days || ' days')::interval;

  RETURN result;
END;
$$;

-- ============================================================
-- 6. Database Analysis RPC (one-click analysis for wizard)
-- ============================================================
CREATE OR REPLACE FUNCTION analyze_database_for_reactivation(
  p_account_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_contacts integer;
  contacts_with_purchases integer;
  dormant_contacts integer;
  active_contacts integer;
  at_risk_contacts integer;
  total_revenue decimal;
  avg_purchase_value decimal;
  dormant_revenue_potential decimal;
BEGIN
  -- Total contacts
  SELECT COUNT(*) INTO total_contacts
  FROM contacts WHERE account_id = p_account_id;

  -- Contacts with purchase history
  SELECT COUNT(DISTINCT contact_id) INTO contacts_with_purchases
  FROM purchase_history WHERE account_id = p_account_id;

  -- Get recency thresholds from settings
  -- Active: purchased within tier1 days
  -- At-risk: purchased within tier2 days but not tier1
  -- Dormant: no purchase within tier2 days
  WITH thresholds AS (
    SELECT
      COALESCE((settings->'recency'->>'tier1_max')::integer, 90) AS active_days,
      COALESCE((settings->'recency'->>'tier2_max')::integer, 180) AS at_risk_days
    FROM product_score_settings
    WHERE account_id = p_account_id
    LIMIT 1
  ),
  defaults AS (
    SELECT 90 AS active_days, 180 AS at_risk_days
  ),
  cfg AS (
    SELECT COALESCE(t.active_days, d.active_days) AS active_days,
           COALESCE(t.at_risk_days, d.at_risk_days) AS at_risk_days
    FROM defaults d LEFT JOIN thresholds t ON true
  ),
  contact_recency AS (
    SELECT
      ph.contact_id,
      MAX(ph.purchase_date) AS last_purchase,
      SUM(ph.amount) AS lifetime_value,
      COUNT(*) AS purchase_count
    FROM purchase_history ph
    WHERE ph.account_id = p_account_id
    GROUP BY ph.contact_id
  )
  SELECT
    COUNT(*) FILTER (WHERE cr.last_purchase >= CURRENT_DATE - (cfg.active_days || ' days')::interval),
    COUNT(*) FILTER (WHERE cr.last_purchase < CURRENT_DATE - (cfg.active_days || ' days')::interval
                       AND cr.last_purchase >= CURRENT_DATE - (cfg.at_risk_days || ' days')::interval),
    COUNT(*) FILTER (WHERE cr.last_purchase < CURRENT_DATE - (cfg.at_risk_days || ' days')::interval),
    COALESCE(SUM(cr.lifetime_value), 0),
    COALESCE(AVG(cr.lifetime_value / NULLIF(cr.purchase_count, 0)), 0),
    COALESCE(
      SUM(cr.lifetime_value / NULLIF(cr.purchase_count, 0))
      FILTER (WHERE cr.last_purchase < CURRENT_DATE - (cfg.at_risk_days || ' days')::interval),
      0
    )
  INTO active_contacts, at_risk_contacts, dormant_contacts,
       total_revenue, avg_purchase_value, dormant_revenue_potential
  FROM contact_recency cr, cfg;

  -- Build result
  result := jsonb_build_object(
    'total_contacts', total_contacts,
    'contacts_with_purchases', contacts_with_purchases,
    'contacts_without_purchases', total_contacts - contacts_with_purchases,
    'segments', jsonb_build_object(
      'active', jsonb_build_object('count', COALESCE(active_contacts, 0), 'label', 'Active Customers'),
      'at_risk', jsonb_build_object('count', COALESCE(at_risk_contacts, 0), 'label', 'At-Risk Customers'),
      'dormant', jsonb_build_object('count', COALESCE(dormant_contacts, 0), 'label', 'Dormant Customers')
    ),
    'revenue', jsonb_build_object(
      'total_lifetime', total_revenue,
      'avg_purchase_value', ROUND(avg_purchase_value, 2),
      'dormant_potential', ROUND(dormant_revenue_potential, 2)
    ),
    'recommendations', jsonb_build_array(
      CASE WHEN COALESCE(dormant_contacts, 0) > 0
        THEN jsonb_build_object(
          'campaign', 'win_back',
          'audience_size', dormant_contacts,
          'estimated_revenue', ROUND(dormant_revenue_potential * 0.15, 2),
          'priority', 'high'
        ) ELSE NULL END,
      CASE WHEN COALESCE(at_risk_contacts, 0) > 0
        THEN jsonb_build_object(
          'campaign', 'at_risk_nurture',
          'audience_size', at_risk_contacts,
          'estimated_revenue', ROUND(avg_purchase_value * at_risk_contacts * 0.25, 2),
          'priority', 'high'
        ) ELSE NULL END,
      CASE WHEN COALESCE(active_contacts, 0) > 0
        THEN jsonb_build_object(
          'campaign', 'upsell_cross_sell',
          'audience_size', active_contacts,
          'estimated_revenue', ROUND(avg_purchase_value * active_contacts * 0.10, 2),
          'priority', 'medium'
        ) ELSE NULL END
    ),
    'analyzed_at', now()
  );

  RETURN result;
END;
$$;

-- ============================================================
-- 7. Seed Campaign Templates
-- ============================================================
INSERT INTO campaign_templates (slug, name, description, category, icon, default_channel, tier, sort_order, message_templates, sequence_steps, audience_filter, expected_open_rate, expected_reply_rate, expected_conversion_rate)
VALUES
-- Tier 1: Critical Revenue Impact
('win_back', 'Win-Back Campaign', 'Re-engage dormant customers who haven''t purchased recently with personalized offers and reminders.', 'reactivation', 'UserX', 'whatsapp', 1, 1,
  '[{"key":"initial","name":"We Miss You","body":"Hi {{name}}! 👋 We noticed it''s been a while since your last visit. We''ve got some exciting new products we think you''ll love! Here''s a special 15% discount just for you: {{discount_code}}","has_discount":true},{"key":"reminder","name":"Gentle Reminder","body":"Hi {{name}}, just a friendly reminder about your exclusive 15% discount! It expires in 48 hours. Don''t miss out! 🎁","has_discount":true},{"key":"final","name":"Last Chance","body":"{{name}}, your 15% discount expires today! This is your last chance to save. Tap below to shop now 👇","has_discount":true}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"initial"},{"step":2,"delay_minutes":2880,"message_key":"reminder","condition":"no_reply"},{"step":3,"delay_minutes":4320,"message_key":"final","condition":"no_reply"}]'::jsonb,
  '{"segment":"dormant","min_days_inactive":90}'::jsonb,
  78.5, 22.3, 15.0),

('abandoned_cart', 'Abandoned Cart Recovery', 'Automatically remind customers who added items to cart but didn''t complete purchase.', 'cart_recovery', 'ShoppingCart', 'whatsapp', 1, 2,
  '[{"key":"reminder_1","name":"Cart Reminder","body":"Hi {{name}}! 🛒 You left some items in your cart. Your {{product_name}} is still waiting for you! Complete your order before it sells out.","has_discount":false},{"key":"reminder_2","name":"Incentive Offer","body":"Still thinking about it, {{name}}? Here''s 10% off to help you decide: {{discount_code}} 💰","has_discount":true},{"key":"final","name":"Last Stock Warning","body":"⚠️ {{name}}, your {{product_name}} is almost out of stock! Order now to avoid missing out.","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":60,"message_key":"reminder_1"},{"step":2,"delay_minutes":1440,"message_key":"reminder_2","condition":"no_purchase"},{"step":3,"delay_minutes":4320,"message_key":"final","condition":"no_purchase"}]'::jsonb,
  '{"segment":"cart_abandoners"}'::jsonb,
  85.0, 28.5, 22.0),

('post_purchase_thank_you', 'Post-Purchase Thank You', 'Send a warm thank-you message after purchase with product tips and review request.', 'post_purchase', 'Heart', 'whatsapp', 1, 3,
  '[{"key":"thank_you","name":"Thank You","body":"Thank you for your purchase, {{name}}! 🎉 Your {{product_name}} is on its way. Here are some tips to get the most out of it: {{product_tips}}","has_discount":false},{"key":"check_in","name":"Check-In","body":"Hi {{name}}! How are you enjoying your {{product_name}}? We''d love to hear your feedback! Reply with a rating from 1-5 ⭐","has_discount":false},{"key":"review_request","name":"Review Request","body":"{{name}}, your opinion matters! 📝 Would you mind leaving a quick review? It helps other customers make great choices. {{review_link}}","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"thank_you"},{"step":2,"delay_minutes":10080,"message_key":"check_in"},{"step":3,"delay_minutes":20160,"message_key":"review_request","condition":"positive_feedback"}]'::jsonb,
  '{"segment":"recent_purchasers","min_purchase_value":0}'::jsonb,
  92.0, 35.0, 28.0),

('order_status', 'Order Status Notifications', 'Keep customers informed about their order status from confirmation to delivery.', 'post_purchase', 'Package', 'whatsapp', 1, 4,
  '[{"key":"confirmed","name":"Order Confirmed","body":"✅ Order confirmed! Hi {{name}}, your order #{{order_id}} has been received. We''re preparing it now. Estimated delivery: {{delivery_date}}","has_discount":false},{"key":"shipped","name":"Order Shipped","body":"📦 Your order is on its way! Track your delivery here: {{tracking_link}}","has_discount":false},{"key":"delivered","name":"Order Delivered","body":"🎉 Your order has been delivered! We hope you love your {{product_name}}. Need help? Just reply to this message.","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"confirmed","trigger":"order_placed"},{"step":2,"delay_minutes":0,"message_key":"shipped","trigger":"order_shipped"},{"step":3,"delay_minutes":0,"message_key":"delivered","trigger":"order_delivered"}]'::jsonb,
  '{"segment":"all_purchasers"}'::jsonb,
  95.0, 15.0, NULL),

('cod_confirmation', 'COD Confirmation Flow', 'Confirm Cash-on-Delivery orders to reduce failed deliveries and no-shows.', 'post_purchase', 'Banknote', 'whatsapp', 1, 5,
  '[{"key":"confirm","name":"COD Confirmation","body":"Hi {{name}}! 📋 Please confirm your COD order #{{order_id}} for {{amount}}. Reply YES to confirm or NO to cancel. Delivery to: {{address}}","has_discount":false},{"key":"reminder","name":"Delivery Reminder","body":"Reminder: Your COD order #{{order_id}} arrives tomorrow! Please have ₦{{amount}} ready. Reply RESCHEDULE if you need to change the delivery time.","has_discount":false},{"key":"no_response","name":"No Response Follow-up","body":"{{name}}, we still need your confirmation for order #{{order_id}}. Without confirmation, we may need to cancel. Please reply YES or NO.","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"confirm"},{"step":2,"delay_minutes":1440,"message_key":"no_response","condition":"no_reply"},{"step":3,"delay_minutes":0,"message_key":"reminder","trigger":"day_before_delivery"}]'::jsonb,
  '{"segment":"cod_orders"}'::jsonb,
  90.0, 72.0, 85.0),

-- Tier 2: Important Engagement
('review_collection', 'Review & Feedback Collection', 'Collect customer reviews and feedback after purchase with satisfaction screening.', 'feedback', 'Star', 'whatsapp', 2, 6,
  '[{"key":"satisfaction","name":"Satisfaction Check","body":"Hi {{name}}! How would you rate your recent purchase? Reply with a number:\n\n5 ⭐ Excellent\n4 ⭐ Good\n3 ⭐ Okay\n2 ⭐ Poor\n1 ⭐ Terrible","has_discount":false},{"key":"positive_review","name":"Review Request (Happy)","body":"Wonderful! 🎉 We''re so glad you''re happy! Would you mind sharing your experience? Leave a review here: {{review_link}} — it really helps us!","has_discount":false},{"key":"negative_followup","name":"Service Recovery","body":"We''re sorry to hear that, {{name}}. 😔 Your satisfaction is our priority. A team member will reach out within 24 hours to make this right.","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":10080,"message_key":"satisfaction"},{"step":2,"delay_minutes":0,"message_key":"positive_review","condition":"rating_gte_4"},{"step":3,"delay_minutes":0,"message_key":"negative_followup","condition":"rating_lte_2"}]'::jsonb,
  '{"segment":"recent_purchasers","min_days_since_purchase":7}'::jsonb,
  88.0, 45.0, 32.0),

('birthday_campaign', 'Birthday & Anniversary', 'Celebrate customer birthdays and purchase anniversaries with special offers.', 'lifecycle', 'Cake', 'whatsapp', 2, 7,
  '[{"key":"birthday","name":"Birthday Greeting","body":"🎂 Happy Birthday, {{name}}! 🎉 To celebrate your special day, here''s an exclusive birthday gift — {{discount_percent}}% off your next purchase! Use code: {{discount_code}}","has_discount":true},{"key":"anniversary","name":"Purchase Anniversary","body":"Hi {{name}}! 🎊 It''s been exactly one year since you first shopped with us. Thank you for being a loyal customer! Here''s {{discount_percent}}% off to celebrate: {{discount_code}}","has_discount":true}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"birthday","trigger":"birthday_date"},{"step":2,"delay_minutes":0,"message_key":"anniversary","trigger":"purchase_anniversary"}]'::jsonb,
  '{"segment":"has_birthday","has_date_field":"birthday"}'::jsonb,
  90.0, 30.0, 20.0),

('upsell_cross_sell', 'Upsell & Cross-Sell', 'Recommend complementary or premium products based on purchase history.', 'revenue', 'TrendingUp', 'whatsapp', 2, 8,
  '[{"key":"recommendation","name":"Product Recommendation","body":"Hi {{name}}! 💡 Based on your recent purchase of {{purchased_product}}, we think you''ll love {{recommended_product}}! {{product_description}} — now available at {{price}}","has_discount":false},{"key":"bundle_offer","name":"Bundle Offer","body":"{{name}}, great news! 🎁 Get {{recommended_product}} at {{discount_percent}}% off when you bundle it with your {{purchased_product}}. Limited time offer!","has_discount":true}]'::jsonb,
  '[{"step":1,"delay_minutes":4320,"message_key":"recommendation"},{"step":2,"delay_minutes":10080,"message_key":"bundle_offer","condition":"no_purchase"}]'::jsonb,
  '{"segment":"recent_purchasers","has_upsell_products":true}'::jsonb,
  75.0, 18.0, 12.0),

('referral_program', 'Referral Program', 'Turn happy customers into brand ambassadors with referral rewards.', 'engagement', 'Users', 'whatsapp', 2, 9,
  '[{"key":"invite","name":"Referral Invite","body":"Hi {{name}}! 🤝 Love our products? Share the love! Give your friends {{friend_discount}}% off their first order, and you''ll get {{referrer_reward}} when they buy. Your unique referral link: {{referral_link}}","has_discount":true},{"key":"reminder","name":"Referral Reminder","body":"{{name}}, don''t forget — you can earn {{referrer_reward}} for every friend who shops with us! Share your link: {{referral_link}} 🎁","has_discount":false},{"key":"reward","name":"Reward Notification","body":"🎉 Congratulations {{name}}! Your friend just made a purchase using your referral. Your {{referrer_reward}} reward has been credited! Keep sharing: {{referral_link}}","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":20160,"message_key":"invite"},{"step":2,"delay_minutes":43200,"message_key":"reminder","condition":"no_referrals"},{"step":3,"delay_minutes":0,"message_key":"reward","trigger":"referral_purchase"}]'::jsonb,
  '{"segment":"satisfied_customers","min_rating":4}'::jsonb,
  82.0, 20.0, 8.0),

('vip_rewards', 'VIP Customer Rewards', 'Reward your top customers with exclusive offers and early access to new products.', 'engagement', 'Crown', 'whatsapp', 2, 10,
  '[{"key":"vip_welcome","name":"VIP Welcome","body":"Hi {{name}}! 👑 You''ve been selected as a VIP customer! As a thank you for your loyalty, enjoy exclusive benefits: early access to new products, special discounts, and priority support.","has_discount":false},{"key":"exclusive_offer","name":"Exclusive Offer","body":"VIP exclusive! 🌟 {{name}}, get first access to our new {{product_name}} at {{discount_percent}}% off before anyone else. Use code: {{discount_code}}","has_discount":true}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"vip_welcome"},{"step":2,"delay_minutes":0,"message_key":"exclusive_offer","trigger":"new_product_launch"}]'::jsonb,
  '{"segment":"vip","min_lifetime_value":50000,"min_purchases":5}'::jsonb,
  95.0, 35.0, 25.0)

ON CONFLICT (slug) DO NOTHING;
