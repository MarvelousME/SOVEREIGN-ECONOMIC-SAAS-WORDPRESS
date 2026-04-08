-- Migration: 004_seed_agents_business.sql
-- Description: Comprehensive seed data for Agent Economy and Business Builder
-- Created: 2026-04-08
-- Requires: uuid_generate_v4() from pgcrypto extension
-- Prerequisites: 001_seed_iam_ledger_ubi.sql must be run first

BEGIN;

-- ============================================
-- SECTION 1: AGENTS (8 AI agents)
-- ============================================
INSERT INTO agents (id, tenant_id, owner_id, name, description, type, status, version, config, created_at, updated_at, last_executed_at, execution_count, total_tokens_used, total_cost, total_revenue, marketplace_listing_id) VALUES
(uuid_generate_v4(), 1, 1, 'ContentWriter Pro', 'AI-powered content generation agent for marketing and blog posts', 'content_writer', 'active', '1.0.0', 
 '{"model": "gpt-4-turbo", "temperature": 0.7, "max_tokens": 2000, "capabilities": ["blog_posts", "social_media", "product_descriptions"]}',
 '2026-02-15 10:00:00+00', '2026-04-07 14:30:00+00', '2026-04-07 14:30:00+00', 245, 1250000, 125.50, 450.00, NULL),
(uuid_generate_v4(), 1, 1, 'DataAnalyzer Agent', 'Advanced data analysis and visualization agent', 'data_analyst', 'active', '1.2.0',
 '{"model": "gpt-4", "temperature": 0.3, "capabilities": ["statistical_analysis", "chart_generation", "report_creation"]}',
 '2026-02-20 11:00:00+00', '2026-04-06 16:45:00+00', '2026-04-06 16:45:00+00', 189, 890000, 89.00, 320.00, NULL),
(uuid_generate_v4(), 1, 2, 'CustomerSupport Bot', 'Automated customer support with FAQ and ticket routing', 'customer_support', 'active', '2.1.0',
 '{"model": "gpt-3.5-turbo", "temperature": 0.5, "capabilities": ["faq", "ticket_creation", "escalation"]}',
 '2026-03-01 09:00:00+00', '2026-04-07 11:20:00+00', '2026-04-07 11:20:00+00', 523, 2100000, 105.00, 0.00, NULL),
(uuid_generate_v4(), 2, 6, 'LeadQualification AI', 'Intelligent lead scoring and qualification agent', 'lead_qualifier', 'active', '1.0.0',
 '{"model": "gpt-4", "temperature": 0.2, "capabilities": ["lead_scoring", " qualification", "enrichment"]}',
 '2026-03-10 14:00:00+00', '2026-04-05 10:00:00+00', '2026-04-05 10:00:00+00', 156, 780000, 78.00, 280.00, NULL),
(uuid_generate_v4(), 2, 7, 'SEOOptimizer Agent', 'Automated SEO analysis and recommendation engine', 'seo_optimizer', 'active', '1.5.0',
 '{"model": "gpt-4", "temperature": 0.4, "capabilities": ["keyword_analysis", "content_optimization", "competitor_analysis"]}',
 '2026-03-15 08:30:00+00', '2026-04-07 09:15:00+00', '2026-04-07 09:15:00+00', 98, 490000, 49.00, 175.00, NULL),
(uuid_generate_v4(), 2, 8, 'CodeReview Assistant', 'Automated code review with best practices enforcement', 'code_reviewer', 'active', '1.0.0',
 '{"model": "gpt-4", "temperature": 0.1, "capabilities": ["security_scan", "style_check", "performance_analysis"]}',
 '2026-03-20 10:00:00+00', '2026-04-06 15:30:00+00', '2026-04-06 15:30:00+00', 312, 1560000, 156.00, 0.00, NULL),
(uuid_generate_v4(), 3, 10, 'FinancialReport Agent', 'Automated financial reporting and forecasting', 'financial_analyst', 'active', '2.0.0',
 '{"model": "gpt-4", "temperature": 0.3, "capabilities": ["balance_sheets", "income_statements", "cash_flow_analysis", "forecasting"]}',
 '2026-03-25 09:00:00+00', '2026-04-07 17:00:00+00', '2026-04-07 17:00:00+00', 445, 2225000, 222.50, 890.00, NULL),
(uuid_generate_v4(), 3, 11, 'MarketResearch AI', 'Comprehensive market research and competitor analysis', 'market_researcher', 'active', '1.0.0',
 '{"model": "gpt-4", "temperature": 0.5, "capabilities": ["competitor_analysis", "trend_identification", "opportunity_analysis"]}',
 '2026-04-01 11:00:00+00', '2026-04-07 13:45:00+00', '2026-04-07 13:45:00+00', 67, 335000, 33.50, 120.00, NULL);

-- Store agent IDs for referencing in other tables
DO $$
DECLARE
    agent1_id UUID;
    agent2_id UUID;
    agent3_id UUID;
    agent4_id UUID;
    agent5_id UUID;
    agent6_id UUID;
    agent7_id UUID;
    agent8_id UUID;
BEGIN
    SELECT id INTO agent1_id FROM agents WHERE name = 'ContentWriter Pro' LIMIT 1;
    SELECT id INTO agent2_id FROM agents WHERE name = 'DataAnalyzer Agent' LIMIT 1;
    SELECT id INTO agent3_id FROM agents WHERE name = 'CustomerSupport Bot' LIMIT 1;
    SELECT id INTO agent4_id FROM agents WHERE name = 'LeadQualification AI' LIMIT 1;
    SELECT id INTO agent5_id FROM agents WHERE name = 'SEOOptimizer Agent' LIMIT 1;
    SELECT id INTO agent6_id FROM agents WHERE name = 'CodeReview Assistant' LIMIT 1;
    SELECT id INTO agent7_id FROM agents WHERE name = 'FinancialReport Agent' LIMIT 1;
    SELECT id INTO agent8_id FROM agents WHERE name = 'MarketResearch AI' LIMIT 1;

    -- ============================================
    -- SECTION 2: AGENT EXECUTIONS (30+ records)
    -- ============================================
    INSERT INTO agent_executions (id, agent_id, triggered_by, status, input_data, output_data, error_message, started_at, completed_at, execution_time_ms, tokens_used, cost) VALUES
    (uuid_generate_v4(), agent1_id, 1, 'completed', '{"prompt": "Write a blog post about AI in finance", "word_count": 1000}', 
     '{"content": "Generated blog post...", "word_count": 1050}', NULL, 
     '2026-04-07 10:00:00+00', '2026-04-07 10:02:30+00', 150000, 2500, 0.25),
    (uuid_generate_v4(), agent1_id, 2, 'completed', '{"prompt": "Create product descriptions for 5 items", "tone": "professional"}', 
     '{"descriptions": ["item1...", "item2..."]}', NULL,
     '2026-04-07 11:00:00+00', '2026-04-07 11:01:45+00', 105000, 1800, 0.18),
    (uuid_generate_v4(), agent2_id, 3, 'completed', '{"dataset": "sales_q1_2026", "analysis_type": "trend"}', 
     '{"trend": "upward", "percentage": 15.3}', NULL,
     '2026-04-06 14:00:00+00', '2026-04-06 14:03:20+00', 200000, 3200, 0.32),
    (uuid_generate_v4(), agent2_id, 1, 'completed', '{"dataset": "user_engagement", "visualization": "chart"}', 
     '{"chart_url": "https://example.com/chart.png"}', NULL,
     '2026-04-06 16:00:00+00', '2026-04-06 16:02:10+00', 130000, 2100, 0.21),
    (uuid_generate_v4(), agent3_id, 1, 'failed', '{"query": "How do I reset my password?", "user_id": "user123"}', 
     NULL, 'Rate limit exceeded', 
     '2026-04-07 09:00:00+00', '2026-04-07 09:00:05+00', 5000, 100, 0.01),
    (uuid_generate_v4(), agent3_id, 2, 'completed', '{"query": "What are your support hours?", "language": "en"}', 
     '{"response": "Our support team is available 24/7..."}', NULL,
     '2026-04-07 09:15:00+00', '2026-04-07 09:00:25+00', 25000, 400, 0.04),
    (uuid_generate_v4(), agent4_id, 6, 'completed', '{"leads": ["lead1@email.com", "lead2@email.com"]}', 
     '{"scores": [{"email": "lead1@email.com", "score": 85}, {"email": "lead2@email.com", "score": 62}]}', NULL,
     '2026-04-05 10:00:00+00', '2026-04-05 10:02:00+00', 120000, 1900, 0.19),
    (uuid_generate_v4(), agent5_id, 7, 'completed', '{"url": "https://example.com/blog/post1"}', 
     '{"score": 78, "recommendations": ["add_meta_description", "improve_headers"]}', NULL,
     '2026-04-07 09:15:00+00', '2026-04-07 09:17:30+00', 150000, 2400, 0.24),
    (uuid_generate_v4(), agent6_id, 8, 'completed', '{"code": "function foo() { return 1; }", "language": "javascript"}', 
     '{"issues": [], "score": 95}', NULL,
     '2026-04-06 15:30:00+00', '2026-04-06 15:31:15+00', 75000, 1200, 0.12),
    (uuid_generate_v4(), agent7_id, 10, 'completed', '{"report_type": "quarterly_balance_sheet", "period": "Q1_2026"}', 
     '{"balance_sheet": {...}, "total_assets": 5000000}', NULL,
     '2026-04-07 17:00:00+00', '2026-04-07 17:05:00+00', 300000, 4800, 0.48);

    -- ============================================
    -- SECTION 3: AGENT MEMORY
    -- ============================================
    INSERT INTO agent_memory (id, agent_id, memory_type, content, embedding, metadata, created_at, updated_at) VALUES
    (uuid_generate_v4(), agent1_id, 'knowledge', 'Best practices for writing marketing content include: clear CTAs, benefit-driven copy, SEO optimization.',
     NULL, '{"source": "training_data", "relevance": 0.95}',
     '2026-02-15 10:00:00+00', '2026-04-07 14:30:00+00'),
    (uuid_generate_v4(), agent1_id, 'context', '{"recent_prompts": ["blog about AI", "product descriptions"], "user_preferences": {"tone": "professional"}}',
     NULL, '{"user_id": 1}',
     '2026-04-07 14:30:00+00', '2026-04-07 14:30:00+00'),
    (uuid_generate_v4(), agent2_id, 'knowledge', 'Statistical analysis best practices: normalize data, check for outliers, use appropriate statistical tests.',
     NULL, '{"source": "training_data", "relevance": 0.92}',
     '2026-02-20 11:00:00+00', '2026-04-06 16:45:00+00'),
    (uuid_generate_v4(), agent3_id, 'knowledge', 'Customer support FAQ knowledge base: common questions about billing, technical issues, account management.',
     NULL, '{"source": "faq_uploaded", "relevance": 0.88}',
     '2026-03-01 09:00:00+00', '2026-04-07 11:20:00+00'),
    (uuid_generate_v4(), agent7_id, 'knowledge', 'Financial reporting standards: GAAP compliance, proper revenue recognition, expense categorization.',
     NULL, '{"source": "training_data", "relevance": 0.96}',
     '2026-03-25 09:00:00+00', '2026-04-07 17:00:00+00');

    -- ============================================
    -- SECTION 4: AGENT MARKETPLACE LISTINGS (3 agents listed)
    -- ============================================
    INSERT INTO agent_marketplace_listings (id, agent_id, listing_name, description, pricing_model, price, currency, installation_count, rating, review_count, status, created_at) VALUES
    (uuid_generate_v4(), agent1_id, 'ContentWriter Pro - Marketplace', 'Professional AI content writer for marketing teams', 'subscription', 49.99, 'USD', 23, 4.7, 18, 'active', '2026-03-01 00:00:00+00'),
    (uuid_generate_v4(), agent2_id, 'DataAnalyzer Pro', 'Enterprise data analysis and visualization', 'subscription', 99.99, 'USD', 15, 4.9, 12, 'active', '2026-03-15 00:00:00+00'),
    (uuid_generate_v4(), agent4_id, 'LeadQualifier AI', 'Intelligent B2B lead qualification', 'per_lead', 0.25, 'USD', 8, 4.5, 6, 'active', '2026-03-20 00:00:00+00');

    -- ============================================
    -- SECTION 5: AGENT INSTALLATIONS (10+ installations)
    -- ============================================
    INSERT INTO agent_installations (id, agent_id, user_id, tenant_id, status, config, installed_at, uninstalled_at) VALUES
    (uuid_generate_v4(), agent1_id, 1, 1, 'active', '{"default_tone": "professional", "max_word_count": 2000}', '2026-03-01 00:00:00+00', NULL),
    (uuid_generate_v4(), agent1_id, 6, 2, 'active', '{"default_tone": "friendly", "max_word_count": 1500}', '2026-03-05 00:00:00+00', NULL),
    (uuid_generate_v4(), agent2_id, 1, 1, 'active', '{"chart_style": "modern", "color_scheme": "brand"}', '2026-03-10 00:00:00+00', NULL),
    (uuid_generate_v4(), agent2_id, 3, 1, 'active', '{"chart_style": "minimal", "export_format": "png"}', '2026-03-12 00:00:00+00', NULL),
    (uuid_generate_v4(), agent2_id, 10, 3, 'active', '{"chart_style": "corporate", "branding": "apex"}', '2026-03-28 00:00:00+00', NULL),
    (uuid_generate_v4(), agent3_id, 1, 1, 'active', '{"response_style": "concise", "escalation_threshold": 0.8}', '2026-03-05 00:00:00+00', NULL),
    (uuid_generate_v4(), agent4_id, 6, 2, 'active', '{"scoring_model": "custom", "qualification_criteria": "standard"}', '2026-03-12 00:00:00+00', NULL),
    (uuid_generate_v4(), agent4_id, 9, 2, 'active', '{"scoring_model": "aggressive", "auto_qualify_threshold": 75}', '2026-03-18 00:00:00+00', NULL),
    (uuid_generate_v4(), agent7_id, 10, 3, 'active', '{"report_format": "detailed", "currency": "USD"}', '2026-03-28 00:00:00+00', NULL),
    (uuid_generate_v4(), agent8_id, 12, 3, 'active', '{"research_depth": "comprehensive", "competitor_count": 10}', '2026-04-03 00:00:00+00', NULL);

    -- ============================================
    -- SECTION 6: AGENT REVIEWS
    -- ============================================
    INSERT INTO agent_reviews (id, agent_id, user_id, rating, title, content, status, created_at) VALUES
    (uuid_generate_v4(), agent1_id, 1, 5, 'Excellent content quality', 'The generated content is always well-structured and on-brand. Saves hours of work.', 'approved', '2026-03-15 10:00:00+00'),
    (uuid_generate_v4(), agent1_id, 6, 4, 'Great for product descriptions', 'Works well for e-commerce content. Sometimes needs light editing.', 'approved', '2026-03-20 14:30:00+00'),
    (uuid_generate_v4(), agent2_id, 3, 5, 'Indispensable for analytics', 'Quick, accurate, and the visualizations look professional.', 'approved', '2026-03-25 09:00:00+00'),
    (uuid_generate_v4(), agent4_id, 7, 4, 'Solid lead scoring', 'Helped us prioritize outreach effectively. Integration was smooth.', 'approved', '2026-04-01 11:00:00+00'),
    (uuid_generate_v4(), agent7_id, 11, 5, 'Best financial agent', 'Accurate forecasts and beautiful report formatting. Worth the price.', 'approved', '2026-04-06 16:00:00+00');

    -- ============================================
    -- SECTION 7: BUSINESSES
    -- ============================================
    INSERT INTO businesses (id, user_id, tenant_id, name, template, status, deployed_at, subdomain, custom_domain, branding, created_at) VALUES
    (uuid_generate_v4(), 1, 1, 'TechStart Marketing', 'marketing', 'deployed', '2026-03-01 00:00:00+00', 'techstart-marketing', 'techstart.example.com',
     '{"logo": "https://example.com/logos/techstart.png", "primary_color": "#3B82F6", "secondary_color": "#10B981"}',
     '2026-02-15 10:00:00+00'),
    (uuid_generate_v4(), 6, 2, 'NovaTech Hub', 'saas', 'deployed', '2026-03-15 00:00:00+00', 'novatech-hub', 'hub.novatech.example.com',
     '{"logo": "https://example.com/logos/novatech.png", "primary_color": "#6366F1"}',
     '2026-03-01 09:00:00+00'),
    (uuid_generate_v4(), 2, 1, 'Creative Agency Pro', 'portfolio', 'draft', NULL, 'creative-agency-pro', NULL,
     '{"primary_color": "#EC4899", "secondary_color": "#8B5CF6"}',
     '2026-03-10 14:00:00+00'),
    (uuid_generate_v4(), 10, 3, 'Apex Finance Dashboard', 'analytics', 'deployed', '2026-04-01 00:00:00+00', 'apex-finance', 'finance.apex.example.com',
     '{"logo": "https://example.com/logos/apex.png", "primary_color": "#1E40AF"}',
     '2026-03-20 11:00:00+00'),
    (uuid_generate_v4(), 7, 2, 'Operations Central', 'dashboard', 'deployed', '2026-04-05 00:00:00+00', 'ops-central', NULL,
     '{"logo": "https://example.com/logos/ops.png", "primary_color": "#F59E0B"}',
     '2026-03-25 08:00:00+00');

END $$;

-- ============================================
-- SECTION 8: BUSINESS PAGES (15+ pages)
-- ============================================
INSERT INTO business_pages (id, business_id, title, slug, content, meta_description, status, published_at, created_at, updated_at) VALUES
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'Home', 'home', '{"hero": {"headline": "Grow Your Business with AI", "subheadline": "Powerful marketing automation"}, "features": [{"title": "Smart Campaigns", "icon": "rocket"}]}', 'AI-powered marketing solutions for growing businesses', 'published', '2026-03-01 12:00:00+00', '2026-03-01 10:00:00+00', '2026-03-01 12:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'Features', 'features', '{"sections": [{"title": "Our Features", "items": ["Campaign Automation", "Lead Scoring", "Analytics"]}]}', 'Explore our powerful features', 'published', '2026-03-02 12:00:00+00', '2026-03-02 10:00:00+00', '2026-03-02 12:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'Pricing', 'pricing', '{"plans": [{"name": "Starter", "price": 29}, {"name": "Pro", "price": 99}]}', 'Affordable pricing for everyone', 'published', '2026-03-03 12:00:00+00', '2026-03-03 10:00:00+00', '2026-03-03 12:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'Dashboard', 'dashboard', '{"widgets": [{"type": "metrics", "title": "Overview"}]}', 'Your command center', 'published', '2026-03-15 14:00:00+00', '2026-03-15 12:00:00+00', '2026-03-15 14:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'Reports', 'reports', '{"charts": [{"type": "line", "title": "Revenue"}]}', 'Detailed reports and analytics', 'published', '2026-03-16 14:00:00+00', '2026-03-16 12:00:00+00', '2026-03-16 14:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Apex Finance Dashboard' LIMIT 1), 'Financial Overview', 'overview', '{"metrics": [{"name": "Total Assets", "value": 5000000}]}', 'Company financial overview', 'published', '2026-04-01 16:00:00+00', '2026-04-01 14:00:00+00', '2026-04-01 16:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Apex Finance Dashboard' LIMIT 1), 'Cash Flow', 'cash-flow', '{"flows": [{"in": 2000000, "out": 1500000}]}', 'Cash flow analysis', 'published', '2026-04-02 16:00:00+00', '2026-04-02 14:00:00+00', '2026-04-02 16:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Operations Central' LIMIT 1), 'Operations Home', 'home', '{"operations": [{"type": "tasks", "count": 45}]}', 'Manage your operations', 'published', '2026-04-05 10:00:00+00', '2026-04-05 08:00:00+00', '2026-04-05 10:00:00+00');

-- ============================================
-- SECTION 9: BUSINESS ANALYTICS
-- ============================================
INSERT INTO business_analytics (id, business_id, metric_type, metric_value, period_start, period_end, metadata, created_at) VALUES
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'page_views', 15420, '2026-03-01 00:00:00+00', '2026-03-31 23:59:59+00', '{"source": "google_analytics"}', '2026-04-01 00:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'conversions', 342, '2026-03-01 00:00:00+00', '2026-03-31 23:59:59+00', '{"conversion_rate": 2.22}', '2026-04-01 00:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'page_views', 28500, '2026-03-15 00:00:00+00', '2026-03-31 23:59:59+00', '{"source": "google_analytics"}', '2026-04-01 00:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'signups', 156, '2026-03-15 00:00:00+00', '2026-03-31 23:59:59+00', '{"conversion_rate": 0.55}', '2026-04-01 00:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Apex Finance Dashboard' LIMIT 1), 'page_views', 8900, '2026-04-01 00:00:00+00', '2026-04-07 23:59:59+00', '{"source": "internal"}', '2026-04-08 00:00:00+00');

-- ============================================
-- SECTION 10: BUSINESS PAYMENTS
-- ============================================
INSERT INTO business_payments (id, business_id, amount, currency, status, payment_method, transaction_id, paid_at, created_at) VALUES
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 29.99, 'USD', 'completed', 'credit_card', 'txn_demo_001', '2026-03-01 10:00:00+00', '2026-03-01 09:55:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 29.99, 'USD', 'completed', 'credit_card', 'txn_demo_002', '2026-04-01 10:00:00+00', '2026-04-01 09:55:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 99.99, 'USD', 'completed', 'paypal', 'txn_nova_001', '2026-03-15 14:00:00+00', '2026-03-15 13:55:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 99.99, 'USD', 'completed', 'paypal', 'txn_nova_002', '2026-04-15 14:00:00+00', '2026-04-15 13:55:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Apex Finance Dashboard' LIMIT 1), 299.99, 'USD', 'completed', 'bank_transfer', 'txn_apex_001', '2026-04-01 16:00:00+00', '2026-04-01 15:55:00+00');

-- ============================================
-- SECTION 11: BUSINESS DOMAINS
-- ============================================
INSERT INTO business_domains (id, business_id, domain, is_primary, is_verified, verified_at, created_at) VALUES
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'techstart.example.com', true, true, '2026-03-01 12:00:00+00', '2026-03-01 10:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'hub.novatech.example.com', true, true, '2026-03-15 14:00:00+00', '2026-03-15 12:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'novatech.example.com', false, true, '2026-03-16 10:00:00+00', '2026-03-16 09:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Apex Finance Dashboard' LIMIT 1), 'finance.apex.example.com', true, true, '2026-04-01 16:00:00+00', '2026-04-01 14:00:00+00');

-- ============================================
-- SECTION 12: BUSINESS_WEBHOOKS
-- ============================================
INSERT INTO business_webhooks (id, business_id, url, events, secret, is_active, created_at) VALUES
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'TechStart Marketing' LIMIT 1), 'https://hooks.example.com/techstart/crm', '["lead.created", "lead.converted"]', 'whsec_techstart_xxxxx', true, '2026-03-05 10:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'NovaTech Hub' LIMIT 1), 'https://hooks.example.com/novatech/analytics', '["page.viewed", "signup.completed"]', 'whsec_novatech_xxxxx', true, '2026-03-18 14:00:00+00'),
(uuid_generate_v4(), (SELECT id FROM businesses WHERE name = 'Apex Finance Dashboard' LIMIT 1), 'https://hooks.example.com/apex/erp', '["payment.received", "invoice.created"]', 'whsec_apex_xxxxx', true, '2026-04-02 16:00:00+00');

-- ============================================
-- SECTION 13: WORKSPACE_INVITATIONS
-- ============================================
INSERT INTO workspace_invitations (id, workspace_id, invited_by_user_id, email, role, token, status, expires_at, accepted_at, created_at) VALUES
(uuid_generate_v4(), 'e0000000-0000-4000-8000-000000000001', 1, 'newmember@example.com', 'member', 'inv_token_abc123', 'pending', '2026-04-15 23:59:59+00', NULL, '2026-04-07 10:00:00+00'),
(uuid_generate_v4(), 'e0000000-0000-4000-8000-000000000001', 6, 'analytics@example.com', 'manager', 'inv_token_def456', 'pending', '2026-04-15 23:59:59+00', NULL, '2026-04-06 14:00:00+00'),
(uuid_generate_v4(), 'e0000000-0000-4000-8000-000000000001', 10, 'executive@example.com', 'admin', 'inv_token_ghi789', 'accepted', '2026-04-10 23:59:59+00', '2026-04-05 09:00:00+00', '2026-04-04 16:00:00+00');

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (commented out for reference)
-- ============================================
-- SELECT 'Agents' as table_name, COUNT(*) as count FROM agents;
-- SELECT 'Agent Executions' as table_name, COUNT(*) as count FROM agent_executions;
-- SELECT 'Agent Installations' as table_name, COUNT(*) as count FROM agent_installations;
-- SELECT 'Businesses' as table_name, COUNT(*) as count FROM businesses;
-- SELECT 'Business Pages' as table_name, COUNT(*) as count FROM business_pages;
-- SELECT 'Workspace Invitations' as table_name, COUNT(*) as count FROM workspace_invitations;

-- ============================================
-- ROLLBACK SECTION
-- ============================================
-- DROP TABLE IF EXISTS workspace_invitations CASCADE;
-- DROP TABLE IF EXISTS business_webhooks CASCADE;
-- DROP TABLE IF EXISTS business_domains CASCADE;
-- DROP TABLE IF EXISTS business_payments CASCADE;
-- DROP TABLE IF EXISTS business_analytics CASCADE;
-- DROP TABLE IF EXISTS business_pages CASCADE;
-- DROP TABLE IF EXISTS businesses CASCADE;
-- DROP TABLE IF EXISTS agent_reviews CASCADE;
-- DROP TABLE IF EXISTS agent_installations CASCADE;
-- DROP TABLE IF EXISTS agent_marketplace_listings CASCADE;
-- DROP TABLE IF EXISTS agent_memory CASCADE;
-- DROP TABLE IF EXISTS agent_executions CASCADE;
-- DROP TABLE IF EXISTS agents CASCADE;
