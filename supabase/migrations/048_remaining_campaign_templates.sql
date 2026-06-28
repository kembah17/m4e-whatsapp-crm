-- 048_remaining_campaign_templates.sql
-- Add 4 remaining campaign templates to complete the full set of 15
-- Templates: WhatsApp Flow Survey, Product Catalog Browse, Ad Lead Nurture, Unhappy Customer Recovery

-- ============================================================
-- 1. Expand category CHECK constraint to include 'growth' and 'retention'
-- ============================================================
ALTER TABLE campaign_templates DROP CONSTRAINT IF EXISTS campaign_templates_category_check;
ALTER TABLE campaign_templates ADD CONSTRAINT campaign_templates_category_check
  CHECK (category IN (
    'reactivation', 'cart_recovery', 'post_purchase',
    'lifecycle', 'engagement', 'revenue', 'feedback',
    'growth', 'retention'
  ));

-- ============================================================
-- 2. Insert 4 new campaign templates
-- ============================================================
INSERT INTO campaign_templates (
  slug, name, description, category, icon, default_channel, tier, sort_order,
  message_templates, sequence_steps, audience_filter,
  expected_open_rate, expected_reply_rate, expected_conversion_rate,
  what_it_does, why_you_need_it, how_it_works, best_for, example_result
)
VALUES

-- Template 11: WhatsApp Flow Survey Campaign
('whatsapp-flow-survey', 'WhatsApp Flow Survey Campaign',
  'Collect structured customer feedback, preferences, and data using native WhatsApp Flows (in-chat forms). No external links needed — customers fill out forms directly inside WhatsApp.',
  'engagement', 'ClipboardList', 'whatsapp', 3, 11,
  '[{"key":"flow_invite","name":"Survey Invitation","body":"Hi {{name}}! \ud83d\udcdd We''d love your feedback to serve you better. Tap below to complete a quick 3-question survey — right here in WhatsApp, no links needed!","has_discount":false},{"key":"thank_you","name":"Thank You + Incentive","body":"Thank you for sharing your thoughts, {{name}}! \ud83c\udf89 As a thank-you, here''s a special 10% discount on your next order: {{discount_code}}","has_discount":true},{"key":"segment_tag","name":"Segmentation Confirmation","body":"We''ve noted your preferences, {{name}}. You''ll now receive offers tailored just for you! \ud83c\udfaf","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"flow_invite","config":{"message":"Send WhatsApp Flow message with survey form. Attach the selected Flow template (feedback, lead capture, appointment, order details, or survey). Target the chosen audience segment."}},{"step":2,"delay_minutes":1440,"message_key":"thank_you","condition":"flow_completed","config":{"message":"Wait for Flow completion. Send thank-you message with incentive code to respondents. For non-completers, send a gentle reminder."}},{"step":3,"delay_minutes":0,"message_key":"segment_tag","condition":"flow_completed","config":{"message":"Tag respondents based on their answers for future segmentation. Update contact preferences in CRM."}}]'::jsonb,
  '{"segment":"all_active","min_days_since_last_message":0}'::jsonb,
  88.0, 57.0, 40.0,
  'Sends interactive WhatsApp Flow forms to targeted customer segments. Customers complete surveys, feedback forms, or preference questionnaires without leaving WhatsApp. Responses are automatically captured and stored for analysis.',
  'Traditional survey links have 5-15% completion rates. WhatsApp Flows achieve 40-60% completion because customers never leave the chat. You get structured data (not free-text guessing) for product development, service improvement, and customer segmentation. Nigerian customers especially prefer staying in WhatsApp over clicking external links.',
  '1) Select a Flow template (feedback, lead capture, appointment, order details, or survey).\n2) Customize questions for your business.\n3) Choose your target audience.\n4) Schedule the send.\n5) Responses are automatically collected and available in your dashboard.',
  'Businesses wanting customer feedback, market research, appointment scheduling, or lead qualification without losing customers to external links.',
  'A Lagos restaurant sent a 3-question food preference survey via WhatsApp Flow to 500 customers. 287 completed it (57% rate vs 8% for their previous Google Forms link). They discovered 62% wanted more vegetarian options, leading to a menu update that increased orders by 23%.'),

-- Template 12: Product Catalog Browse Campaign
('catalog-browse', 'Product Catalog Browse Campaign',
  'Drive product discovery by sending curated product catalog messages directly in WhatsApp. Customers browse, ask questions, and purchase without leaving the chat.',
  'growth', 'ShoppingBag', 'whatsapp', 3, 12,
  '[{"key":"catalog_send","name":"Curated Catalog","body":"Hi {{name}}! \ud83d\udecd\ufe0f Check out our latest picks just for you! Browse our top products right here in WhatsApp — tap any item to see details and order instantly.","has_discount":false},{"key":"bestseller_followup","name":"Bestseller Highlight","body":"{{name}}, our customers are loving {{product_name}}! \ud83d\udd25 It''s our #1 bestseller this month. Tap to see why everyone''s talking about it.","has_discount":false},{"key":"limited_offer","name":"Limited-Time Offer","body":"Last chance, {{name}}! \u23f0 Get {{discount_percent}}% off any item you viewed this week. Use code: {{discount_code}} — offer expires in 24 hours!","has_discount":true}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"catalog_send","config":{"message":"Send product catalog message with curated selection (new arrivals, bestsellers, or personalized picks based on purchase history). Use WhatsApp native product card format with images, prices, and descriptions."}},{"step":2,"delay_minutes":2880,"message_key":"bestseller_followup","condition":"no_reply","config":{"message":"Follow up with non-responders by highlighting the single bestselling product. Use a single-product message for focused attention."}},{"step":3,"delay_minutes":4320,"message_key":"limited_offer","condition":"no_purchase","config":{"message":"Send limited-time discount offer to contacts who engaged (viewed products) but did not purchase. Create urgency with 24-hour expiry."}}]'::jsonb,
  '{"segment":"all_contacts","has_purchase_history":true}'::jsonb,
  82.0, 29.0, 12.0,
  'Sends single-product or multi-product catalog messages to targeted segments based on purchase history, preferences, or browsing behavior. Products are displayed with images, prices, and descriptions in WhatsApp''s native product card format.',
  '73% of Nigerian online shoppers prefer browsing products on WhatsApp over websites. Catalog messages have 3x higher engagement than text-only product promotions. Customers can tap to view details and respond instantly, shortening the sales cycle from days to minutes.',
  '1) Sync your product catalog to WhatsApp.\n2) Select products to feature (new arrivals, bestsellers, or personalized picks).\n3) Choose audience (all contacts, specific segments, or based on purchase history).\n4) Send product cards.\n5) Track views, inquiries, and purchases.',
  'E-commerce businesses, retail stores, fashion brands, and any business with a product catalog wanting to drive sales through WhatsApp.',
  'A fashion retailer in Abuja sent a curated ''New Arrivals'' catalog message to 800 customers who hadn''t purchased in 60 days. 234 viewed the products (29%), 67 started conversations (8.4%), and 31 made purchases (3.9%) — generating \u20a62.1M in revenue from a single campaign.'),

-- Template 13: Click-to-WhatsApp Ad Lead Nurture
('ad-lead-nurture', 'Click-to-WhatsApp Ad Lead Nurture',
  'Automatically nurture leads who click your Facebook/Instagram WhatsApp ads. Convert ad clicks into customers with a personalized multi-touch sequence that references the specific ad they responded to.',
  'growth', 'Megaphone', 'whatsapp', 3, 13,
  '[{"key":"instant_welcome","name":"Instant Welcome","body":"Hi {{name}}! \ud83d\udc4b Thanks for your interest in {{ad_headline}}! I''m here to help you learn more. What specific questions do you have?","has_discount":false},{"key":"qualification","name":"Qualification Questions","body":"Great to connect, {{name}}! To recommend the best option for you, could you tell me:\n\n1\ufe0f\u20e3 What''s your main goal?\n2\ufe0f\u20e3 What''s your timeline?\n3\ufe0f\u20e3 What''s your budget range?","has_discount":false},{"key":"personalized_offer","name":"Personalized Offer","body":"Based on what you''ve told me, {{name}}, I think {{recommended_product}} is perfect for you! \ud83c\udfaf Here''s a special offer just for ad respondents: {{discount_code}} for {{discount_percent}}% off.","has_discount":true},{"key":"nurture_followup","name":"Nurture Follow-up","body":"Hi {{name}}, just checking in! \ud83d\ude0a I noticed you were interested in {{ad_headline}}. Many of our customers had similar questions — here''s what they found most helpful: {{resource_link}}","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"instant_welcome","trigger":"ctwa_click","config":{"message":"Instant welcome message triggered when CTWA ad click is detected. References the specific ad headline and image. Responds within 30 seconds."}},{"step":2,"delay_minutes":1,"message_key":"qualification","config":{"message":"Send qualification questions via interactive buttons. Capture responses to determine lead quality and intent. Tag lead with qualification score."}},{"step":3,"delay_minutes":5,"message_key":"personalized_offer","condition":"qualified","config":{"message":"Send personalized offer based on qualification answers. Include product recommendation and exclusive ad-respondent discount."}},{"step":4,"delay_minutes":1440,"message_key":"nurture_followup","condition":"no_purchase","config":{"message":"Follow-up nurture for non-converters. Share helpful resource, case study, or testimonial relevant to their expressed interest."}}]'::jsonb,
  '{"segment":"ctwa_leads","source":"meta_ads"}'::jsonb,
  95.0, 57.0, 22.0,
  'When someone clicks your Click-to-WhatsApp ad, their first message contains ad metadata (headline, image, source). This campaign automatically captures that data, tags the lead, and triggers a personalized nurture sequence that references the specific offer or product from the ad.',
  'Click-to-WhatsApp ads generate the highest quality leads on Meta platforms — these people actively chose to message you. But 68% of businesses lose these leads by not responding within 5 minutes. This campaign responds instantly, qualifies the lead, and nurtures them to purchase — even outside business hours.',
  '1) Connect your Meta ad account.\n2) The system automatically detects CTWA ad clicks.\n3) Instant welcome message references the ad they clicked.\n4) AI chatbot qualifies the lead with 2-3 questions.\n5) Qualified leads get a personalized offer.\n6) Non-converters get a 3-day nurture sequence.',
  'Any business running Facebook/Instagram ads with Click-to-WhatsApp CTAs. Especially effective for real estate, automotive, education, and high-consideration purchases.',
  'A real estate developer in Lagos ran CTWA ads for a new estate. 156 leads clicked through in one week. The automated nurture sequence responded to all 156 within 30 seconds (vs. their previous 4-hour average). 89 were qualified (57%), 34 booked site visits (22%), and 8 made deposits (5.1%) — \u20a648M in committed sales from one week of ads.'),

-- Template 14: Unhappy Customer Recovery Campaign
('sentiment-recovery', 'Unhappy Customer Recovery Campaign',
  'Automatically detect and recover unhappy customers before they churn or leave negative reviews. Uses AI sentiment analysis to identify frustrated customers and triggers a personalized recovery sequence.',
  'retention', 'HeartHandshake', 'whatsapp', 2, 14,
  '[{"key":"acknowledgment","name":"Immediate Acknowledgment","body":"{{name}}, we hear you and we''re truly sorry about your experience. \ud83d\ude4f Your satisfaction means everything to us. A senior team member is reviewing your case right now.","has_discount":false},{"key":"escalation","name":"Team Escalation","body":"[INTERNAL] \ud83d\udea8 Unhappy customer alert: {{name}} ({{phone}}). Sentiment: {{sentiment_score}}. Issue: {{issue_summary}}. Previous purchases: {{purchase_count}}. Lifetime value: \u20a6{{lifetime_value}}. Please respond within 1 hour.","has_discount":false},{"key":"recovery_offer","name":"Recovery Offer","body":"Hi {{name}}, I''m {{agent_name}}, a senior manager here. I''ve personally reviewed your case and I want to make this right. As an apology, please accept {{recovery_offer}} — no strings attached. Can we schedule a quick call to discuss how we can improve?","has_discount":true},{"key":"satisfaction_check","name":"Satisfaction Follow-up","body":"Hi {{name}}! \ud83d\ude0a I wanted to check in — how has your experience been since we last spoke? We truly value your feedback and want to make sure everything is resolved to your satisfaction.","has_discount":false}]'::jsonb,
  '[{"step":1,"delay_minutes":0,"message_key":"acknowledgment","trigger":"negative_sentiment","config":{"message":"Immediate acknowledgment sent when AI detects negative sentiment (anger, frustration, complaints) in English or Nigerian Pidgin. Responds within 2 minutes."}},{"step":2,"delay_minutes":0,"message_key":"escalation","config":{"message":"Auto-escalate conversation to senior team member with full context: sentiment score, issue summary, customer history, and lifetime value."}},{"step":3,"delay_minutes":60,"message_key":"recovery_offer","config":{"message":"Send personalized recovery offer from a named senior manager. Offer type based on issue severity: discount, freebie, personal call, or complimentary service."}},{"step":4,"delay_minutes":4320,"message_key":"satisfaction_check","config":{"message":"Follow-up satisfaction check 3 days later. If positive, route to review collection campaign. If still negative, escalate to business owner."}}]'::jsonb,
  '{"segment":"negative_sentiment","trigger":"ai_sentiment_detection"}'::jsonb,
  92.0, 70.0, 82.0,
  'Monitors incoming messages for negative sentiment (anger, frustration, complaints) using AI that understands both English and Nigerian Pidgin. When an unhappy customer is detected, it immediately alerts your team, escalates the conversation, and triggers a recovery sequence with a personal apology and make-good offer.',
  'For every customer who complains, 26 others leave silently. Catching unhappy customers early prevents churn, negative reviews, and social media complaints. In Nigeria''s tight-knit business communities, one unhappy customer can influence dozens through word-of-mouth. Recovery campaigns turn 70% of unhappy customers into loyal advocates.',
  '1) AI analyzes every incoming message for sentiment.\n2) Negative or urgent messages trigger an alert.\n3) Conversation is auto-escalated to a senior team member.\n4) Customer receives acknowledgment within 2 minutes.\n5) Recovery offer is sent within 1 hour.\n6) Follow-up check 3 days later to confirm satisfaction.',
  'Any business with customer interactions — especially service businesses, e-commerce, hospitality, and healthcare where customer satisfaction directly impacts revenue and reputation.',
  'A hotel chain in Port Harcourt activated sentiment recovery. In the first month, the system flagged 23 unhappy customers (from 1,200 conversations). 19 were successfully recovered with personalized apologies and complimentary upgrades. 14 of those 19 left positive reviews afterward. Their Google rating improved from 3.8 to 4.3 stars.')

ON CONFLICT (slug) DO NOTHING;
