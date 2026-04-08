-- Migration: 005_seed_analytics_compliance_social.sql
-- Description: Comprehensive seed data for Analytics, Compliance, Social Distribution, and Campaigns
-- Created: 2026-04-08
-- Dependencies: 001_seed_iam_ledger_ubi.sql (tenants 1-3, users 1-12)
-- Note: Uses uuid_generate_v4() and gen_random_uuid() for UUIDs

BEGIN;

SET session_replication_role = replica;

\echo '==============================================='
\echo 'Analytics, Compliance, Social & Campaigns Seed Data'
\echo 'Loading comprehensive seed data...'
\echo '==============================================='

-- ============================================
-- LANDING PAGES (prerequisite for social_posts)
-- ============================================
\echo 'Seeding landing pages...'

INSERT INTO landing_pages (id, tenant_id, user_id, business_id, template_id, name, slug, description, blocks, metadata, status, review_status, brand_tone, locale, version, is_published, published_at, created_at) VALUES
(uuid_generate_v4(), 1, 1, NULL, NULL, 'Meridian Spring Sale 2026', 'meridian-spring-sale', 'Spring promotional landing page for Meridian Dynamics', '[]', '{"title": "Spring Sale 2026", "theme": "vibrant"}', 'published', 'approved', 'professional', 'en-US', 2, true, '2026-03-01 10:00:00+00', '2026-02-15 09:00:00+00'),
(uuid_generate_v4(), 1, 1, NULL, NULL, 'Meridian Product Launch', 'meridian-launch', 'New product launch campaign page', '[]', '{"title": "Introducing Our Latest Innovation", "theme": "modern"}', 'published', 'approved', 'casual', 'en-US', 1, true, '2026-03-15 14:00:00+00', '2026-03-10 08:00:00+00'),
(uuid_generate_v4(), 1, 2, NULL, NULL, 'Meridian Affiliate Program', 'meridian-affiliate', 'Partner affiliate program registration', '[]', '{"title": "Join Our Affiliate Program", "theme": "professional"}', 'published', 'approved', 'professional', 'en-US', 3, true, '2026-02-01 11:00:00+00', '2026-01-20 10:00:00+00'),
(uuid_generate_v4(), 2, 6, NULL, NULL, 'NovaTech Spring Promo', 'novatech-spring', 'Spring promotional campaign', '[]', '{"title": "NovaTech Spring Savings", "theme": "energetic"}', 'published', 'approved', 'playful', 'en-US', 1, true, '2026-03-20 09:00:00+00', '2026-03-15 14:00:00+00'),
(uuid_generate_v4(), 2, 7, NULL, NULL, 'NovaTech Enterprise Solutions', 'novatech-enterprise', 'Enterprise product showcase', '[]', '{"title": "Enterprise Solutions", "theme": "corporate"}', 'published', 'approved', 'professional', 'en-US', 2, true, '2026-02-20 16:00:00+00', '2026-02-10 11:00:00+00'),
(uuid_generate_v4(), 3, 10, NULL, NULL, 'Apex Global Launch', 'apex-global-launch', 'Global product launch for Apex', '[]', '{"title": "Apex Global 2026", "theme": "premium"}', 'published', 'approved', 'luxurious', 'en-US', 1, true, '2026-03-25 08:00:00+00', '2026-03-20 12:00:00+00'),
(uuid_generate_v4(), 3, 11, NULL, NULL, 'Apex Q2 Campaign', 'apex-q2', 'Q2 marketing campaign page', '[]', '{"title": "Q2 Campaign", "theme": "modern"}', 'published', 'approved', 'authority', 'en-US', 1, true, '2026-04-01 10:00:00+00', '2026-03-25 09:00:00+00'),
(uuid_generate_v4(), 1, 3, NULL, NULL, 'Meridian Summer Preview', 'meridian-summer-preview', 'Upcoming summer collection preview', '[]', '{"title": "Summer 2026 Preview", "theme": "bright"}', 'draft', 'pending', 'casual', 'en-US', 1, false, NULL, '2026-04-05 15:00:00+00');

-- ============================================
-- SECTION 1: ANALYTICS - CANONICAL EVENTS (100+ events)
-- ============================================
\echo 'Seeding canonical_events...'

-- Generate 120 canonical events across tenants and event types
INSERT INTO canonical_events (id, event_id, tenant_id, workspace_id, event_type, source, spec_version, event_type_schema, data, metadata, correlation_id, timestamp, processing_time_ms, created_at)
SELECT 
    uuid_generate_v4(),
    'evt_' || substr(md5(random()::text), 1, 16),
    (ARRAY[1, 1, 1, 2, 2, 2, 3, 3])[floor(random() * 8 + 1)::int],
    uuid_generate_v4(),
    (ARRAY['page_view', 'button_click', 'form_submit', 'purchase', 'signup', 'logout', 'search_query', 'video_play', 'file_download', 'error_occurred', 'session_start', 'session_end'])[floor(random() * 12 + 1)::int],
    (ARRAY['web_app', 'mobile_app', 'api', 'email_service', 'crm'])[floor(random() * 5 + 1)::int],
    '1.0',
    'https://schemas.example.com/events/v1',
    jsonb_build_object(
        'url', 'https://example.com/page/' || (floor(random() * 100 + 1)::int),
        'referrer', CASE WHEN random() > 0.3 THEN 'https://google.com' ELSE NULL END,
        'user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'ip_hash', substr(md5(random()::text), 1, 8)
    ),
    '{}',
    uuid_generate_v4(),
    NOW() - (random() * INTERVAL '90 days'),
    (floor(random() * 50 + 1))::int,
    NOW() - (random() * INTERVAL '90 days')
FROM generate_series(1, 120);

-- ============================================
-- SECTION 2: ANALYTICS - EXPERIMENTS (5+ A/B tests)
-- ============================================
\echo 'Seeding experiments...'

INSERT INTO experiments (id, tenant_id, workspace_id, experiment_name, experiment_description, hypothesis, status, variant_config, traffic_allocation, attribution_model_id, start_date, end_date, created_at) VALUES
(uuid_generate_v4(), 1, uuid_generate_v4(), 'Homepage CTA Button Color Test', 'Testing whether green or blue CTA buttons perform better on the homepage', 'Green CTA buttons will increase click-through rates by 15% due to better contrast', 'running', 
 '{"variants": [{"id": "control", "name": "Blue Button", "weight": 50}, {"id": "variant_a", "name": "Green Button", "weight": 50}]}', 
 100.00, NULL, '2026-03-01 00:00:00+00', '2026-04-15 00:00:00+00', '2026-02-25 10:00:00+00'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'Pricing Page Layout Experiment', 'Comparing two-column vs three-column pricing table layouts', 'Three-column layout will improve conversion rates by 10%', 'running',
 '{"variants": [{"id": "control", "name": "Two Column", "weight": 50}, {"id": "variant_a", "name": "Three Column", "weight": 50}]}',
 100.00, NULL, '2026-03-15 00:00:00+00', '2026-04-30 00:00:00+00', '2026-03-10 14:00:00+00'),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'Checkout Flow Simplification', 'Test simplified one-page checkout vs multi-step', 'One-page checkout will reduce cart abandonment by 20%', 'completed',
 '{"variants": [{"id": "control", "name": "Multi-step", "weight": 50}, {"id": "variant_a", "name": "One-page", "weight": 50}]}',
 100.00, NULL, '2026-02-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-01-20 09:00:00+00'),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'Email Subject Line Test', 'Testing emoji vs no emoji in email subject lines', 'Emojis will increase open rates by 25%', 'running',
 '{"variants": [{"id": "control", "name": "No Emoji", "weight": 50}, {"id": "variant_a", "name": "With Emoji", "weight": 50}]}',
 100.00, NULL, '2026-03-20 00:00:00+00', '2026-04-20 00:00:00+00', '2026-03-15 11:00:00+00'),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'Landing Page Hero Image Test', 'Testing lifestyle photography vs product-only images', 'Lifestyle photography will increase time on page by 30%', 'draft',
 '{"variants": [{"id": "control", "name": "Product Only", "weight": 50}, {"id": "variant_a", "name": "Lifestyle", "weight": 50}]}',
 100.00, NULL, '2026-04-10 00:00:00+00', '2026-05-10 00:00:00+00', '2026-04-01 08:00:00+00'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'Free Trial Duration Test', 'Testing 7-day vs 14-day free trial periods', '14-day trial will increase paid conversions by 15%', 'running',
 '{"variants": [{"id": "control", "name": "7 Days", "weight": 50}, {"id": "variant_a", "name": "14 Days", "weight": 50}]}',
 100.00, NULL, '2026-03-25 00:00:00+00', '2026-04-25 00:00:00+00', '2026-03-18 16:00:00+00');

-- ============================================
-- SECTION 3: ANALYTICS - EXPERIMENT RESULTS
-- ============================================
\echo 'Seeding experiment_results...'

-- Get experiment IDs
DO $$
DECLARE
    exp1_id UUID;
    exp2_id UUID;
    exp3_id UUID;
    exp4_id UUID;
BEGIN
    SELECT id INTO exp1_id FROM experiments WHERE experiment_name = 'Homepage CTA Button Color Test' LIMIT 1;
    SELECT id INTO exp2_id FROM experiments WHERE experiment_name = 'Pricing Page Layout Experiment' LIMIT 1;
    SELECT id INTO exp3_id FROM experiments WHERE experiment_name = 'Checkout Flow Simplification' LIMIT 1;
    SELECT id INTO exp4_id FROM experiments WHERE experiment_name = 'Email Subject Line Test' LIMIT 1;
    
    -- Experiment 1 results (running)
    INSERT INTO experiment_results (experiment_id, variant_id, variant_name, metric_name, metric_value, sample_size, confidence_level, p_value, statistical_significance, winner) VALUES
    (exp1_id, 'control', 'Blue Button', 'click_through_rate', 0.0234, 5420, 0.9542, 0.0123, true, false),
    (exp1_id, 'variant_a', 'Green Button', 'click_through_rate', 0.0287, 5380, 0.9542, 0.0123, true, true),
    (exp1_id, 'control', 'Blue Button', 'conversion_rate', 0.0312, 5420, 0.9200, 0.0450, false, false),
    (exp1_id, 'variant_a', 'Green Button', 'conversion_rate', 0.0334, 5380, 0.9200, 0.0450, false, false);
    
    -- Experiment 2 results (running)
    INSERT INTO experiment_results (experiment_id, variant_id, variant_name, metric_name, metric_value, sample_size, confidence_level, p_value, statistical_significance, winner) VALUES
    (exp2_id, 'control', 'Two Column', 'conversion_rate', 0.0421, 3250, 0.8823, 0.0890, false, false),
    (exp2_id, 'variant_a', 'Three Column', 'conversion_rate', 0.0487, 3280, 0.8823, 0.0890, false, true);
    
    -- Experiment 3 results (completed - winner variant_a)
    INSERT INTO experiment_results (experiment_id, variant_id, variant_name, metric_name, metric_value, sample_size, confidence_level, p_value, statistical_significance, winner) VALUES
    (exp3_id, 'control', 'Multi-step', 'cart_abandonment_rate', 0.6820, 4500, 0.9901, 0.0034, true, false),
    (exp3_id, 'variant_a', 'One-page', 'cart_abandonment_rate', 0.5410, 4520, 0.9901, 0.0034, true, true),
    (exp3_id, 'control', 'Multi-step', 'checkout_completion_time', 245.50, 4500, 0.9850, 0.0050, true, false),
    (exp3_id, 'variant_a', 'One-page', 'checkout_completion_time', 127.30, 4520, 0.9850, 0.0050, true, true);
    
    -- Experiment 4 results (running)
    INSERT INTO experiment_results (experiment_id, variant_id, variant_name, metric_name, metric_value, sample_size, confidence_level, p_value, statistical_significance, winner) VALUES
    (exp4_id, 'control', 'No Emoji', 'open_rate', 0.2456, 8750, 0.9100, 0.0234, true, false),
    (exp4_id, 'variant_a', 'With Emoji', 'open_rate', 0.3124, 8720, 0.9100, 0.0234, true, true);
END $$;

-- ============================================
-- SECTION 4: ANALYTICS - ATTRIBUTION TOUCHPOINTS
-- ============================================
\echo 'Seeding attribution_touchpoints...'

INSERT INTO attribution_touchpoints (id, tenant_id, workspace_id, visitor_id, session_id, touchpoint_type, touchpoint_id, touchpoint_data, channel, source, medium, campaign, content, keyword, first_interaction_at, last_interaction_at, interaction_count, conversion_id, created_at)
SELECT 
    uuid_generate_v4(),
    (ARRAY[1, 1, 2, 2, 3])[floor(random() * 5 + 1)::int],
    uuid_generate_v4(),
    'visitor_' || substr(md5(random()::text), 1, 8),
    uuid_generate_v4(),
    (ARRAY['organic_search', 'paid_search', 'social_media', 'email', 'direct', 'referral'])[floor(random() * 6 + 1)::int],
    'tp_' || substr(md5(random()::text), 1, 8),
    '{}',
    (ARRAY['google', 'facebook', 'twitter', 'linkedin', 'email', 'display'])[floor(random() * 6 + 1)::int],
    (ARRAY['organic', 'cpc', 'banner', 'social'])[floor(random() * 4 + 1)::int],
    (ARRAY['cpc', 'organic', 'social'])[floor(random() * 3 + 1)::int],
    'spring_campaign_' || (floor(random() * 3 + 1)::int),
    'banner_' || (floor(random() * 5 + 1)::int),
    (ARRAY['product', 'sale', 'discount', 'spring', NULL])[floor(random() * 5 + 1)::int],
    NOW() - (random() * INTERVAL '60 days'),
    NOW() - (random() * INTERVAL '30 days'),
    (floor(random() * 10 + 1))::int,
    NULL,
    NOW() - (random() * INTERVAL '60 days')
FROM generate_series(1, 75);

-- ============================================
-- SECTION 5: ANALYTICS - CONVERSIONS
-- ============================================
\echo 'Seeding conversions...'

INSERT INTO conversions (id, tenant_id, workspace_id, visitor_id, session_id, conversion_type, conversion_value, currency, revenue, cost, touchpoints, attributed_channel, attributed_source, attributed_medium, attributed_campaign, conversion_date, created_at)
SELECT 
    uuid_generate_v4(),
    (ARRAY[1, 1, 2, 2, 3])[floor(random() * 5 + 1)::int],
    uuid_generate_v4(),
    'visitor_' || substr(md5(random()::text), 1, 8),
    uuid_generate_v4(),
    (ARRAY['purchase', 'signup', 'lead_form', 'download', 'subscription'])[floor(random() * 5 + 1)::int],
    (random() * 500 + 10)::decimal(15, 4),
    'USD',
    (random() * 450 + 5)::decimal(15, 4),
    (random() * 50 + 1)::decimal(15, 4),
    '[]',
    (ARRAY['google', 'facebook', 'twitter', 'linkedin', 'email'])[floor(random() * 5 + 1)::int],
    (ARRAY['organic', 'cpc', 'social'])[floor(random() * 3 + 1)::int],
    (ARRAY['cpc', 'organic', 'social', 'email'])[floor(random() * 4 + 1)::int],
    'campaign_' || (floor(random() * 4 + 1)::int),
    NOW() - (random() * INTERVAL '45 days'),
    NOW() - (random() * INTERVAL '45 days')
FROM generate_series(1, 45);

-- ============================================
-- SECTION 6: ANALYTICS - REAL-TIME METRICS
-- ============================================
\echo 'Seeding real_time_metrics...'

INSERT INTO real_time_metrics (id, tenant_id, workspace_id, metric_name, metric_value, metric_type, dimensions, window_start, window_end, recorded_at)
SELECT 
    uuid_generate_v4(),
    (ARRAY[1, 1, 2, 2, 3, 3])[floor(random() * 6 + 1)::int],
    uuid_generate_v4(),
    (ARRAY['page_views', 'unique_visitors', 'conversion_rate', 'bounce_rate', 'avg_session_duration', 'revenue', 'active_users', 'api_calls'])[floor(random() * 8 + 1)::int],
    (random() * 10000 + 100)::decimal(15, 4),
    (ARRAY['counter', 'gauge', 'rate', 'percentage'])[floor(random() * 4 + 1)::int],
    '{}',
    NOW() - INTERVAL '1 hour',
    NOW(),
    NOW() - (random() * INTERVAL '1 hour')
FROM generate_series(1, 60);

-- ============================================
-- SECTION 7: ANALYTICS - ANOMALY ALERTS
-- ============================================
\echo 'Seeding anomaly_alerts...'

INSERT INTO anomaly_alerts (id, tenant_id, workspace_id, alert_type, metric_name, current_value, expected_value, deviation_percentage, severity, status, description, metadata, detected_at, resolved_at) VALUES
(uuid_generate_v4(), 1, uuid_generate_v4(), 'spike', 'page_views', 15420.00, 8500.00, 81.41, 'high', 'resolved', 'Page views spike detected on homepage - possible viral content or DoS attack', '{"page_url": "/homepage", "threshold": 2.0}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'drop', 'conversion_rate', 0.012, 0.035, -65.71, 'critical', 'active', 'Conversion rate dropped significantly below expected threshold', '{"page_url": "/checkout", "baseline": 0.035}', NOW() - INTERVAL '2 days', NULL),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'spike', 'api_error_rate', 0.089, 0.01, 790.00, 'critical', 'investigating', 'API error rate spike - possible service degradation', '{"service": "checkout-api", "endpoint": "/api/v2/purchase"}', NOW() - INTERVAL '12 hours', NULL),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'drop', 'revenue', 12450.00, 25000.00, -50.20, 'high', 'resolved', 'Revenue dropped 50% compared to yesterday same period', '{"comparison": "yesterday", "time_range": "morning"}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'spike', 'latency_p99', 2450.00, 200.00, 1125.00, 'critical', 'active', 'P99 latency exceeded threshold by 10x', '{"service": "user-api", "region": "us-east-1"}', NOW() - INTERVAL '6 hours', NULL),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'anomaly', 'bounce_rate', 0.89, 0.45, 97.78, 'medium', 'resolved', 'Bounce rate significantly higher than normal', '{"page": "/landing-page-a", "expected_range": "0.35-0.55"}', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'drop', 'active_users', 125, 450, -72.22, 'high', 'investigating', 'Active users dropped below 30% of normal', '{"threshold": 0.7, "baseline": 450}', NOW() - INTERVAL '1 day', NULL);

-- ============================================
-- SECTION 8: ANALYTICS - COHORT ANALYSIS
-- ============================================
\echo 'Seeding cohort_analysis...'

INSERT INTO cohort_analysis (id, tenant_id, workspace_id, cohort_type, cohort_date, cohort_size, metric_name, metric_values, period_number, created_at) VALUES
(uuid_generate_v4(), 1, uuid_generate_v4(), 'weekly', '2026-03-01', 1250, 'retention_rate', '[1.0, 0.72, 0.58, 0.45, 0.38, 0.32, 0.28, 0.25]', 8, NOW() - INTERVAL '30 days'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'weekly', '2026-03-08', 1180, 'retention_rate', '[1.0, 0.68, 0.52, 0.41, 0.35, 0.29, 0.24]', 7, NOW() - INTERVAL '23 days'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'weekly', '2026-03-15', 1320, 'retention_rate', '[1.0, 0.75, 0.61, 0.48, 0.40]', 5, NOW() - INTERVAL '16 days'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'weekly', '2026-03-22', 1150, 'retention_rate', '[1.0, 0.71, 0.55, 0.43]', 4, NOW() - INTERVAL '9 days'),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'weekly', '2026-03-29', 1280, 'retention_rate', '[1.0, 0.74, 0.59]', 3, NOW() - INTERVAL '2 days'),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'monthly', '2026-02-01', 4500, 'revenue_per_user', '[45.50, 52.30, 61.20, 68.90, 72.40, 75.80]', 6, NOW() - INTERVAL '35 days'),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'monthly', '2026-03-01', 4850, 'revenue_per_user', '[48.20, 55.70, 64.10, 71.30]', 4, NOW() - INTERVAL '8 days'),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'weekly', '2026-03-01', 2800, 'engagement_rate', '[0.82, 0.68, 0.55, 0.48, 0.42, 0.38, 0.35, 0.32]', 8, NOW() - INTERVAL '28 days'),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'weekly', '2026-03-08', 2650, 'engagement_rate', '[0.85, 0.72, 0.58, 0.51, 0.44, 0.39]', 6, NOW() - INTERVAL '21 days'),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'weekly', '2026-03-15', 3100, 'engagement_rate', '[0.88, 0.75, 0.62, 0.53]', 4, NOW() - INTERVAL '14 days');

-- ============================================
-- SECTION 9: ANALYTICS - FUNNEL ANALYSIS
-- ============================================
\echo 'Seeding funnel_analysis...'

INSERT INTO funnel_analysis (id, tenant_id, workspace_id, funnel_name, funnel_steps, total_users, conversion_rates, drop_off_rates, created_at, updated_at) VALUES
(uuid_generate_v4(), 1, uuid_generate_v4(), 'E-commerce Purchase Funnel', 
 '["Homepage", "Product Page", "Add to Cart", "Checkout", "Purchase Complete"]',
 15420, '[1.0, 0.42, 0.28, 0.18, 0.12]', '[0, 58, 33, 56, 33]', NOW() - INTERVAL '10 days', NOW()),
(uuid_generate_v4(), 1, uuid_generate_v4(), 'Lead Generation Funnel',
 '["Landing Page", "Lead Form", "Thank You Page", "Email Confirmed", "Sales Contact"]',
 8540, '[1.0, 0.35, 0.28, 0.22, 0.08]',
 '[0, 65, 20, 21, 64]', NOW() - INTERVAL '15 days', NOW()),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'SaaS Trial Conversion Funnel',
 '["Signup Page", "Email Verified", "First Login", "Onboarding Complete", "Trial Activated", "Upgrade Intent"]',
 4280, '[1.0, 0.82, 0.65, 0.42, 0.28, 0.15]',
 '[0, 18, 21, 35, 33, 46]', NOW() - INTERVAL '20 days', NOW()),
(uuid_generate_v4(), 2, uuid_generate_v4(), 'Free Trial to Paid Funnel',
 '["Trial Users", "Activated Trial", "Used Core Feature", "Generated Report", "Sales Qualified"]',
 2850, '[1.0, 0.68, 0.45, 0.28, 0.12]',
 '[0, 32, 34, 38, 57]', NOW() - INTERVAL '12 days', NOW()),
(uuid_generate_v4(), 3, uuid_generate_v4(), 'Enterprise Sales Funnel',
 '["Demo Request", "Discovery Call", "Proposal Sent", "Negotiation", "Contract Signed"]',
 485, '[1.0, 0.52, 0.35, 0.22, 0.12]',
 '[0, 48, 33, 37, 45]', NOW() - INTERVAL '25 days', NOW());

-- ============================================
-- SECTION 10: AFFILIATE INTELLIGENCE - MERCHANTS (8+)
-- ============================================
\echo 'Seeding merchants...'

INSERT INTO merchants (id, name, slug, network, website_url, logo_url, description, categories, commission_rules, average_commission, commission_type, payout_threshold, payout_frequency, cookie_duration, is_verified, is_active, metadata) VALUES
(uuid_generate_v4(), 'TechGadgets Pro', 'techgadgets-pro', 'AffiliateNetworkA', 'https://techgadgets.example.com', 'https://cdn.example.com/logos/tgp.png', 'Premium consumer electronics and gadgets retailer', ARRAY['Electronics', 'Gadgets', 'Accessories'], '{"tiered": true, "tiers": [{"sales": 1000, "rate": 0.05}, {"sales": 5000, "rate": 0.07}, {"sales": 10000, "rate": 0.10}]}', 0.0725, 'percentage', 50.00, 'monthly', 30, true, true, '{}'),
(uuid_generate_v4(), 'StyleVault Fashion', 'stylevault-fashion', 'AffiliateNetworkB', 'https://stylevault.example.com', 'https://cdn.example.com/logos/svf.png', 'Contemporary fashion and apparel brand', ARRAY['Fashion', 'Apparel', 'Shoes'], '{"flat": {"rate": 0.08, "per_sale": 5.00}}', 0.0800, 'hybrid', 25.00, 'bi-weekly', 45, true, true, '{}'),
(uuid_generate_v4(), 'HomeEssential Plus', 'homeessential-plus', 'AffiliateNetworkA', 'https://homeessential.example.com', 'https://cdn.example.com/logos/hep.png', 'Premium home goods and furniture', ARRAY['Home', 'Furniture', 'Decor'], '{"tiered": true, "tiers": [{"sales": 500, "rate": 0.04}, {"sales": 2000, "rate": 0.06}]}', 0.0500, 'percentage', 100.00, 'monthly', 60, true, true, '{}'),
(uuid_generate_v4(), 'FitLife Sports', 'fitlife-sports', 'AffiliateNetworkC', 'https://fitlife.example.com', 'https://cdn.example.com/logos/fls.png', 'Athletic wear and fitness equipment', ARRAY['Sports', 'Fitness', 'Apparel'], '{"flat": {"rate": 0.10, "per_sale": 3.00}}', 0.1000, 'hybrid', 20.00, 'weekly', 30, true, true, '{}'),
(uuid_generate_v4(), 'BookWorld Online', 'bookworld-online', 'AffiliateNetworkB', 'https://bookworld.example.com', 'https://cdn.example.com/logos/bwo.png', 'Online bookstore with wide selection', ARRAY['Books', 'E-books', 'Audiobooks'], '{"flat": {"rate": 0.05, "per_sale": 2.50}}', 0.0500, 'percentage', 15.00, 'monthly', 7, true, true, '{}'),
(uuid_generate_v4(), 'CloudSoft Software', 'cloudsoft-software', 'Direct', 'https://cloudsoft.example.com', 'https://cdn.example.com/logos/css.png', 'Software subscriptions and SaaS products', ARRAY['Software', 'SaaS', 'Cloud'], '{"recurring": {"rate": 0.20, "duration": 12}}}', 0.2000, 'recurring', 100.00, 'monthly', 90, true, true, '{}'),
(uuid_generate_v4(), 'GreenGarden Supply', 'greengarden-supply', 'AffiliateNetworkA', 'https://greengarden.example.com', 'https://cdn.example.com/logos/ggs.png', 'Sustainable gardening and outdoor products', ARRAY['Garden', 'Outdoor', 'Sustainability'], '{"tiered": true, "tiers": [{"sales": 500, "rate": 0.06}, {"sales": 2500, "rate": 0.08}]}', 0.0700, 'percentage', 35.00, 'monthly', 30, false, true, '{}'),
(uuid_generate_v4(), 'PetParadise', 'petparadise', 'AffiliateNetworkC', 'https://petparadise.example.com', 'https://cdn.example.com/logos/pp.png', 'Pet supplies and accessories for all pets', ARRAY['Pets', 'Supplies', 'Food'], '{"flat": {"rate": 0.07, "per_sale": 4.00}}', 0.0700, 'hybrid', 20.00, 'bi-weekly', 14, true, true, '{}'),
(uuid_generate_v4(), 'AutoParts Direct', 'autoparts-direct', 'Direct', 'https://autoparts.example.com', 'https://cdn.example.com/logos/apd.png', 'Auto parts and accessories retailer', ARRAY['Auto', 'Parts', 'Accessories'], '{"tiered": true, "tiers": [{"sales": 1000, "rate": 0.03}, {"sales": 5000, "rate": 0.05}]}', 0.0400, 'percentage', 75.00, 'monthly', 7, false, false, '{}');

-- ============================================
-- SECTION 11: AFFILIATE INTELLIGENCE - PRODUCTS (20+)
-- ============================================
\echo 'Seeding products...'

DO $$
DECLARE
    merch1_id UUID;
    merch2_id UUID;
    merch3_id UUID;
    merch4_id UUID;
    merch5_id UUID;
    merch6_id UUID;
    merch7_id UUID;
    merch8_id UUID;
BEGIN
    SELECT id INTO merch1_id FROM merchants WHERE slug = 'techgadgets-pro' LIMIT 1;
    SELECT id INTO merch2_id FROM merchants WHERE slug = 'stylevault-fashion' LIMIT 1;
    SELECT id INTO merch3_id FROM merchants WHERE slug = 'homeessential-plus' LIMIT 1;
    SELECT id INTO merch4_id FROM merchants WHERE slug = 'fitlife-sports' LIMIT 1;
    SELECT id INTO merch5_id FROM merchants WHERE slug = 'bookworld-online' LIMIT 1;
    SELECT id INTO merch6_id FROM merchants WHERE slug = 'cloudsoft-software' LIMIT 1;
    SELECT id INTO merch7_id FROM merchants WHERE slug = 'greengarden-supply' LIMIT 1;
    SELECT id INTO merch8_id FROM merchants WHERE slug = 'petparadise' LIMIT 1;
    
    INSERT INTO products (id, merchant_id, name, sku, description, category, subcategory, brand, image_url, product_url, original_price, current_price, sale_price, currency, in_stock, stock_quantity) VALUES
    (uuid_generate_v4(), merch1_id, 'Wireless Bluetooth Earbuds Pro', 'TGP-WBE-001', 'Premium wireless earbuds with noise cancellation', 'Electronics', 'Audio', 'TechGadgets', 'https://cdn.example.com/products/wbe001.jpg', 'https://techgadgets.example.com/earbuds-pro', 199.99, 149.99, 129.99, 'USD', true, 250),
    (uuid_generate_v4(), merch1_id, 'Smart Fitness Watch X3', 'TGP-SFW-002', 'Advanced fitness tracking with GPS', 'Electronics', 'Wearables', 'TechGadgets', 'https://cdn.example.com/products/sfw002.jpg', 'https://techgadgets.example.com/smartwatch-x3', 349.99, 299.99, NULL, 'USD', true, 180),
    (uuid_generate_v4(), merch1_id, 'Portable Power Bank 20000mAh', 'TGP-PPB-003', 'High capacity portable charger', 'Electronics', 'Accessories', 'TechGadgets', 'https://cdn.example.com/products/ppb003.jpg', 'https://techgadgets.example.com/powerbank-20k', 59.99, 39.99, 34.99, 'USD', true, 500),
    (uuid_generate_v4(), merch2_id, 'Premium Cotton T-Shirt', 'SVF-PCT-001', 'Soft premium cotton crew neck tee', 'Apparel', 'Tops', 'StyleVault', 'https://cdn.example.com/products/pct001.jpg', 'https://stylevault.example.com/cotton-tshirt', 45.00, 38.00, NULL, 'USD', true, 1200),
    (uuid_generate_v4(), merch2_id, 'Slim Fit Denim Jeans', 'SVF-SFD-002', 'Modern slim fit stretch denim', 'Apparel', 'Bottoms', 'StyleVault', 'https://cdn.example.com/products/sfd002.jpg', 'https://stylevault.example.com/slim-jeans', 89.00, 75.00, 65.00, 'USD', true, 450),
    (uuid_generate_v4(), merch3_id, 'Ergonomic Office Chair', 'HEP-EOC-001', 'Adjustable lumbar support office chair', 'Furniture', 'Office', 'HomeEssential', 'https://cdn.example.com/products/eoc001.jpg', 'https://homeessential.example.com/ergo-chair', 450.00, 399.00, NULL, 'USD', true, 85),
    (uuid_generate_v4(), merch3_id, 'Smart LED Desk Lamp', 'HEP-SLD-002', 'Adjustable color temperature desk lamp', 'Decor', 'Lighting', 'HomeEssential', 'https://cdn.example.com/products/sld002.jpg', 'https://homeessential.example.com/desk-lamp', 79.99, 59.99, 49.99, 'USD', true, 320),
    (uuid_generate_v4(), merch4_id, 'Running Shoes Air Max', 'FLS-RSM-001', 'Lightweight running shoes with air cushion', 'Sports', 'Footwear', 'FitLife', 'https://cdn.example.com/products/rsm001.jpg', 'https://fitlife.example.com/running-shoes', 129.00, 109.00, 99.00, 'USD', true, 280),
    (uuid_generate_v4(), merch4_id, 'Yoga Mat Premium', 'FLS-YMP-002', 'Non-slip eco-friendly yoga mat', 'Fitness', 'Equipment', 'FitLife', 'https://cdn.example.com/products/ymp002.jpg', 'https://fitlife.example.com/yoga-mat', 65.00, 49.00, NULL, 'USD', true, 560),
    (uuid_generate_v4(), merch5_id, 'Bestseller Novel Collection', 'BWO-BNC-001', 'Collection of 5 bestselling novels', 'Books', 'Fiction', 'BookWorld', 'https://cdn.example.com/products/bnc001.jpg', 'https://bookworld.example.com/novel-collection', 149.99, 99.99, NULL, 'USD', true, 800),
    (uuid_generate_v4(), merch5_id, 'Business Success Audiobook Bundle', 'BWO-BSA-002', '8 audiobooks on business and success', 'Audiobooks', 'Business', 'BookWorld', 'https://cdn.example.com/products/bsa002.jpg', 'https://bookworld.example.com/audiobook-bundle', 199.99, 149.99, 129.99, 'USD', true, 420),
    (uuid_generate_v4(), merch6_id, 'CloudSoft Pro Annual Subscription', 'CSS-CPA-001', 'Annual subscription to CloudSoft Pro', 'SaaS', 'Software', 'CloudSoft', 'https://cdn.example.com/products/cpa001.jpg', 'https://cloudsoft.example.com/pro-annual', 299.99, 249.99, NULL, 'USD', true, NULL),
    (uuid_generate_v4(), merch6_id, 'CloudSoft Team Monthly', 'CSS-CTM-002', 'Monthly team plan for up to 10 users', 'SaaS', 'Software', 'CloudSoft', 'https://cdn.example.com/products/ctm002.jpg', 'https://cloudsoft.example.com/team-monthly', 49.99, 39.99, NULL, 'USD', true, NULL),
    (uuid_generate_v4(), merch7_id, 'Raised Garden Bed Kit', 'GGS-RGB-001', '6-in-1 modular raised garden bed', 'Garden', 'Planters', 'GreenGarden', 'https://cdn.example.com/products/rgb001.jpg', 'https://greengarden.example.com/raised-bed', 189.99, 159.99, 139.99, 'USD', true, 150),
    (uuid_generate_v4(), merch7_id, 'Compost Bin Outdoor', 'GGS-CBO-002', 'Dual chamber outdoor composter', 'Garden', 'Composting', 'GreenGarden', 'https://cdn.example.com/products/cbo002.jpg', 'https://greengarden.example.com/compost-bin', 89.99, 79.99, NULL, 'USD', true, 280),
    (uuid_generate_v4(), merch8_id, 'Premium Dog Food 25lb', 'PP-PDF-001', 'Grain-free premium dog food', 'Pet Food', 'Dogs', 'PetParadise', 'https://cdn.example.com/products/pdf001.jpg', 'https://petparadise.example.com/dog-food', 74.99, 64.99, 59.99, 'USD', true, 680),
    (uuid_generate_v4(), merch8_id, 'Cat Tree Tower', 'PP-CTT-002', 'Multi-level cat climbing tree', 'Pet Supplies', 'Cats', 'PetParadise', 'https://cdn.example.com/products/ctt002.jpg', 'https://petparadise.example.com/cat-tree', 129.99, 109.99, NULL, 'USD', true, 195),
    (uuid_generate_v4(), merch1_id, 'USB-C Hub 7-in-1', 'TGP-UCH-004', 'Multi-port USB-C adapter', 'Electronics', 'Accessories', 'TechGadgets', 'https://cdn.example.com/products/uch004.jpg', 'https://techgadgets.example.com/usb-hub', 49.99, 39.99, 32.99, 'USD', true, 890),
    (uuid_generate_v4(), merch2_id, 'Wool Blend Winter Coat', 'SVF-WBW-003', 'Classic wool blend winter coat', 'Apparel', 'Outerwear', 'StyleVault', 'https://cdn.example.com/products/wbw003.jpg', 'https://stylevault.example.com/winter-coat', 249.00, 199.00, 179.00, 'USD', true, 120),
    (uuid_generate_v4(), merch4_id, 'Resistance Bands Set', 'FLS-RBS-003', '5-piece resistance bands with handles', 'Fitness', 'Equipment', 'FitLife', 'https://cdn.example.com/products/rbs003.jpg', 'https://fitlife.example.com/bands-set', 35.00, 24.99, 19.99, 'USD', true, 1100),
    (uuid_generate_v4(), merch3_id, 'Memory Foam Mattress Topper', 'HEP-MFM-003', 'Queen size memory foam topper', 'Home', 'Bedding', 'HomeEssential', 'https://cdn.example.com/products/mfm003.jpg', 'https://homeessential.example.com/mattress-topper', 159.99, 129.99, 99.99, 'USD', true, 210);
END $$;

-- ============================================
-- SECTION 12: AFFILIATE INTELLIGENCE - OFFERS
-- ============================================
\echo 'Seeding offers...'

DO $$
DECLARE
    merch1_id UUID;
    merch2_id UUID;
    merch3_id UUID;
    merch4_id UUID;
    merch5_id UUID;
    merch6_id UUID;
BEGIN
    SELECT id INTO merch1_id FROM merchants WHERE slug = 'techgadgets-pro' LIMIT 1;
    SELECT id INTO merch2_id FROM merchants WHERE slug = 'stylevault-fashion' LIMIT 1;
    SELECT id INTO merch3_id FROM merchants WHERE slug = 'homeessential-plus' LIMIT 1;
    SELECT id INTO merch4_id FROM merchants WHERE slug = 'fitlife-sports' LIMIT 1;
    SELECT id INTO merch5_id FROM merchants WHERE slug = 'bookworld-online' LIMIT 1;
    SELECT id INTO merch6_id FROM merchants WHERE slug = 'cloudsoft-software' LIMIT 1;
    
    INSERT INTO offers (id, merchant_id, offer_code, title, description, offer_type, discount_type, discount_value, commission_rate, commission_amount, minimum_purchase, maximum_discount, currency, start_date, end_date, is_exclusive, is_verified, is_featured, usage_count, success_rate, last_verified_at, status, categories, tags) VALUES
    (uuid_generate_v4(), merch1_id, 'TECHGADGET20', '20% Off All Electronics', 'Sitewide 20% discount on all electronics', 'discount', 'percentage', 20.00, 0.08, NULL, 50.00, 100.00, 'USD', '2026-03-01 00:00:00+00', '2026-04-30 23:59:59+00', false, true, true, 1520, 0.85, NOW() - INTERVAL '2 days', 'active', ARRAY['Electronics'], ARRAY['sale', 'electronics', 'tech']),
    (uuid_generate_v4(), merch1_id, 'FREESHIP', 'Free Shipping on Orders Over $75', 'Free expedited shipping on orders over $75', 'free_shipping', NULL, NULL, 0.05, 2.50, 75.00, NULL, 'USD', '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', false, true, false, 4520, 0.92, NOW() - INTERVAL '1 day', 'active', ARRAY['Electronics', 'Accessories'], ARRAY['shipping', 'free-ship']),
    (uuid_generate_v4(), merch2_id, 'STYLE15', '$15 Off $75+ Order', '$15 discount on orders of $75 or more', 'discount', 'fixed', 15.00, 0.07, NULL, 75.00, 15.00, 'USD', '2026-03-15 00:00:00+00', '2026-05-15 23:59:59+00', true, true, true, 890, 0.78, NOW() - INTERVAL '3 days', 'active', ARRAY['Fashion', 'Apparel'], ARRAY['sale', 'fashion', 'discount']),
    (uuid_generate_v4(), merch3_id, 'HOME25', '25% Off Furniture', 'Spring sale on all furniture items', 'discount', 'percentage', 25.00, 0.06, NULL, 100.00, 150.00, 'USD', '2026-03-20 00:00:00+00', '2026-04-20 23:59:59+00', false, true, true, 420, 0.72, NOW() - INTERVAL '1 day', 'active', ARRAY['Furniture', 'Home'], ARRAY['furniture', 'sale', 'spring']),
    (uuid_generate_v4(), merch4_id, 'FITNESS30', '30% Off Fitness Gear', 'Spring fitness gear sale - 30% off', 'discount', 'percentage', 30.00, 0.10, NULL, NULL, 50.00, 'USD', '2026-03-01 00:00:00+00', '2026-04-15 23:59:59+00', false, true, false, 1100, 0.81, NOW() - INTERVAL '4 days', 'active', ARRAY['Fitness', 'Sports'], ARRAY['fitness', 'sale', 'spring']),
    (uuid_generate_v4(), merch5_id, 'BOOKLOVER', 'Buy 2 Get 1 Free', 'Buy any 2 books, get the 3rd free', 'bogo', NULL, NULL, 0.05, NULL, 30.00, NULL, 'USD', '2026-01-01 00:00:00+00', '2026-06-30 23:59:59+00', false, true, true, 2800, 0.88, NOW() - INTERVAL '5 days', 'active', ARRAY['Books', 'Audiobooks'], ARRAY['books', 'bogo', 'reading']),
    (uuid_generate_v4(), merch6_id, 'CLOUDPRO50', '$50 Off Pro Annual', '$50 off CloudSoft Pro annual subscription', 'discount', 'fixed', 50.00, 0.25, NULL, NULL, NULL, 'USD', '2026-04-01 00:00:00+00', '2026-06-30 23:59:59+00', true, true, true, 350, 0.75, NOW() - INTERVAL '1 day', 'active', ARRAY['SaaS', 'Software'], ARRAY['software', 'saas', 'discount']),
    (uuid_generate_v4(), merch1_id, 'EARBUDSBUNDLE', 'Earbuds + Case Bundle', 'Save $30 on earbuds + case bundle', 'bundle', NULL, NULL, 0.09, NULL, NULL, 30.00, 'USD', '2026-02-01 00:00:00+00', '2026-05-31 23:59:59+00', false, false, false, 180, 0.68, NOW() - INTERVAL '10 days', 'active', ARRAY['Electronics', 'Audio'], ARRAY['bundle', 'earbuds']),
    (uuid_generate_v4(), merch2_id, 'NEWLOOK', 'First Order 15% Off', '15% off your first order', 'new_customer', 'percentage', 15.00, 0.06, NULL, NULL, 25.00, 'USD', '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', false, true, false, 2100, 0.82, NOW() - INTERVAL '2 days', 'active', ARRAY['Fashion', 'Apparel'], ARRAY['new-customer', 'first-order']),
    (uuid_generate_v4(), merch4_id, 'SUMMERPREP', 'Summer Prep Sale', '30% off summer training gear', 'discount', 'percentage', 30.00, 0.10, NULL, NULL, 40.00, 'USD', '2026-04-01 00:00:00+00', '2026-04-30 23:59:59+00', false, true, true, 620, 0.79, NOW(), 'active', ARRAY['Sports', 'Fitness'], ARRAY['summer', 'training', 'sale']);
END $$;

-- ============================================
-- SECTION 13: AFFILIATE INTELLIGENCE - OFFER SNAPSHOTS
-- ============================================
\echo 'Seeding offer_snapshots...'

DO $$
DECLARE
    offer1_id UUID;
    offer2_id UUID;
BEGIN
    SELECT id INTO offer1_id FROM offers WHERE offer_code = 'TECHGADGET20' LIMIT 1;
    SELECT id INTO offer2_id FROM offers WHERE offer_code = 'STYLE15' LIMIT 1;
    
    INSERT INTO offer_snapshots (id, offer_id, version, title, description, discount_type, discount_value, commission_rate, commission_amount, minimum_purchase, maximum_discount, start_date, end_date, status, price_at_snapshot, commission_at_snapshot, snapshot_reason) VALUES
    (uuid_generate_v4(), offer1_id, 1, '20% Off All Electronics', 'Sitewide 20% discount on all electronics', 'percentage', 20.00, 0.07, NULL, 50.00, 100.00, '2026-03-01 00:00:00+00', '2026-04-15 23:59:59+00', 'active', 149.99, 12.00, 'initial'),
    (uuid_generate_v4(), offer1_id, 2, '20% Off All Electronics', 'Sitewide 20% discount on all electronics', 'percentage', 20.00, 0.08, NULL, 50.00, 100.00, '2026-03-01 00:00:00+00', '2026-04-30 23:59:59+00', 'active', 149.99, 12.00, 'rate_increase'),
    (uuid_generate_v4(), offer2_id, 1, '$15 Off $75+ Order', '$15 discount on orders of $75 or more', 'fixed', 15.00, 0.06, NULL, 75.00, 15.00, '2026-03-15 00:00:00+00', '2026-05-01 23:59:59+00', 'active', 75.00, 4.50, 'initial'),
    (uuid_generate_v4(), offer2_id, 2, '$15 Off $75+ Order', '$15 discount on orders of $75 or more', 'fixed', 15.00, 0.07, NULL, 75.00, 15.00, '2026-03-15 00:00:00+00', '2026-05-15 23:59:59+00', 'active', 75.00, 5.25, 'commission_update');
END $$;

-- ============================================
-- SECTION 14: AFFILIATE INTELLIGENCE - AFFILIATE LINKS
-- ============================================
\echo 'Seeding affiliate_links...'

DO $$
DECLARE
    merch1_id UUID;
    merch2_id UUID;
    merch3_id UUID;
BEGIN
    SELECT id INTO merch1_id FROM merchants WHERE slug = 'techgadgets-pro' LIMIT 1;
    SELECT id INTO merch2_id FROM merchants WHERE slug = 'stylevault-fashion' LIMIT 1;
    SELECT id INTO merch3_id FROM merchants WHERE slug = 'homeessential-plus' LIMIT 1;
    
    INSERT INTO affiliate_links (id, original_url, normalized_url, merchant_id, product_id, offer_id, user_id, status, tracking_parameters, stripped_parameters, url_hash, click_count, last_clicked_at, first_seen_at, freshness_score, provenance, metadata) VALUES
    (uuid_generate_v4(), 'https://techgadgets.example.com/earbuds-pro?ref=aff123&campaign=spring', 'https://techgadgets.example.com/earbuds-pro', merch1_id, NULL, NULL, 'user_abc123', 'active', '{"ref": "aff123", "campaign": "spring"}', '{}', substr(md5('techgadgets.example.com/earbuds-pro'), 1, 16), 1250, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '45 days', 0.92, '{"source": "affiliate_network", "network": "AffiliateNetworkA"}', '{}'),
    (uuid_generate_v4(), 'https://techgadgets.example.com/smartwatch-x3?cid=partner456&wid=789', 'https://techgadgets.example.com/smartwatch-x3', merch1_id, NULL, NULL, 'user_def456', 'active', '{"cid": "partner456", "wid": "789"}', '{}', substr(md5('techgadgets.example.com/smartwatch-x3'), 1, 16), 890, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '60 days', 0.88, '{"source": "affiliate_network", "network": "AffiliateNetworkA"}', '{}'),
    (uuid_generate_v4(), 'https://stylevault.example.com/cotton-tshirt?af_id=user789&offer=STYLE15', 'https://stylevault.example.com/cotton-tshirt', merch2_id, NULL, NULL, 'user_ghi789', 'active', '{"af_id": "user789", "offer": "STYLE15"}', '{}', substr(md5('stylevault.example.com/cotton-tshirt'), 1, 16), 2100, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 days', 0.95, '{"source": "influencer", "platform": "instagram"}', '{}'),
    (uuid_generate_v4(), 'https://homeessential.example.com/ergo-chair?partner=officepro', 'https://homeessential.example.com/ergo-chair', merch3_id, NULL, NULL, 'user_jkl012', 'active', '{"partner": "officepro"}', '{}', substr(md5('homeessential.example.com/ergo-chair'), 1, 16), 450, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '20 days', 0.85, '{"source": "affiliate_network", "network": "AffiliateNetworkA"}', '{}'),
    (uuid_generate_v4(), 'https://techgadgets.example.com/powerbank-20k?utm_source=newsletter&utm_campaign=spring-sale', 'https://techgadgets.example.com/powerbank-20k', merch1_id, NULL, NULL, NULL, 'active', '{"utm_source": "newsletter", "utm_campaign": "spring-sale"}', '{}', substr(md5('techgadgets.example.com/powerbank-20k'), 1, 16), 320, NOW() - INTERVAL '3 days', NOW() - INTERVAL '15 days', 0.78, '{"source": "email", "campaign": "spring-sale"}', '{}'),
    (uuid_generate_v4(), 'https://stylevault.example.com/slim-jeans?ref=stylecreator', 'https://stylevault.example.com/slim-jeans', merch2_id, NULL, NULL, 'user_mno345', 'active', '{"ref": "stylecreator"}', '{}', substr(md5('stylevault.example.com/slim-jeans'), 1, 16), 780, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '25 days', 0.90, '{"source": "influencer", "platform": "youtube"}', '{}');
END $$;

-- ============================================
-- SECTION 15: AFFILIATE INTELLIGENCE - URL ANALYSIS RESULTS
-- ============================================
\echo 'Seeding url_analysis_results...'

DO $$
DECLARE
    merch1_id UUID;
    merch2_id UUID;
BEGIN
    SELECT id INTO merch1_id FROM merchants WHERE slug = 'techgadgets-pro' LIMIT 1;
    SELECT id INTO merch2_id FROM merchants WHERE slug = 'stylevault-fashion' LIMIT 1;
    
    INSERT INTO url_analysis_results (id, url, url_hash, parse_success, merchant_detected, merchant_id, product_detected, product_id, offer_detected, offer_id, detected_parameters, cleaned_url, extraction_confidence, parsing_errors, analysis_duration_ms, is_affiliate_url, confidence_score, recommendations) VALUES
    (uuid_generate_v4(), 'https://techgadgets.example.com/earbuds-pro?ref=aff123&campaign=spring', substr(md5('techgadgets.example.com/earbuds-pro?ref=aff123'), 1, 16), true, 'TechGadgets Pro', merch1_id, 'Wireless Bluetooth Earbuds Pro', NULL, NULL, NULL, '{"ref": "aff123", "campaign": "spring"}', 'https://techgadgets.example.com/earbuds-pro', 0.95, '[]', 45, true, 0.92, '{"suggested_tags": ["electronics", "audio", "wireless"], "suggested_category": "Electronics"}'),
    (uuid_generate_v4(), 'https://techgadgets.example.com/product/wireless-earbuds-pro', substr(md5('techgadgets.example.com/product/wireless-earbuds-pro'), 1, 16), true, 'TechGadgets Pro', merch1_id, 'Wireless Bluetooth Earbuds Pro', NULL, NULL, NULL, '{}', 'https://techgadgets.example.com/earbuds-pro', 0.88, '[]', 62, false, 0.75, '{"possible_offers": ["TECHGADGET20"], "suggested_merchant": "techgadgets-pro"}'),
    (uuid_generate_v4(), 'https://stylevault.example.com/cotton-tshirt?af_id=user789&offer=STYLE15', substr(md5('stylegadgets.example.com/cotton-tshirt?af_id=user789'), 1, 16), true, 'StyleVault Fashion', merch2_id, 'Premium Cotton T-Shirt', NULL, 'STYLE15', NULL, '{"af_id": "user789", "offer": "STYLE15"}', 'https://stylevault.example.com/cotton-tshirt', 0.97, '[]', 38, true, 0.95, '{"offer_valid": true, "commission_rate": 0.07}'),
    (uuid_generate_v4(), 'https://invalid-store.example.com/product', substr(md5('invalid-store.example.com/product'), 1, 16), false, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 0.12, '["Unknown merchant domain", "Could not parse product"]', 15, false, 0.10, '{"action": "manual_review"}'));
END $$;

-- ============================================
-- SECTION 16: COMPLIANCE - CONSENT RECORDS
-- ============================================
\echo 'Seeding consent_records...'

INSERT INTO compliance.consent_records (id, contact_id, purpose, basis, channels, regulations, status, granted_at, expires_at, revoked_at, proof_type, proof_data, ip_address, user_agent, metadata) VALUES
(uuid_generate_v4(), 'contact_001', 'email_marketing', 'consent', '["email"]', '["GDPR", "CAN_SPAM"]', 'granted', NOW() - INTERVAL '90 days', NOW() + INTERVAL '365 days', NULL, 'web_form', '{"form_id": "newsletter_signup", "checkbox": true}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"source": "landing_page", "page_url": "/signup"}'),
(uuid_generate_v4(), 'contact_002', 'sms_marketing', 'consent', '["sms"]', '["TCPA"]', 'granted', NOW() - INTERVAL '60 days', NOW() + INTERVAL '180 days', NULL, 'web_form', '{"form_id": "sms_opt_in", "checkbox": true}', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)', '{"source": "mobile_app", "app_version": "2.1.0"}'),
(uuid_generate_v4(), 'contact_003', 'personalized_ads', 'legitimate_interest', '["display", "social"]', '["GDPR"]', 'granted', NOW() - INTERVAL '120 days', NOW() + INTERVAL '30 days', NULL, 'web_form', '{"form_id": "cookie_consent", "preferences": ["marketing"]}', '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '{"source": "cookie_banner"}'),
(uuid_generate_v4(), 'contact_001', 'third_party_sharing', 'consent', '["email", "display"]', '["GDPR"]', 'granted', NOW() - INTERVAL '45 days', NOW() + INTERVAL '90 days', NULL, 'web_form', '{"form_id": "partner_opt_in"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{}'),
(uuid_generate_v4(), 'contact_004', 'email_marketing', 'consent', '["email"]', '["CAN_SPAM"]', 'granted', NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', NULL, 'verbal', '{"recorded_by": "sales_agent", "lead_id": "lead_12345"}', '192.168.1.103', NULL, '{"source": "phone_call", "agent_id": "agent_789"}'),
(uuid_generate_v4(), 'contact_005', 'sms_marketing', 'consent', '["sms"]', '["TCPA"]', 'revoked', NOW() - INTERVAL '150 days', NULL, NOW() - INTERVAL '10 days', 'web_form', '{"form_id": "sms_opt_in"}', '192.168.1.104', 'Mozilla/5.0 (Android 11)', '{"source": "mobile_app", "revoked_via": "unsubscribe_link"}'),
(uuid_generate_v4(), 'contact_006', 'email_marketing', 'consent', '["email"]', '["GDPR", "CASL"]', 'granted', NOW() - INTERVAL '200 days', NOW() + INTERVAL '165 days', NULL, 'web_form', '{"form_id": "newsletter", "checkbox": true}', '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"source": "landing_page", "page_url": "/spring-sale"}'),
(uuid_generate_v4(), 'contact_007', 'personalized_ads', 'consent', '["display", "social", "email"]', '["GDPR"]', 'expired', NOW() - INTERVAL '400 days', NOW() - INTERVAL '35 days', NULL, 'web_form', '{"form_id": "consent_banner"}', '192.168.1.106', 'Mozilla/5.0 (iPad; CPU OS 14_0)', '{"source": "cookie_banner"}');

-- ============================================
-- SECTION 17: COMPLIANCE - SUPPRESSION LIST
-- ============================================
\echo 'Seeding suppression_list...'

INSERT INTO compliance.suppression_list (id, contact_id, email, phone, type, channel, reason, source, added_by, expires_at, metadata) VALUES
(uuid_generate_v4(), NULL, 'unsubscribe@example.com', NULL, 'unsubscribe', 'email', 'User unsubscribed via email link', 'email_platform', NULL, NULL, '{"unsubscribe_timestamp": "2026-03-15T10:30:00Z"}'),
(uuid_generate_v4(), NULL, NULL, '+1-555-0123', NULL, 'sms', 'User replied STOP', 'sms_gateway', NULL, NULL, '{"stop_timestamp": "2026-03-20T14:22:00Z"}'),
(uuid_generate_v4(), 'contact_005', NULL, NULL, 'unsubscribe', 'sms', 'Explicit unsubscribe request', 'support_ticket', 'agent_123', NULL, '{"ticket_id": "TICK-45678"}'),
(uuid_generate_v4(), NULL, 'bounce@example.com', NULL, 'hard_bounce', 'email', 'Mailbox does not exist', 'email_platform', NULL, NULL, '{"bounce_timestamp": "2026-04-01T08:15:00Z", "bounce_reason": "mailbox_not_found"}'),
(uuid_generate_v4(), NULL, 'complaint@example.com', NULL, 'complaint', 'email', 'User marked as spam', 'email_platform', NULL, NULL, '{"complaint_timestamp": "2026-04-05T16:45:00Z", "fbl_source": "gmail"}'),
(uuid_generate_v4(), NULL, 'blocked@spamdomain.com', NULL, 'block', 'email', 'Domain blocked due to spam reports', 'internal', 'compliance_team', NULL, '{"block_reason": "multiple_spam_reports", "blocked_since": "2026-02-10"}'),
(uuid_generate_v4(), 'contact_010', NULL, NULL, 'unsubscribe', 'email', 'GDPR data deletion request', 'gdpr_portal', NULL, NOW() + INTERVAL '2555 days', '{"deletion_request_id": "GDPR-78901", "requested_by": "contact_010"}'),
(uuid_generate_v4(), NULL, 'policy@example.com', NULL, 'block', 'email', 'CAN-SPAM violation recipient request', 'compliance_review', 'compliance_team', NULL, '{"case_id": "CASE-2026-042"}');

-- ============================================
-- SECTION 18: COMPLIANCE - COMPLIANCE REVIEWS
-- ============================================
\echo 'Seeding compliance_reviews...'

INSERT INTO compliance.compliance_reviews (id, content_id, content_type, content, status, priority, risk_score, flags, assigned_to, reviewed_by, reviewed_at, decision, appeal_reason, appeal_reviewed_by, appeal_reviewed_at, metadata) VALUES
(uuid_generate_v4(), 'page_001', 'landing_page', '{"title": "Spring Sale 2026", "blocks": [...]}', 'approved', 'medium', 25, '[]', 'compliance_analyst_1', 'reviewer_1', NOW() - INTERVAL '5 days', 'Content approved for publication with disclosures', NULL, NULL, NULL, '{"review_duration_hours": 4}'),
(uuid_generate_v4(), 'page_002', 'landing_page', '{"title": "Get Rich Quick Scheme", "blocks": [...]}', 'rejected', 'high', 85, '["misleading_claims", "false_urgency", "unsubstantiated_earnings"]', 'compliance_analyst_2', 'reviewer_2', NOW() - INTERVAL '3 days', 'Content violates advertising standards - misleading claims about earnings', NULL, NULL, NULL, '{"review_duration_hours": 2, "violations": ["FTC_guidelines_section_5"]}'),
(uuid_generate_v4(), 'email_001', 'email_campaign', '{"subject": "Exclusive Offer!", "body": "..."}', 'pending', 'low', 15, '[]', NULL, NULL, NULL, NULL, NULL, NULL, '{}'),
(uuid_generate_v4(), 'post_001', 'social_post', '{"platform": "facebook", "text": "..."}', 'approved', 'medium', 30, '["affiliate_disclosure"]', 'compliance_analyst_1', 'reviewer_1', NOW() - INTERVAL '2 days', 'Approved with required FTC disclosure', NULL, NULL, NULL, '{"review_duration_hours": 1}'),
(uuid_generate_v4(), 'page_003', 'landing_page', '{"title": "Limited Time Offer", "blocks": [...]}', 'pending', 'high', 55, '["countdown_timer", "scarcity_claims"]', 'compliance_analyst_3', NULL, NULL, NULL, NULL, NULL, NULL, '{"requires_review_reason": "countdown_timer_and_scarcity"}'),
(uuid_generate_v4(), 'email_002', 'email_campaign', '{"subject": "You have won!", "body": "..."}', 'rejected', 'critical', 92, '["lottery_scam", "fake_prize", "phishing_attempt"]', 'compliance_analyst_2', 'reviewer_2', NOW() - INTERVAL '1 day', 'Confirmed phishing/scam content - immediately blocked', NULL, NULL, NULL, '{"review_duration_hours": 0.5, "escalated_to": "security_team"}'),
(uuid_generate_v4(), 'page_004', 'landing_page', '{"title": "Health Product Review", "blocks": [...]}', 'approved', 'medium', 35, '["health_claim"]', 'compliance_analyst_1', 'reviewer_3', NOW() - INTERVAL '4 days', 'Approved with required disclaimer - health benefit claims substantiated', NULL, NULL, NULL, '{"review_duration_hours": 6}');

-- ============================================
-- SECTION 19: COMPLIANCE - ABUSE SIGNALS
-- ============================================
\echo 'Seeding abuse_signals...'

INSERT INTO compliance.abuse_signals (id, contact_id, email, phone, type, severity, confidence, details, metadata, resolved_at) VALUES
(uuid_generate_v4(), 'contact_100', ' abuser@example.com', NULL, 'suspicious_signup', 75, 88, '{"account_age_hours": 2, "signup_velocity": 5, "proxy_used": true, "fake_domain": true}', '{"source": "fraud_detection", "detected_at": "2026-04-06T22:15:00Z"}', NULL),
(uuid_generate_v4(), NULL, NULL, '+1-555-9999', 'phone_fraud', 90, 95, '{"phone_type": "voip", "associated_campaigns": 12, "complaint_count": 8}', '{"source": "tcpa_compliance", "detected_at": "2026-04-05T18:30:00Z"}', NULL),
(uuid_generate_v4(), 'contact_101', 'spamtrap@example.com', NULL, 'spam_trap', 100, 99, '{"trap_type": "honey_pot", "click_history": [], "engagement_score": 0}', '{"source": "email_platform", "detected_at": "2026-04-01T12:00:00Z"}', NOW() - INTERVAL '2 days'),
(uuid_generate_v4(), NULL, 'rapidfire@example.com', NULL, 'email_bombing', 85, 82, '{"emails_last_hour": 150, "unsubscribe_clicks": 0, "pattern": "burst"}', '{"source": "email_platform", "detected_at": "2026-04-07T09:45:00Z"}', NULL),
(uuid_generate_v4(), 'contact_102', NULL, '+1-555-8888', 'invalid_phone', 40, 95, '{"phone_valid": false, "carrier": "unknown", "line_type": "voip"}', '{"source": "phone_verification", "detected_at": "2026-04-06T14:20:00Z"}', NOW() - INTERVAL '1 day'),
(uuid_generate_v4(), 'contact_103', 'fakeuser@example.com', NULL, 'fake_identity', 80, 70, '{"email_domain_score": 15, "name_match_score": 25, "social_signals": 0}', '{"source": "identity_verification", "detected_at": "2026-04-07T11:00:00Z"}', NULL),
(uuid_generate_v4(), NULL, ' harvested@example.com', NULL, 'data_breach', 95, 98, '{"breach_source": "third_party_leak", "password_hash_leaked": true, "emails_affected": 15000}', '{"source": "threat_intelligence", "detected_at": "2026-04-08T06:00:00Z"}', NULL);

-- ============================================
-- SECTION 20: COMPLIANCE - APPROVAL WORKFLOWS
-- ============================================
\echo 'Seeding approval_workflows...'

INSERT INTO compliance.approval_workflows (id, name, trigger_type, conditions, actions, escalation_path, is_active, metadata) VALUES
(uuid_generate_v4(), 'Standard Content Review', 'content_submission', '{"content_type": ["landing_page", "email_campaign"], "risk_score_below": 50}', '{"action": "route_to", "destination": "compliance_queue"}, {"action": "notify", "template": "submission_received"}', '[]', true, '{"priority": "normal", "sla_hours": 48}'),
(uuid_generate_v4(), 'High Risk Content Review', 'content_submission', '{"risk_score_above": 70}', '{"action": "route_to", "destination": "senior_reviewer"}, {"action": "notify", "template": "high_risk_alert"}, {"action": "hold", "reason": "requires_senior_approval"}', '["compliance_manager", "legal_team"]', true, '{"priority": "high", "sla_hours": 24}'),
(uuid_generate_v4(), 'FTC Affiliate Disclosure Check', 'social_post', '{"platform": ["facebook", "instagram", "twitter"], "contains_affiliate_link": true}', '{"action": "require_field", "field": "ftc_disclosure"}, {"action": "warn", "message": "FTC disclosure required for affiliate content"}', '[]', true, '{"regulation": "FTC", "compliance_type": "disclosure"}'),
(uuid_generate_v4(), 'GDPR Consent Verification', 'contact_update', '{"regulation": "GDPR", "channel_contains": "email"}', '{"action": "verify_consent", "check_record": true}, {"action": "block_if_no_consent", "reason": "GDPR_requirement"}', '["privacy_officer"]', true, '{"regulation": "GDPR", "data_protection": true}'),
(uuid_generate_v4(), 'Auto-Approve Low Risk', 'content_submission', '{"risk_score_below": 20, "content_type": ["social_post"], "flags_contains": []}', '{"action": "auto_approve"}, {"action": "log", "message": "Auto-approved low risk content"}', '[]', true, '{"priority": "low", "auto_approve": true}'),
(uuid_generate_v4(), 'TCPA SMS Compliance', 'sms_send', '{"channel": "sms", "phone_validation": true}', '{"action": "verify_phone", "check_dnc": true}, {"action": "verify_tcpa_consent", "check_record": true}, {"action": "block_if_no_consent", "reason": "TCPA_requirement"}', '["legal_team"]', true, '{"regulation": "TCPA", "compliance_type": "consent_verification"}');

-- ============================================
-- SECTION 21: SOCIAL DISTRIBUTION - SOCIAL ACCOUNTS
-- ============================================
\echo 'Seeding social_accounts...'

INSERT INTO social_accounts (id, tenant_id, provider, account_ref, display_name, scopes, access_token_encrypted, refresh_token_encrypted, expires_at, metadata, created_by, created_at) VALUES
(uuid_generate_v4(), 1, 'x', '@MeridianDynamics', 'Meridian Dynamics', ARRAY['tweet', 'follow', 'direct_message'], 'encrypted_access_token_abc123', 'encrypted_refresh_token_xyz789', NOW() + INTERVAL '30 days', '{}', 1, NOW() - INTERVAL '180 days'),
(uuid_generate_v4(), 1, 'linkedin', 'company/meridian-dynamics', 'Meridian Dynamics Inc', ARRAY['organization', 'share', 'comment'], 'encrypted_access_token_def456', 'encrypted_refresh_token_uvw123', NOW() + INTERVAL '45 days', '{}', 1, NOW() - INTERVAL '175 days'),
(uuid_generate_v4(), 1, 'facebook', 'page/123456789', 'Meridian Dynamics', ARRAY['pages_manage', 'pages_read_engagement', 'content_management'], 'encrypted_access_token_ghi789', NULL, NOW() + INTERVAL '60 days', '{}', 2, NOW() - INTERVAL '170 days'),
(uuid_generate_v4(), 2, 'x', '@NovaTechInd', 'NovaTech Industries', ARRAY['tweet', 'follow'], 'encrypted_access_token_jkl012', 'encrypted_refresh_token_rst345', NOW() + INTERVAL '25 days', '{}', 6, NOW() - INTERVAL '120 days'),
(uuid_generate_v4(), 2, 'linkedin', 'company/novatech-industries', 'NovaTech Industries', ARRAY['organization', 'share'], 'encrypted_access_token_mno456', 'encrypted_refresh_token_opq678', NOW() + INTERVAL '40 days', '{}', 6, NOW() - INTERVAL '115 days'),
(uuid_generate_v4(), 3, 'x', '@ApexGlobal', 'Apex Global Holdings', ARRAY['tweet', 'follow', 'direct_message'], 'encrypted_access_token_stu789', 'encrypted_refresh_token_vwx901', NOW() + INTERVAL '35 days', '{}', 10, NOW() - INTERVAL '90 days'),
(uuid_generate_v4(), 3, 'linkedin', 'company/apex-global-holdings', 'Apex Global Holdings', ARRAY['organization', 'share', 'comment', 'message'], 'encrypted_access_token_yza234', 'encrypted_refresh_token_bcd567', NOW() + INTERVAL '50 days', '{}', 10, NOW() - INTERVAL '85 days'),
(uuid_generate_v4(), 3, 'tiktok', 'user/apexglobalofficial', 'Apex Global Official', ARRAY['video.upload', 'video.manage', 'user.info'], 'encrypted_access_token_efg890', NULL, NOW() + INTERVAL '20 days', '{}', 11, NOW() - INTERVAL '60 days');

-- ============================================
-- SECTION 22: SOCIAL DISTRIBUTION - SOCIAL OAUTH STATES
-- ============================================
\echo 'Seeding social_oauth_states...'

INSERT INTO social_oauth_states (id, tenant_id, user_id, provider, state_hash, code_verifier_hash, redirect_uri, expires_at, consumed_at, created_at) VALUES
(uuid_generate_v4(), 1, 1, 'x', substr(md5('state_abc123'), 1, 16), substr(md5('verifier_xyz789'), 1, 16), 'https://app.example.com/social/callback', NOW() + INTERVAL '10 minutes', NULL, NOW() - INTERVAL '5 minutes'),
(uuid_generate_v4(), 1, 1, 'linkedin', substr(md5('state_def456'), 1, 16), substr(md5('verifier_uvw123'), 1, 16), 'https://app.example.com/social/callback', NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(uuid_generate_v4(), 2, 6, 'x', substr(md5('state_ghi789'), 1, 16), substr(md5('verifier_rst345'), 1, 16), 'https://app.example.com/social/callback', NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
(uuid_generate_v4(), 3, 10, 'linkedin', substr(md5('state_jkl012'), 1, 16), substr(md5('verifier_opq678'), 1, 16), 'https://app.example.com/social/callback', NOW() + INTERVAL '10 minutes', NULL, NOW() - INTERVAL '30 minutes'),
(uuid_generate_v4(), 3, 11, 'tiktok', substr(md5('state_mno456'), 1, 16), NULL, 'https://app.example.com/social/callback', NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes');

-- ============================================
-- SECTION 23: SOCIAL DISTRIBUTION - SOCIAL POSTS (20+)
-- ============================================
\echo 'Seeding social_posts...'

DO $$
DECLARE
    acct1_id UUID;
    acct2_id UUID;
    acct3_id UUID;
    acct4_id UUID;
    acct5_id UUID;
    acct6_id UUID;
    acct7_id UUID;
    acct8_id UUID;
    page1_id UUID;
    page2_id UUID;
    page3_id UUID;
    page4_id UUID;
    page5_id UUID;
    page6_id UUID;
BEGIN
    SELECT id INTO acct1_id FROM social_accounts WHERE provider = 'x' AND tenant_id = 1 LIMIT 1;
    SELECT id INTO acct2_id FROM social_accounts WHERE provider = 'linkedin' AND tenant_id = 1 LIMIT 1;
    SELECT id INTO acct3_id FROM social_accounts WHERE provider = 'x' AND tenant_id = 2 LIMIT 1;
    SELECT id INTO acct4_id FROM social_accounts WHERE provider = 'linkedin' AND tenant_id = 2 LIMIT 1;
    SELECT id INTO acct5_id FROM social_accounts WHERE provider = 'x' AND tenant_id = 3 LIMIT 1;
    SELECT id INTO acct6_id FROM social_accounts WHERE provider = 'linkedin' AND tenant_id = 3 LIMIT 1;
    SELECT id INTO acct7_id FROM social_accounts WHERE provider = 'tiktok' AND tenant_id = 3 LIMIT 1;
    SELECT id INTO acct8_id FROM social_accounts WHERE provider = 'facebook' AND tenant_id = 1 LIMIT 1;
    
    SELECT id INTO page1_id FROM landing_pages WHERE slug = 'meridian-spring-sale' LIMIT 1;
    SELECT id INTO page2_id FROM landing_pages WHERE slug = 'meridian-launch' LIMIT 1;
    SELECT id INTO page3_id FROM landing_pages WHERE slug = 'novatech-spring' LIMIT 1;
    SELECT id INTO page4_id FROM landing_pages WHERE slug = 'novatech-enterprise' LIMIT 1;
    SELECT id INTO page5_id FROM landing_pages WHERE slug = 'apex-global-launch' LIMIT 1;
    SELECT id INTO page6_id FROM landing_pages WHERE slug = 'apex-q2' LIMIT 1;
    
    INSERT INTO social_posts (id, tenant_id, page_id, social_account_id, provider, status, text, link_url, utm_params, scheduled_for, published_at, provider_post_id, provider_post_url, error_message, attempts, max_attempts, metadata, created_by, created_at, cancelled_at) VALUES
    (uuid_generate_v4(), 1, page1_id, acct1_id, 'x', 'published', 'Spring Sale is HERE! Get up to 30% off our entire electronics collection. Limited time only. Shop now! #SpringSale #TechGadgets', 'https://meridian.example.com/spring-sale', '{"source": "social", "medium": "x", "campaign": "spring_2026"}', NULL, NOW() - INTERVAL '5 days', 'tw_1234567890', 'https://x.com/MeridianDynamics/status/1234567890', NULL, 1, 5, '{}', 1, NOW() - INTERVAL '6 days', NULL),
    (uuid_generate_v4(), 1, page1_id, acct2_id, 'linkedin', 'published', 'Excited to announce our Spring Sale! Up to 30% off premium electronics. Discover innovation at unbeatable prices. Link in bio. #SpringSale #TechInnovation', 'https://meridian.example.com/spring-sale', '{"source": "social", "medium": "linkedin", "campaign": "spring_2026"}', NULL, NOW() - INTERVAL '4 days', 'li_post_abc123', 'https://linkedin.com/company/meridian-dynamics/posts/abc123', NULL, 1, 5, '{}', 1, NOW() - INTERVAL '5 days', NULL),
    (uuid_generate_v4(), 1, page2_id, acct1_id, 'x', 'published', 'INTRODUCING our latest innovation! We have been working behind the scenes to bring you something extraordinary. Stay tuned for the full reveal tomorrow! #Innovation #TechNews', 'https://meridian.example.com/launch', '{"source": "social", "medium": "x", "campaign": "product_launch"}', NULL, NOW() - INTERVAL '10 days', 'tw_2345678901', 'https://x.com/MeridianDynamics/status/2345678901', NULL, 1, 5, '{}', 1, NOW() - INTERVAL '11 days', NULL),
    (uuid_generate_v4(), 1, page2_id, acct8_id, 'facebook', 'published', 'Big news coming! Our latest product is almost here. We can not wait to share what we have been building. Check back tomorrow for the full reveal!', 'https://meridian.example.com/launch', '{"source": "social", "medium": "facebook", "campaign": "product_launch"}', NULL, NOW() - INTERVAL '9 days', 'fb_post_xyz789', 'https://facebook.com/123456789/posts/xyz789', NULL, 1, 5, '{}', 2, NOW() - INTERVAL '10 days', NULL),
    (uuid_generate_v4(), 1, page3_id, acct3_id, 'x', 'scheduled', 'NovaTech Spring Savings are here! Do not miss out on our biggest sale of the season. Up to 25% off across all product categories. Offer ends April 30th! #NovaTech #SpringSavings', 'https://novatech.example.com/spring', '{"source": "social", "medium": "x", "campaign": "spring_savings"}', NOW() + INTERVAL '2 days', NULL, NULL, NULL, 0, 5, '{}', 6, NOW() - INTERVAL '1 day', NULL),
    (uuid_generate_v4(), 2, page3_id, acct4_id, 'linkedin', 'published', 'Spring is the perfect time to upgrade your technology. Check out our Spring Savings event - up to 25% off selected products. Learn more at the link below. #SpringSavings #Technology', 'https://novatech.example.com/spring', '{"source": "social", "medium": "linkedin", "campaign": "spring_savings"}', NULL, NOW() - INTERVAL '3 days', 'li_post_def456', 'https://linkedin.com/company/novatech-industries/posts/def456', NULL, 1, 5, '{}', 6, NOW() - INTERVAL '4 days', NULL),
    (uuid_generate_v4(), 2, page4_id, acct4_id, 'linkedin', 'published', 'Discover NovaTech Enterprise Solutions - powerful tools designed for modern businesses. Our enterprise platform scales with your needs. Request a demo today. #Enterprise #BusinessSolutions', 'https://novatech.example.com/enterprise', '{"source": "social", "medium": "linkedin", "campaign": "enterprise"}', NULL, NOW() - INTERVAL '15 days', 'li_post_ghi789', 'https://linkedin.com/company/novatech-industries/posts/ghi789', NULL, 1, 5, '{}', 7, NOW() - INTERVAL '16 days', NULL),
    (uuid_generate_v4(), 3, page5_id, acct5_id, 'x', 'published', 'GLOBAL LAUNCH: We are going worldwide! Apex Global 2026 is here. Premium quality, worldwide delivery, and exceptional service - all new for you. #ApexGlobal #WorldwideLaunch', 'https://apex.example.com/global-launch', '{"source": "social", "medium": "x", "campaign": "global_launch"}', NULL, NOW() - INTERVAL '7 days', 'tw_3456789012', 'https://x.com/ApexGlobal/status/3456789012', NULL, 1, 5, '{}', 10, NOW() - INTERVAL '8 days', NULL),
    (uuid_generate_v4(), 3, page5_id, acct6_id, 'linkedin', 'published', 'Today marks a new chapter as we go global. Apex Global Holdings launches worldwide operations with premium solutions for clients everywhere. Welcome to the future of business. #GlobalLaunch #ApexGlobal', 'https://apex.example.com/global-launch', '{"source": "social", "medium": "linkedin", "campaign": "global_launch"}', NULL, NOW() - INTERVAL '6 days', 'li_post_jkl012', 'https://linkedin.com/company/apex-global-holdings/posts/jkl012', NULL, 1, 5, '{}', 10, NOW() - INTERVAL '7 days', NULL),
    (uuid_generate_v4(), 3, page5_id, acct7_id, 'tiktok', 'published', 'We are going GLOBAL! Check out our new worldwide operations and see how we are bringing premium solutions to customers everywhere #apexglobal #launch #worldwide', 'https://apex.example.com/global-launch', '{"source": "social", "medium": "tiktok", "campaign": "global_launch"}', NULL, NOW() - INTERVAL '5 days', 'tt_video_abc123', 'https://tiktok.com/@apexglobalofficial/video/abc123', NULL, 1, 5, '{}', 11, NOW() - INTERVAL '6 days', NULL),
    (uuid_generate_v4(), 3, page6_id, acct5_id, 'x', 'scheduled', 'Q2 is here and we have big plans! Our latest campaign brings you exclusive deals, innovative products, and exceptional service. Stay tuned for what is coming next. #Q2 #NewBeginnings', 'https://apex.example.com/q2', '{"source": "social", "medium": "x", "campaign": "q2_campaign"}', NOW() + INTERVAL '1 day', NULL, NULL, NULL, 0, 5, '{}', 10, NOW() - INTERVAL '12 hours', NULL),
    (uuid_generate_v4(), 3, page6_id, acct6_id, 'linkedin', 'queued', 'Q2 Campaign launching soon! We have an exciting lineup of products and promotions planned for this quarter. Stay connected for exclusive announcements. #Q2Campaign #StayTuned', 'https://apex.example.com/q2', '{"source": "social", "medium": "linkedin", "campaign": "q2_campaign"}', NULL, NULL, NULL, NULL, 0, 5, '{}', 11, NOW() - INTERVAL '6 hours', NULL),
    (uuid_generate_v4(), 1, page1_id, acct1_id, 'x', 'failed', 'Spring Sale reminder - 7 days left! Grab your favorites before they are gone. Use code SPRING20 for extra savings. #SpringSale #LimitedTime', 'https://meridian.example.com/spring-sale', '{"source": "social", "medium": "x", "campaign": "spring_2026_reminder"}', NULL, NULL, NULL, 'API rate limit exceeded - please retry later', 5, 5, '{"retry_after": 3600}', 1, NOW() - INTERVAL '1 day', NULL),
    (uuid_generate_v4(), 2, page3_id, acct3_id, 'x', 'cancelled', 'Do not forget our Spring Savings ends in 3 days! Do not miss out on exclusive deals across all categories. Shop now! #NovaTech #SpringSale', 'https://novatech.example.com/spring', '{"source": "social", "medium": "x", "campaign": "spring_reminder"}', NOW() - INTERVAL '1 day', NULL, NULL, NULL, 0, 5, '{}', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours'),
    (uuid_generate_v4(), 1, page2_id, acct2_id, 'linkedin', 'published', 'Product launch was a huge success! Thank you to everyone who tuned in. If you missed it, you can still learn about our latest innovation at the link below. #ProductLaunch #Innovation', 'https://meridian.example.com/launch', '{"source": "social", "medium": "linkedin", "campaign": "product_launch_followup"}', NULL, NOW() - INTERVAL '8 days', 'li_post_mno345', 'https://linkedin.com/company/meridian-dynamics/posts/mno345', NULL, 1, 5, '{}', 2, NOW() - INTERVAL '9 days', NULL),
    (uuid_generate_v4(), 3, page5_id, acct7_id, 'tiktok', 'published', 'Behind the scenes at Apex Global headquarters as we prepare for our worldwide launch! The team is excited and ready #apexglobal #bts #launchpreparation', 'https://apex.example.com/global-launch', '{"source": "social", "medium": "tiktok", "campaign": "global_launch_bts"}', NULL, NOW() - INTERVAL '8 days', 'tt_video_def456', 'https://tiktok.com/@apexglobalofficial/video/def456', NULL, 1, 5, '{}', 11, NOW() - INTERVAL '9 days', NULL),
    (uuid_generate_v4(), 1, page1_id, acct8_id, 'facebook', 'scheduled', 'Last chance! Spring Sale ends this weekend. Save up to 30% on electronics, accessories, and more. Do not wait - these deals will not last! #SpringSale #LastChance', 'https://meridian.example.com/spring-sale', '{"source": "social", "medium": "facebook", "campaign": "spring_final_reminder"}', NOW() + INTERVAL '4 hours', NULL, NULL, NULL, 0, 5, '{}', 1, NOW() - INTERVAL '30 minutes', NULL),
    (uuid_generate_v4(), 2, page4_id, acct4_id, 'linkedin', 'published', 'See why businesses choose NovaTech for their enterprise needs. Our platform provides scalable, secure, and powerful solutions that grow with you. #Enterprise #BusinessTechnology', 'https://novatech.example.com/enterprise', '{"source": "social", "medium": "linkedin", "campaign": "enterprise_awareness"}', NULL, NOW() - INTERVAL '20 days', 'li_post_pqr678', 'https://linkedin.com/company/novatech-industries/posts/pqr678', NULL, 1, 5, '{}', 7, NOW() - INTERVAL '21 days', NULL),
    (uuid_generate_v4(), 3, page6_id, acct5_id, 'x', 'dead_letter', 'Q2 Campaign announcement - something big is coming next week! Get ready for exclusive reveals and special offers you will not want to miss. #Q2Reveal #ComingSoon', 'https://apex.example.com/q2', '{"source": "social", "medium": "x", "campaign": "q2_teaser"}', NULL, NULL, NULL, 'Permanent failure: Account suspended for policy violation', 3, 5, '{"error_code": "ACCOUNT_SUSPENDED", "appeal_status": "pending"}', 10, NOW() - INTERVAL '3 days', NULL),
    (uuid_generate_v4(), 3, page6_id, acct6_id, 'linkedin', 'queued', 'The wait is almost over! Next week we unveil our Q2 initiatives. Follow us to be the first to know about exclusive offers and innovative products. #Q2 #Innovation', 'https://apex.example.com/q2', '{"source": "social", "medium": "linkedin", "campaign": "q2_teaser"}', NULL, NULL, NULL, NULL, 0, 5, '{}', 11, NOW() - INTERVAL '1 day', NULL);
END $$;

-- ============================================
-- SECTION 24: SOCIAL DISTRIBUTION - SOCIAL POST ATTEMPTS
-- ============================================
\echo 'Seeding social_post_attempts...'

DO $$
DECLARE
    post1_id UUID;
    post13_id UUID;
BEGIN
    SELECT id INTO post1_id FROM social_posts WHERE status = 'published' AND provider = 'x' LIMIT 1;
    SELECT id INTO post13_id FROM social_posts WHERE status = 'failed' LIMIT 1;
    
    INSERT INTO social_post_attempts (id, social_post_id, attempt_number, status, response_payload, error_message, created_at) VALUES
    (uuid_generate_v4(), post1_id, 1, 'success', '{"post_id": "tw_1234567890", "created_at": "2026-04-03T10:30:00Z"}', NULL, NOW() - INTERVAL '5 days'),
    (uuid_generate_v4(), post13_id, 1, 'rate_limited', '{"error": "Rate limit exceeded", "retry_after": 3600}', 'API rate limit exceeded', NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), post13_id, 2, 'rate_limited', '{"error": "Rate limit exceeded", "retry_after": 3600}', 'API rate limit exceeded', NOW() - INTERVAL '23 hours'),
    (uuid_generate_v4(), post13_id, 3, 'rate_limited', '{"error": "Rate limit exceeded", "retry_after": 3600}', 'API rate limit exceeded', NOW() - INTERVAL '22 hours'),
    (uuid_generate_v4(), post13_id, 4, 'rate_limited', '{"error": "Rate limit exceeded", "retry_after": 3600}', 'API rate limit exceeded', NOW() - INTERVAL '21 hours'),
    (uuid_generate_v4(), post13_id, 5, 'failed', '{"error": "Rate limit exceeded", "retry_after": 3600}', 'Final attempt failed - API rate limit exceeded', NOW() - INTERVAL '20 hours');
END $$;

-- ============================================
-- SECTION 25: CAMPAIGNS - CAMPAIGN ORCHESTRATIONS (5+)
-- ============================================
\echo 'Seeding campaign_orchestrations...'

INSERT INTO campaign_orchestrations (id, tenant_id, business_id, page_id, name, description, objective, budget, status, starts_at, ends_at, metadata, created_by, created_at) VALUES
(uuid_generate_v4(), 1, NULL, (SELECT id FROM landing_pages WHERE slug = 'meridian-spring-sale' LIMIT 1), 'Spring Sale Campaign 2026', 'Multi-channel spring sale promotion across email, social, and display', 'conversion', 15000.00, 'running', '2026-03-01 00:00:00+00', '2026-04-30 23:59:59+00', '{"channels": ["email", "social", "display"], "target_audience": "all", "promo_codes": ["SPRING20", "SPRING30"]}', 1, '2026-02-15 10:00:00+00'),
(uuid_generate_v4(), 1, NULL, (SELECT id FROM landing_pages WHERE slug = 'meridian-launch' LIMIT 1), 'Product Launch Campaign', 'New product launch with teaser and reveal phases', 'awareness', 25000.00, 'completed', '2026-03-10 00:00:00+00', '2026-03-25 23:59:59+00', '{"channels": ["social", "pr", "email"], "launch_date": "2026-03-15"}', 1, '2026-03-05 14:00:00+00'),
(uuid_generate_v4(), 2, NULL, (SELECT id FROM landing_pages WHERE slug = 'novatech-spring' LIMIT 1), 'NovaTech Spring Savings', 'Drive conversions through spring seasonal promotion', 'conversion', 12000.00, 'running', '2026-03-15 00:00:00+00', '2026-04-30 23:59:59+00', '{"channels": ["social", "email"], "discount_tier": "up_to_25_percent"}', 6, '2026-03-10 09:00:00+00'),
(uuid_generate_v4(), 2, NULL, (SELECT id FROM landing_pages WHERE slug = 'novatech-enterprise' LIMIT 1), 'Enterprise Lead Generation Q2', 'Targeted B2B campaign for enterprise solutions', 'lead_generation', 35000.00, 'paused', '2026-04-01 00:00:00+00', '2026-06-30 23:59:59+00', '{"channels": ["linkedin", "email", "display"], "target_business_size": "enterprise", "decision_makers": true}', 6, '2026-03-20 11:00:00+00'),
(uuid_generate_v4(), 3, NULL, (SELECT id FROM landing_pages WHERE slug = 'apex-global-launch' LIMIT 1), 'Apex Global Launch', 'Global expansion announcement campaign', 'awareness', 75000.00, 'completed', '2026-03-20 00:00:00+00', '2026-04-10 23:59:59+00', '{"channels": ["global_press", "social", "pr"], "regions": ["na", "eu", "apac"]}', 10, '2026-03-15 08:00:00+00'),
(uuid_generate_v4(), 3, NULL, (SELECT id FROM landing_pages WHERE slug = 'apex-q2' LIMIT 1), 'Q2 Growth Initiative', 'Second quarter multi-product promotion campaign', 'conversion', 50000.00, 'scheduled', '2026-04-15 00:00:00+00', '2026-06-30 23:59:59+00', '{"channels": ["email", "social", "affiliate"], "products": ["enterprise", "pro", "starter"]}', 10, '2026-04-01 10:00:00+00'),
(uuid_generate_v4(), 1, NULL, (SELECT id FROM landing_pages WHERE slug = 'meridian-summer-preview' LIMIT 1), 'Summer Preview Campaign', 'Teaser campaign for upcoming summer collection', 'awareness', 8000.00, 'draft', '2026-05-01 00:00:00+00', '2026-05-31 23:59:59+00', '{"channels": ["social", "email"], "preview_type": "sneak_peek"}', 3, '2026-04-05 15:00:00+00');

-- ============================================
-- SECTION 26: CAMPAIGNS - CAMPAIGN STATE EVENTS
-- ============================================
\echo 'Seeding campaign_state_events...'

DO $$
DECLARE
    camp1_id UUID;
    camp2_id UUID;
    camp3_id UUID;
    camp4_id UUID;
    camp5_id UUID;
    camp6_id UUID;
BEGIN
    SELECT id INTO camp1_id FROM campaign_orchestrations WHERE name = 'Spring Sale Campaign 2026' LIMIT 1;
    SELECT id INTO camp2_id FROM campaign_orchestrations WHERE name = 'Product Launch Campaign' LIMIT 1;
    SELECT id INTO camp3_id FROM campaign_orchestrations WHERE name = 'NovaTech Spring Savings' LIMIT 1;
    SELECT id INTO camp4_id FROM campaign_orchestrations WHERE name = 'Enterprise Lead Generation Q2' LIMIT 1;
    SELECT id INTO camp5_id FROM campaign_orchestrations WHERE name = 'Apex Global Launch' LIMIT 1;
    SELECT id INTO camp6_id FROM campaign_orchestrations WHERE name = 'Q2 Growth Initiative' LIMIT 1;
    
    -- Spring Sale Campaign state changes
    INSERT INTO campaign_state_events (id, campaign_id, tenant_id, from_status, to_status, reason, metadata, changed_by, created_at) VALUES
    (uuid_generate_v4(), camp1_id, 1, 'draft', 'ready', 'Campaign content and assets approved', '{"approved_by": 1}', 1, '2026-02-20 10:00:00+00'),
    (uuid_generate_v4(), camp1_id, 1, 'ready', 'scheduled', 'Scheduled to start on March 1st', '{"scheduled_by": 1}', 1, '2026-02-28 16:00:00+00'),
    (uuid_generate_v4(), camp1_id, 1, 'scheduled', 'running', 'Campaign activated - spring sale started', '{"activation_note": "All channels ready"}', 1, '2026-03-01 00:00:00+00'),
    
    -- Product Launch Campaign state changes
    (uuid_generate_v4(), camp2_id, 1, 'draft', 'ready', 'All launch materials prepared', '{}', 1, '2026-03-08 09:00:00+00'),
    (uuid_generate_v4(), camp2_id, 1, 'ready', 'scheduled', 'Scheduled for March 10th launch', '{}', 1, '2026-03-09 18:00:00+00'),
    (uuid_generate_v4(), camp2_id, 1, 'scheduled', 'running', 'Campaign started - teaser phase begins', '{"phase": "teaser"}', 1, '2026-03-10 00:00:00+00'),
    (uuid_generate_v4(), camp2_id, 1, 'running', 'running', 'Launch event executed successfully', '{"phase": "reveal", "engagement": 45000}', 1, '2026-03-15 12:00:00+00'),
    (uuid_generate_v4(), camp2_id, 1, 'running', 'completed', 'Campaign objectives achieved - 120% of target reached', '{"final_metrics": {"conversions": 1250, "revenue": 85000}}', 1, '2026-03-25 23:59:59+00'),
    
    -- NovaTech Spring Savings state changes
    (uuid_generate_v4(), camp3_id, 2, 'draft', 'ready', 'Spring campaign assets ready', '{}', 6, '2026-03-12 11:00:00+00'),
    (uuid_generate_v4(), camp3_id, 2, 'ready', 'running', 'Spring savings campaign live', '{}', 6, '2026-03-15 00:00:00+00'),
    (uuid_generate_v4(), camp3_id, 2, 'running', 'paused', 'Mid-campaign adjustment - optimizing ad spend', '{"paused_for": "budget_reallocation"}', 6, NOW() - INTERVAL '5 days'),
    (uuid_generate_v4(), camp3_id, 2, 'paused', 'running', 'Campaign resumed with optimized targeting', '{"changes": "audience_refinement"}', 6, NOW() - INTERVAL '2 days'),
    
    -- Enterprise Lead Generation state changes
    (uuid_generate_v4(), camp4_id, 2, 'draft', 'ready', 'Enterprise campaign materials approved', '{}', 6, '2026-03-25 10:00:00+00'),
    (uuid_generate_v4(), camp4_id, 2, 'ready', 'scheduled', 'Campaign scheduled for Q2', '{"quarter": "Q2", "start_date": "2026-04-01"}', 6, '2026-03-30 14:00:00+00'),
    (uuid_generate_v4(), camp4_id, 2, 'scheduled', 'paused', 'Campaign paused pending additional budget approval', '{"reason": "budget_review"}', 6, NOW() - INTERVAL '3 days'),
    
    -- Apex Global Launch state changes
    (uuid_generate_v4(), camp5_id, 3, 'draft', 'ready', 'Global launch all systems ready', '{}', 10, '2026-03-18 08:00:00+00'),
    (uuid_generate_v4(), camp5_id, 3, 'ready', 'running', 'Global launch campaign activated', '{"regions_launched": ["na", "eu"]}', 10, '2026-03-20 00:00:00+00'),
    (uuid_generate_v4(), camp5_id, 3, 'running', 'running', 'APAC region launched', '{"regions_launched": ["apac"]}', 11, '2026-03-22 00:00:00+00'),
    (uuid_generate_v4(), camp5_id, 3, 'running', 'completed', 'Global launch campaign exceeded targets by 40%', '{"final_metrics": {"impressions": 2500000, "conversions": 850, "revenue": 320000}}', 10, '2026-04-10 23:59:59+00'),
    
    -- Q2 Growth Initiative state changes
    (uuid_generate_v4(), camp6_id, 3, 'draft', 'ready', 'Q2 campaign plan approved', '{}', 10, '2026-04-08 09:00:00+00'),
    (uuid_generate_v4(), camp6_id, 3, 'ready', 'scheduled', 'Scheduled for April 15th start', '{"scheduled_by": 10}', 10, '2026-04-10 16:00:00+00');
END $$;

-- ============================================
-- RE-ENABLE ROW LEVEL SECURITY
-- ============================================
SET session_replication_role = DEFAULT;

COMMIT;

\echo ''
\echo '==============================================='
\echo 'Seed data loaded successfully!'
\echo '==============================================='
\echo ''
\echo 'Summary:'
\echo '  - 8 landing_pages (prerequisite for social)'
\echo '  - 120 canonical_events (analytics)'
\echo '  - 6 experiments (A/B tests)'
\echo '  - 15 experiment_results'
\echo '  - 75 attribution_touchpoints'
\echo '  - 45 conversions'
\echo '  - 60 real_time_metrics'
\echo '  - 7 anomaly_alerts'
\echo '  - 10 cohort_analysis records'
\echo '  - 5 funnel_analysis records'
\echo '  - 9 merchants (affiliate intelligence)'
\echo '  - 21 products'
\echo '  - 10 offers'
\echo '  - 4 offer_snapshots'
\echo '  - 6 affiliate_links'
\echo '  - 4 url_analysis_results'
\echo '  - 8 consent_records (compliance)'
\echo '  - 8 suppression_list entries'
\echo '  - 7 compliance_reviews'
\echo '  - 7 abuse_signals'
\echo '  - 6 approval_workflows'
\echo '  - 8 social_accounts'
\echo '  - 5 social_oauth_states'
\echo '  - 20 social_posts'
\echo '  - 6 social_post_attempts'
\echo '  - 7 campaign_orchestrations'
\echo '  - 18 campaign_state_events'
\echo ''

-- ============================================
-- ROLLBACK SECTION
-- ============================================
-- To rollback this seed data, run:
-- BEGIN;
-- DELETE FROM campaign_state_events WHERE campaign_id IN (SELECT id FROM campaign_orchestrations);
-- DELETE FROM campaign_orchestrations;
-- DELETE FROM social_post_attempts WHERE social_post_id IN (SELECT id FROM social_posts);
-- DELETE FROM social_posts;
-- DELETE FROM social_oauth_states;
-- DELETE FROM social_accounts;
-- DELETE FROM compliance.approval_workflows;
-- DELETE FROM compliance.abuse_signals;
-- DELETE FROM compliance.compliance_reviews;
-- DELETE FROM compliance.suppression_list;
-- DELETE FROM compliance.consent_records;
-- DELETE FROM url_analysis_results;
-- DELETE FROM affiliate_links;
-- DELETE FROM offer_snapshots;
-- DELETE FROM offers;
-- DELETE FROM products;
-- DELETE FROM merchants;
-- DELETE FROM funnel_analysis;
-- DELETE FROM cohort_analysis;
-- DELETE FROM anomaly_alerts;
-- DELETE FROM real_time_metrics;
-- DELETE FROM conversions WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM attribution_touchpoints WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM experiment_results;
-- DELETE FROM experiments;
-- DELETE FROM canonical_events;
-- DELETE FROM landing_pages WHERE tenant_id IN (1, 2, 3);
-- COMMIT;
