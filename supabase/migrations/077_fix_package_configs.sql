-- Migration 077: Fix package_configs - descriptions, milestone templates, transition rules
-- Fixes:
-- 1. pkg1 description: replace deprecated 'self-reinforcing' with 'compounding growth'
-- 2. Complete Programme: add milestone template (16-week combined programme)
-- 3. Unicorn Programme: add milestone template (16-week strategic partnership)
-- 4. Complete Programme: add transition rules
-- 5. Unicorn Programme: add transition rules

-- Fix 1: Update pkg1 description
UPDATE package_configs
SET description = 'Reactivate dormant customers and build a compounding growth system'
WHERE package_key = 'pkg1_reactivation';

-- Fix 2: Complete Programme milestone template (16 weeks)
UPDATE package_configs
SET milestone_template = '[
  {"week": 1, "name": "Programme Kickoff", "description": "Comprehensive onboarding covering all three package phases", "deliverables": ["Full programme onboarding call", "Data sources identified", "Brand discovery session", "Programme timeline agreed"], "criteria": ["Client access granted", "All data sources listed", "Brand direction discussed"]},
  {"week": 2, "name": "Data Collection & Brand Brief", "description": "Import contacts and establish brand identity foundations", "deliverables": ["Contacts imported and deduplicated", "RFM segments created", "Brand brief completed", "Competitor analysis"], "criteria": [">=100 contacts imported", "RFM scores assigned", "Brand brief approved"]},
  {"week": 3, "name": "Campaign Configuration", "description": "Configure all reactivation campaigns", "deliverables": ["All campaign messages drafted", "Client approval obtained", "Win-back campaign configured"], "criteria": ["All 6 reactivation campaigns configured", "Messages approved"]},
  {"week": 4, "name": "Campaign Activation & Brand Identity", "description": "Launch reactivation campaigns while developing brand identity", "deliverables": ["Win-back campaign launched", "Satisfaction screening active", "Color palette and typography", "Logo concepts"], "criteria": ["First messages sent", "Responses tracked", "Palette approved"]},
  {"week": 5, "name": "Response Analysis & Website Design", "description": "Analyse campaign responses and design website", "deliverables": ["Campaign performance report", "Message adjustments", "Website wireframes", "Design mockups"], "criteria": [">10% response rate", "Layout approved"]},
  {"week": 6, "name": "Lifecycle Campaigns & Website Build", "description": "Activate lifecycle campaigns and build website", "deliverables": ["Birthday campaign active", "VIP programme launched", "Staging website", "Content draft"], "criteria": ["Automated triggers working", "All pages built"]},
  {"week": 7, "name": "Referral Programme & SEO", "description": "Launch referral programme and implement SEO", "deliverables": ["Referral programme active", "Reviews collected", "SEO audit completed", "Schema markup"], "criteria": [">=5 reviews collected", "Lighthouse >90"]},
  {"week": 8, "name": "Website Launch & Mid-Point Review", "description": "Launch website and review first half progress", "deliverables": ["Website live", "Analytics configured", "Mid-point report", "Brand guide"], "criteria": ["Site live", "Data flowing", "All Phase 1-2 deliverables complete"]},
  {"week": 9, "name": "Growth Strategy Session", "description": "3-hour strategy session for paid advertising phase", "deliverables": ["Strategy session summary", "Campaign architecture", "Creative brief", "Ad calendar"], "criteria": ["Budget approved", "Channels selected", "Creative direction approved"]},
  {"week": 10, "name": "Creative Production & Campaign Launch", "description": "Develop ad creatives and launch campaigns", "deliverables": ["Ad creatives approved", "Landing pages live", "Campaigns launched"], "criteria": ["Ads running", "Conversions tracking"]},
  {"week": 11, "name": "Optimisation & E-commerce", "description": "Optimise ads and set up e-commerce integrations", "deliverables": ["Performance report", "Cart recovery active", "Order status flows"], "criteria": ["CPA within target", "Webhooks receiving"]},
  {"week": 12, "name": "Scale Testing", "description": "Test scaling ad spend and advanced campaigns", "deliverables": ["Scale test results", "Cross-sell campaigns", "Budget recommendation"], "criteria": ["ROAS maintained at higher spend"]},
  {"week": 13, "name": "Retargeting & Full Funnel", "description": "Implement retargeting and optimise full funnel", "deliverables": ["Retargeting active", "Funnel analysis", "Conversion optimisation"], "criteria": ["Audiences built", "Conversion rate improving"]},
  {"week": 14, "name": "Automation & Scale", "description": "Automate winning campaigns and scale", "deliverables": ["Automated rules active", "Scaling plan", "Advanced automations"], "criteria": ["Automation running", "ROI positive"]},
  {"week": 15, "name": "Performance Review", "description": "Comprehensive performance review across all phases", "deliverables": ["Full performance report", "ROI analysis", "Optimisation recommendations"], "criteria": ["All metrics documented", "ROI calculated"]},
  {"week": 16, "name": "Final Report & Transition", "description": "Comprehensive final report and transition planning", "deliverables": ["Final report", "Growth roadmap", "Retainer recommendation", "All assets handed over"], "criteria": ["All deliverables complete", "Transition plan agreed", "Client trained"]}
]'::jsonb
WHERE package_key = 'complete';

-- Fix 3: Unicorn Programme milestone template (16 weeks)
UPDATE package_configs
SET milestone_template = '[
  {"week": 1, "name": "Strategic Partnership Kickoff", "description": "Deep-dive strategy session and revenue baseline", "deliverables": ["Partnership agreement signed", "Revenue baseline documented", "Growth targets set", "Data sources identified"], "criteria": ["Revenue share terms agreed", "Baseline metrics captured", "Access granted"]},
  {"week": 2, "name": "Data & Brand Foundation", "description": "Import contacts, establish brand, and identify quick wins", "deliverables": ["Contacts imported", "RFM segments created", "Brand brief", "Quick-win opportunities identified"], "criteria": [">=100 contacts imported", "Top revenue opportunities listed"]},
  {"week": 3, "name": "Campaign & Website Configuration", "description": "Configure all campaigns and begin website development", "deliverables": ["All campaigns configured", "Website wireframes", "Messages approved"], "criteria": ["All 14 campaigns configured", "Design direction confirmed"]},
  {"week": 4, "name": "Activation Sprint", "description": "Launch reactivation campaigns and build website", "deliverables": ["Win-back launched", "Satisfaction screening active", "Website staging"], "criteria": ["First messages sent", "All pages built"]},
  {"week": 5, "name": "Response Analysis & Website Launch", "description": "Analyse responses and launch website", "deliverables": ["Performance report", "Website live", "SEO implemented", "Analytics configured"], "criteria": [">10% response rate", "Site live", "Data flowing"]},
  {"week": 6, "name": "Lifecycle & Growth Campaigns", "description": "Activate all lifecycle campaigns and prepare ad strategy", "deliverables": ["Birthday campaign", "VIP programme", "Referral programme", "Ad strategy brief"], "criteria": ["All automations running", "Strategy approved"]},
  {"week": 7, "name": "Paid Advertising Launch", "description": "Launch paid advertising campaigns", "deliverables": ["Ad creatives", "Landing pages", "Campaigns live"], "criteria": ["Ads running", "Conversions tracking"]},
  {"week": 8, "name": "Mid-Point Revenue Review", "description": "Comprehensive mid-point review with revenue tracking", "deliverables": ["Mid-point report", "Revenue attribution", "Revenue share calculation", "Strategy adjustments"], "criteria": ["Revenue tracked", "Share calculated", "Adjustments agreed"]},
  {"week": 9, "name": "E-commerce & Advanced Campaigns", "description": "E-commerce integrations and advanced campaign types", "deliverables": ["Cart recovery active", "Cross-sell campaigns", "Order status flows"], "criteria": ["Webhooks receiving", "All campaign types running"]},
  {"week": 10, "name": "Scale & Optimise", "description": "Scale winning campaigns and optimise funnel", "deliverables": ["Scale test results", "Funnel optimisation", "Budget recommendation"], "criteria": ["ROAS maintained", "Conversion improving"]},
  {"week": 11, "name": "Retargeting & Automation", "description": "Full retargeting and automation setup", "deliverables": ["Retargeting active", "Automated rules", "Advanced automations"], "criteria": ["Audiences built", "Automation running"]},
  {"week": 12, "name": "Revenue Acceleration", "description": "Focus on revenue-generating activities", "deliverables": ["Revenue report", "High-value segment campaigns", "Upsell strategies"], "criteria": ["Revenue targets on track"]},
  {"week": 13, "name": "Partnership Optimisation", "description": "Optimise all channels for maximum revenue", "deliverables": ["Channel performance analysis", "Budget reallocation", "New opportunities"], "criteria": ["All channels optimised"]},
  {"week": 14, "name": "Growth Systems", "description": "Build sustainable growth systems", "deliverables": ["Automated growth loops", "Referral scaling", "Content systems"], "criteria": ["Systems self-sustaining"]},
  {"week": 15, "name": "Revenue Review & Projection", "description": "Full revenue review and future projections", "deliverables": ["Revenue attribution report", "Revenue share settlement", "Growth projections"], "criteria": ["All revenue attributed", "Share settled"]},
  {"week": 16, "name": "Strategic Partnership Review", "description": "Final review and ongoing partnership planning", "deliverables": ["Final report", "Revenue summary", "Partnership continuation proposal", "All assets documented"], "criteria": ["All deliverables complete", "Partnership terms reviewed", "Continuation decision made"]}
]'::jsonb
WHERE package_key = 'unicorn';

-- Fix 4: Complete Programme transition rules
UPDATE package_configs
SET transition_rules = '{
  "next_packages": [],
  "quantitative_criteria": [
    {"metric": "satisfaction_score", "threshold": 4.0, "operator": ">="},
    {"metric": "roas", "threshold": 2.0, "operator": ">="},
    {"metric": "reactivation_rate", "threshold": 0.15, "operator": ">="},
    {"metric": "revenue_recovered", "threshold": 500000, "operator": ">="},
    {"metric": "website_live", "threshold": 1, "operator": ">="}
  ],
  "qualitative_criteria": [
    {"key": "wants_ongoing_management", "description": "Client wants ongoing campaign management"},
    {"key": "growth_potential", "description": "Business has significant growth potential"},
    {"key": "satisfied_with_results", "description": "Client satisfied with programme results"}
  ],
  "qualitative_minimum": 2
}'::jsonb
WHERE package_key = 'complete';

-- Fix 5: Unicorn Programme transition rules
UPDATE package_configs
SET transition_rules = '{
  "next_packages": [],
  "quantitative_criteria": [
    {"metric": "satisfaction_score", "threshold": 4.0, "operator": ">="},
    {"metric": "revenue_generated", "threshold": 1000000, "operator": ">="},
    {"metric": "roas", "threshold": 3.0, "operator": ">="},
    {"metric": "reactivation_rate", "threshold": 0.20, "operator": ">="}
  ],
  "qualitative_criteria": [
    {"key": "revenue_share_profitable", "description": "Revenue share model is profitable for both parties"},
    {"key": "wants_continuation", "description": "Client wants to continue strategic partnership"},
    {"key": "growth_trajectory", "description": "Business on strong growth trajectory"}
  ],
  "qualitative_minimum": 2
}'::jsonb
WHERE package_key = 'unicorn';

-- Verify
-- SELECT package_key, name, price_naira, duration_weeks, 
--   jsonb_array_length(milestone_template) as milestone_count,
--   description
-- FROM package_configs ORDER BY tier;
