-- 046_campaign_template_enrichment.sql
-- Add rich explanatory content to campaign templates
-- Helps business owners understand what each campaign does and why they need it

-- ============================================================
-- 1. Add new columns to campaign_templates
-- ============================================================
ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS what_it_does text,
  ADD COLUMN IF NOT EXISTS why_you_need_it text,
  ADD COLUMN IF NOT EXISTS how_it_works text,
  ADD COLUMN IF NOT EXISTS best_for text,
  ADD COLUMN IF NOT EXISTS example_result text;

-- ============================================================
-- 2. Populate all 10 existing templates with rich content
-- ============================================================

-- 1. Win-Back Campaign
UPDATE campaign_templates SET
  what_it_does = 'Automatically sends a series of personalized messages to customers who haven''t bought from you in a while, offering them special incentives to come back.',
  why_you_need_it = 'Your dormant customers already know and trust your brand. Reactivating just 15% of them costs nothing compared to acquiring new customers and can generate significant revenue.',
  how_it_works = '1. System identifies customers inactive for 90+ days
2. Sends a "We miss you" message with a discount
3. If no reply after 2 days, sends a reminder
4. Final "last chance" message after 3 days',
  best_for = 'Any business with customers who haven''t purchased in 3+ months',
  example_result = 'Businesses typically recover 15-25% of dormant customers, generating ₦500K-₦2M in recovered revenue per campaign.'
WHERE slug = 'win_back';

-- 2. Abandoned Cart Recovery
UPDATE campaign_templates SET
  what_it_does = 'Automatically messages customers who added products to their online cart but didn''t complete the purchase, reminding them and offering incentives.',
  why_you_need_it = '70% of online shopping carts are abandoned. These are people who WANTED to buy — they just need a gentle nudge. This campaign recovers that lost revenue.',
  how_it_works = '1. System detects abandoned carts (1 hour after last activity)
2. Sends a friendly reminder about items left behind
3. After 24 hours, offers a 10% discount
4. After 3 days, sends a stock warning',
  best_for = 'E-commerce businesses with Shopify or WooCommerce stores',
  example_result = 'Average cart recovery rate of 22%, meaning if you have 100 abandoned carts worth ₦50K each, you could recover ₦1.1M.'
WHERE slug = 'abandoned_cart';

-- 3. Post-Purchase Thank You
UPDATE campaign_templates SET
  what_it_does = 'Sends a warm thank-you message after every purchase, followed by product tips and a review request — building loyalty and collecting social proof.',
  why_you_need_it = 'The moment after purchase is when customers feel best about your brand. This campaign turns that goodwill into repeat purchases and reviews that attract new customers.',
  how_it_works = '1. Immediately after purchase: thank-you message with product tips
2. After 7 days: check-in asking how they''re enjoying the product
3. After 14 days: review request (only if feedback was positive)',
  best_for = 'Any business that wants more reviews and repeat customers',
  example_result = '92% open rate, 35% reply rate, and 28% of customers leave a review or make a repeat purchase.'
WHERE slug = 'post_purchase_thank_you';

-- 4. Order Status Notifications
UPDATE campaign_templates SET
  what_it_does = 'Keeps customers informed about their order at every stage — confirmation, shipping, and delivery — via WhatsApp messages they actually read.',
  why_you_need_it = 'Customers check WhatsApp 23x per day but email only 2-3x. Order updates via WhatsApp reduce "where is my order?" support queries by 60% and build trust.',
  how_it_works = '1. Order placed → instant confirmation with order details
2. Order shipped → tracking link sent
3. Order delivered → delivery confirmation with support offer',
  best_for = 'Any business that ships physical products',
  example_result = '95% open rate (vs 20% for email), 60% reduction in support queries about order status.'
WHERE slug = 'order_status';

-- 5. COD Confirmation Flow
UPDATE campaign_templates SET
  what_it_does = 'Confirms Cash-on-Delivery orders before dispatch, reducing failed deliveries and no-shows that waste your delivery costs.',
  why_you_need_it = 'In Nigeria, 30-40% of COD orders fail because customers aren''t home, changed their mind, or forgot. Each failed delivery costs you ₦2,000-₦5,000. This campaign cuts failures by half.',
  how_it_works = '1. After COD order: sends confirmation request (reply YES/NO)
2. If no reply after 24 hours: follow-up message
3. Day before delivery: reminder with amount to prepare',
  best_for = 'Any business offering Cash-on-Delivery in Nigeria',
  example_result = 'Reduces failed COD deliveries by 45-55%, saving ₦100K-₦500K per month in wasted delivery costs.'
WHERE slug = 'cod_confirmation';

-- 6. Review & Feedback Collection
UPDATE campaign_templates SET
  what_it_does = 'Systematically collects customer reviews and feedback using a satisfaction-first approach — only asking happy customers for public reviews.',
  why_you_need_it = 'Reviews are the #1 factor in purchase decisions. But asking unhappy customers for reviews backfires. This campaign screens satisfaction first, routing happy customers to review sites and unhappy ones to your support team.',
  how_it_works = '1. Sends satisfaction check (rate 1-5)
2. Happy customers (4-5) → asked for Google/social media review
3. Unhappy customers (1-3) → routed to support for resolution
4. Follow-up thank you',
  best_for = 'Businesses wanting more positive reviews without risking negative ones',
  example_result = '35% response rate, with 85% of respondents rating 4-5 stars, generating 3-5x more positive reviews per month.'
WHERE slug = 'review_collection';

-- 7. Birthday & Anniversary
UPDATE campaign_templates SET
  what_it_does = 'Automatically sends personalized birthday wishes and purchase anniversary messages with special offers, making customers feel valued.',
  why_you_need_it = 'Birthday messages have 481% higher transaction rates than regular promotions. It''s the easiest way to make customers feel personally valued and drive a purchase.',
  how_it_works = '1. On customer''s birthday: personalized wish with exclusive discount
2. On purchase anniversary: "Thank you for being with us" message with loyalty reward',
  best_for = 'Any business that collects customer birth dates',
  example_result = 'Birthday campaigns see 481% higher transaction rates and 342% higher revenue per message than standard promotions.'
WHERE slug = 'birthday_campaign';

-- 8. Upsell & Cross-Sell
UPDATE campaign_templates SET
  what_it_does = 'Recommends complementary or premium products based on what each customer has already purchased, increasing average order value.',
  why_you_need_it = 'Selling to existing customers is 5-25x cheaper than acquiring new ones. Customers who bought Product A are highly likely to want Product B — you just need to tell them about it.',
  how_it_works = '1. After purchase: recommends complementary products
2. Offers a bundle discount for buying together
3. Personalized based on actual purchase history',
  best_for = 'Businesses with multiple products or product tiers',
  example_result = 'Average 15-20% increase in revenue per customer through targeted product recommendations.'
WHERE slug = 'upsell_cross_sell';

-- 9. Referral Program
UPDATE campaign_templates SET
  what_it_does = 'Turns your happiest customers into brand ambassadors by giving them a unique referral link and rewarding both them and their friends.',
  why_you_need_it = 'Referred customers have 37% higher retention and 25% higher profit margins. Word-of-mouth is the most trusted form of marketing — this campaign systematizes it.',
  how_it_works = '1. Identifies satisfied customers (high ratings, repeat purchases)
2. Sends referral invitation with unique link/code
3. Rewards both referrer and new customer when referral converts',
  best_for = 'Businesses with high customer satisfaction wanting organic growth',
  example_result = 'Top referral programs generate 20-30% of new customers, with each referrer bringing in 2-3 new customers on average.'
WHERE slug = 'referral_program';

-- 10. VIP Customer Rewards
UPDATE campaign_templates SET
  what_it_does = 'Identifies your top-spending customers and rewards them with exclusive offers, early access to new products, and VIP treatment.',
  why_you_need_it = 'Your top 20% of customers generate 80% of your revenue. Losing even one VIP customer is devastating. This campaign makes them feel special and keeps them loyal.',
  how_it_works = '1. System identifies top spenders automatically
2. Sends exclusive VIP offer or early access notification
3. Personalized based on their purchase preferences',
  best_for = 'Any business wanting to retain high-value customers',
  example_result = 'VIP programs increase top-customer retention by 25-40% and average spend by 20%, protecting your most valuable revenue stream.'
WHERE slug = 'vip_rewards';
