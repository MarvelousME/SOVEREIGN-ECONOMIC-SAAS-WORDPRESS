-- Migration: 002_seed_treasury_tasks.sql
-- Description: Comprehensive seed data for Treasury, Task Marketplace, and Skills
-- Created: 2026-04-08
-- Dependencies: 001_seed_development_data.sql (tenants and users)

BEGIN;

SET session_replication_role = replica;

\echo '==============================================='
\echo 'Treasury, Tasks, and Skills Seed Data'
\echo 'Loading comprehensive seed data...'
\echo '==============================================='

-- ============================================
-- TASK CATEGORIES (8 categories in hierarchy)
-- ============================================
\echo 'Seeding task categories...'

INSERT INTO task_categories (id, tenant_id, name, slug, description, parent_id, icon, sort_order, active) VALUES
-- Parent categories
(1, 1, 'Technology', 'technology', 'Software development and IT tasks', NULL, 'code', 1, true),
(2, 1, 'Design', 'design', 'UI/UX and graphic design tasks', NULL, 'palette', 2, true),
(3, 1, 'Marketing', 'marketing', 'Marketing and promotional tasks', NULL, 'campaign', 3, true),
(4, 1, 'Writing', 'writing', 'Content creation and copywriting', NULL, 'edit', 4, true),
-- Technology subcategories
(5, 1, 'Web Development', 'web-development', 'Frontend and backend web development', 1, 'globe', 10, true),
(6, 1, 'Mobile Development', 'mobile-development', 'iOS, Android and cross-platform apps', 1, 'smartphone', 11, true),
(7, 1, 'DevOps & Cloud', 'devops-cloud', 'Cloud infrastructure and deployment', 1, 'cloud', 12, true),
-- Design subcategories
(8, 1, 'UI Design', 'ui-design', 'User interface design', 2, 'layout', 20, true),
(9, 1, 'UX Research', 'ux-research', 'User experience research and testing', 2, 'users', 21, true),
-- Marketing subcategories
(10, 1, 'Social Media', 'social-media', 'Social media management and content', 3, 'share', 30, true),
(11, 1, 'SEO & Analytics', 'seo-analytics', 'Search optimization and data analysis', 3, 'search', 31, true),
-- Writing subcategories
(12, 1, 'Technical Writing', 'technical-writing', 'Documentation and technical content', 4, 'document', 40, true),
(13, 1, 'Creative Writing', 'creative-writing', 'Stories, blogs and creative content', 4, 'book', 41, true);

SELECT setval('task_categories_id_seq', 13, true);

-- ============================================
-- SKILLS (20+ skills linked to categories)
-- ============================================
\echo 'Seeding skills...'

INSERT INTO skills (id, tenant_id, name, slug, description, category_id) VALUES
-- Technology skills
(1, 1, 'JavaScript', 'javascript', 'JavaScript programming language', 5),
(2, 1, 'TypeScript', 'typescript', 'TypeScript superset of JavaScript', 5),
(3, 1, 'React', 'react', 'React frontend library', 5),
(4, 1, 'Node.js', 'nodejs', 'Server-side JavaScript runtime', 5),
(5, 1, 'Python', 'python', 'Python programming language', 5),
(6, 1, 'Django', 'django', 'Python web framework', 5),
(7, 1, 'Swift', 'swift', 'iOS development language', 6),
(8, 1, 'Kotlin', 'kotlin', 'Android development language', 6),
(9, 1, 'React Native', 'react-native', 'Cross-platform mobile framework', 6),
(10, 1, 'AWS', 'aws', 'Amazon Web Services cloud platform', 7),
(11, 1, 'Docker', 'docker', 'Containerization platform', 7),
-- Design skills
(12, 1, 'Figma', 'figma', 'UI design tool', 8),
(13, 1, 'Adobe XD', 'adobe-xd', 'Design and prototype tool', 8),
(14, 1, 'Sketch', 'sketch', 'Mac design application', 8),
(15, 1, 'User Research', 'user-research', 'UX research methodologies', 9),
(16, 1, 'A/B Testing', 'ab-testing', 'Controlled experiments', 9),
-- Marketing skills
(17, 1, 'Social Media Marketing', 'social-media-marketing', 'Social platforms promotion', 10),
(18, 1, 'Content Marketing', 'content-marketing', 'Content strategy and creation', 10),
(19, 1, 'SEO', 'seo', 'Search engine optimization', 11),
(20, 1, 'Google Analytics', 'google-analytics', 'Web analytics platform', 11),
-- Writing skills
(21, 1, 'Technical Documentation', 'technical-documentation', 'Technical writing skills', 12),
(22, 1, 'API Documentation', 'api-documentation', 'API reference documentation', 12),
(23, 1, 'Copywriting', 'copywriting', 'Persuasive writing', 12),
(24, 1, 'Blog Writing', 'blog-writing', 'Blog content creation', 13),
(25, 1, 'Creative Writing', 'creative-writing', 'Creative content development', 13);

SELECT setval('skills_id_seq', 25, true);

-- ============================================
-- TASKS (30+ tasks with various statuses)
-- ============================================
\echo 'Seeding tasks...'

INSERT INTO tasks (id, tenant_id, category_id, title, description, difficulty, reward_amount, currency, status, max_assignments, current_assignments, proof_required, proof_instructions, estimated_duration_minutes, created_by, assigned_to, expires_at, completed_at, metadata) VALUES
-- Open tasks
(1, 1, 5, 'Build REST API Authentication', 'Create a secure REST API authentication system with JWT tokens and refresh logic', 'advanced', 500.00, 'USD', 'open', 2, 0, true, 'Provide GitHub repository link and Postman collection demonstrating the API', 480, 1, NULL, NOW() + INTERVAL '30 days', NULL, '{" complexity": "high", "urgency": "medium"}'),
(2, 1, 5, 'Implement User Dashboard', 'Build a responsive user dashboard with analytics widgets and data visualization', 'intermediate', 300.00, 'USD', 'open', 3, 0, true, 'Deploy to staging and provide access credentials', 240, 1, NULL, NOW() + INTERVAL '14 days', NULL, '{"tech_stack": ["React", "Chart.js"]}'),
(3, 1, 6, 'iOS App Login Screen', 'Design and implement a secure login screen for iOS with biometric authentication', 'intermediate', 250.00, 'USD', 'open', 1, 0, true, 'Submit to TestFlight and provide demo video', 180, 1, NULL, NOW() + INTERVAL '21 days', NULL, '{}'),
(4, 1, 6, 'Android Push Notifications', 'Integrate Firebase Cloud Messaging for push notifications', 'beginner', 150.00, 'USD', 'open', 2, 0, true, 'Provide working debug APK', 120, 2, NULL, NOW() + INTERVAL '7 days', NULL, '{}'),
(5, 1, 7, 'Dockerize Microservices', 'Containerize 5 microservices with Docker and create docker-compose setup', 'advanced', 450.00, 'USD', 'open', 1, 0, true, 'Provide repository with working Docker files and compose', 360, 1, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(6, 1, 7, 'AWS Lambda Function Setup', 'Create serverless Lambda functions for image processing pipeline', 'intermediate', 350.00, 'USD', 'open', 1, 0, true, 'Deploy to AWS and provide CloudWatch logs', 240, 2, NULL, NOW() + INTERVAL '21 days', NULL, '{}'),
(7, 1, 8, 'Mobile App UI Redesign', 'Redesign the mobile app interface with modern design principles', 'advanced', 400.00, 'USD', 'open', 2, 0, true, 'Provide Figma file with complete design system', 480, 1, NULL, NOW() + INTERVAL '30 days', NULL, '{}'),
(8, 1, 8, 'Icon Set Design', 'Create a cohesive icon set of 50+ icons for the platform', 'intermediate', 200.00, 'USD', 'open', 1, 0, true, 'Export in SVG, PNG formats at multiple sizes', 300, 2, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(9, 1, 9, 'User Interview Analysis', 'Conduct 10 user interviews and synthesize findings into actionable insights', 'intermediate', 350.00, 'USD', 'open', 1, 0, true, 'Submit interview recordings and analysis report', 600, 1, NULL, NOW() + INTERVAL '21 days', NULL, '{}'),
(10, 1, 10, 'Twitter Content Calendar', 'Create a 30-day Twitter content calendar with daily posts', 'beginner', 100.00, 'USD', 'open', 5, 0, true, 'Provide content calendar spreadsheet', 120, 2, NULL, NOW() + INTERVAL '7 days', NULL, '{}'),
(11, 1, 10, 'Instagram Reels Strategy', 'Develop strategy for 10 Instagram Reels promoting the product', 'intermediate', 200.00, 'USD', 'open', 2, 0, true, 'Submit video scripts and storyboard', 180, 1, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(12, 1, 11, 'SEO Audit Report', 'Perform comprehensive SEO audit and provide recommendations', 'advanced', 400.00, 'USD', 'open', 1, 0, true, 'Deliver detailed audit document with action items', 480, 2, NULL, NOW() + INTERVAL '21 days', NULL, '{}'),
(13, 1, 12, 'API Documentation Overhaul', 'Rewrite API documentation with improved examples and tutorials', 'intermediate', 300.00, 'USD', 'open', 1, 0, true, 'Submit documentation preview link', 360, 1, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(14, 1, 12, 'User Guide Creation', 'Create comprehensive user guide for platform features', 'beginner', 200.00, 'USD', 'open', 2, 0, true, 'Submit markdown files with screenshots', 240, 2, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(15, 1, 13, 'Product Launch Blog Series', 'Write 5 blog posts for product launch campaign', 'intermediate', 350.00, 'USD', 'open', 1, 0, true, 'Submit drafts for review', 300, 1, NULL, NOW() + INTERVAL '21 days', NULL, '{}'),
-- Assigned/In Progress tasks
(16, 1, 5, 'E-commerce Checkout Flow', 'Build complete checkout flow with payment integration', 'intermediate', 400.00, 'USD', 'assigned', 1, 1, true, 'Provide working staging deployment', 360, 1, 2, NOW() + INTERVAL '14 days', NULL, '{}'),
(17, 1, 6, 'Flutter App Development', 'Develop cross-platform app using Flutter', 'advanced', 600.00, 'USD', 'in_progress', 1, 1, true, 'Submit debug APK and source code', 720, 1, 3, NOW() + INTERVAL '30 days', NULL, '{}'),
(18, 1, 8, 'Landing Page Design', 'Design high-converting landing page mockup', 'intermediate', 250.00, 'USD', 'assigned', 1, 1, true, 'Provide Figma prototype', 180, 2, 2, NOW() + INTERVAL '7 days', NULL, '{}'),
-- Submitted tasks
(19, 1, 5, 'Real-time Chat Feature', 'Implement WebSocket-based real-time chat', 'advanced', 500.00, 'USD', 'submitted', 1, 1, true, 'Provide working deployment and documentation', 480, 1, 2, NOW() + INTERVAL '7 days', NULL, '{}'),
(20, 1, 11, 'Google Ads Campaign Setup', 'Set up and optimize Google Ads campaign', 'intermediate', 300.00, 'USD', 'submitted', 1, 1, true, 'Submit campaign dashboard screenshots', 240, 1, 3, NOW() + INTERVAL '14 days', NULL, '{}'),
-- Under review tasks
(21, 1, 5, 'Payment Gateway Integration', 'Integrate Stripe payment processing', 'advanced', 450.00, 'USD', 'under_review', 1, 1, true, 'Provide test environment credentials', 360, 1, 2, NOW() + INTERVAL '7 days', NULL, '{}'),
(22, 1, 13, 'Case Study Writing', 'Write customer case study highlighting ROI', 'intermediate', 250.00, 'USD', 'under_review', 1, 1, true, 'Submit draft for review', 180, 2, 3, NOW() + INTERVAL '14 days', NULL, '{}'),
-- Completed tasks
(23, 1, 5, 'User Authentication Module', 'Implement secure login and registration system', 'intermediate', 350.00, 'USD', 'completed', 1, 1, true, 'Code review and testing', 300, 1, 2, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', '{}'),
(24, 1, 8, 'Logo Design Project', 'Design company logo with variations', 'intermediate', 200.00, 'USD', 'completed', 1, 1, true, 'Provide all logo files', 180, 1, 3, NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days', '{}'),
(25, 1, 10, 'Facebook Ads Creative', 'Create 5 Facebook ad creatives', 'beginner', 150.00, 'USD', 'completed', 2, 2, true, 'Submit image files and copy', 120, 2, 2, NOW() - INTERVAL '21 days', NOW() - INTERVAL '14 days', '{}'),
-- Rejected/Cancelled tasks
(26, 1, 6, 'App Beta Testing', 'Conduct beta testing for new app release', 'beginner', 100.00, 'USD', 'rejected', 3, 1, true, 'Submit bug report', 180, 1, 2, NOW() - INTERVAL '14 days', NULL, '{}'),
(27, 1, 5, 'Legacy Code Migration', 'Migrate legacy PHP code to modern framework', 'expert', 800.00, 'USD', 'cancelled', 1, 0, true, 'Full documentation required', 720, 1, NULL, NOW() - INTERVAL '30 days', NULL, '{}'),
-- Draft tasks
(28, 1, 5, 'GraphQL API Development', 'Design and implement GraphQL API', 'advanced', 550.00, 'USD', 'draft', 1, 0, true, 'Provide schema and documentation', 480, 1, NULL, NULL, NULL, '{}'),
(29, 1, 7, 'Kubernetes Setup', 'Set up production Kubernetes cluster', 'expert', 700.00, 'USD', 'draft', 1, 0, true, 'Infrastructure documentation', 600, 2, NULL, NULL, NULL, '{}'),
(30, 1, 9, 'Usability Testing Report', 'Run usability tests and document findings', 'intermediate', 300.00, 'USD', 'draft', 1, 0, true, 'Complete test report', 360, 1, NULL, NULL, NULL, '{}'),
-- Additional open tasks for variety
(31, 1, 5, 'Database Optimization', 'Optimize slow database queries and add indexes', 'advanced', 400.00, 'USD', 'open', 1, 0, true, 'Before/after performance metrics', 240, 1, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(32, 1, 6, 'App Store Screenshots', 'Create optimized App Store screenshots', 'beginner', 100.00, 'USD', 'open', 2, 0, true, 'Submit in required sizes', 60, 2, NULL, NOW() + INTERVAL '7 days', NULL, '{}'),
(33, 1, 11, 'Email Marketing Campaign', 'Create segmented email campaign', 'intermediate', 200.00, 'USD', 'open', 1, 0, true, 'Provide campaign metrics', 180, 1, NULL, NOW() + INTERVAL '14 days', NULL, '{}'),
(34, 1, 12, 'FAQ Documentation', 'Write comprehensive FAQ document', 'beginner', 100.00, 'USD', 'open', 2, 0, true, 'Submit markdown document', 120, 2, NULL, NOW() + INTERVAL '7 days', NULL, '{}'),
(35, 1, 13, 'Newsletter Content', 'Write 4 weekly newsletter issues', 'intermediate', 250.00, 'USD', 'open', 1, 0, true, 'Submit all drafts at once', 200, 1, NULL, NOW() + INTERVAL '21 days', NULL, '{}');

SELECT setval('tasks_id_seq', 35, true);

-- ============================================
-- TASK SKILLS (many-to-many linking)
-- ============================================
\echo 'Seeding task skills...'

INSERT INTO task_skills (task_id, skill_id, proficiency_required, weight) VALUES
-- Task 1: REST API Authentication
(1, 1, 'advanced', 1.0),
(1, 2, 'advanced', 1.0),
(1, 4, 'intermediate', 0.8),
-- Task 2: User Dashboard
(2, 1, 'intermediate', 1.0),
(2, 3, 'intermediate', 1.0),
-- Task 3: iOS Login
(3, 7, 'advanced', 1.0),
-- Task 4: Push Notifications
(4, 8, 'beginner', 1.0),
-- Task 5: Dockerize
(5, 10, 'advanced', 0.8),
(5, 11, 'advanced', 1.0),
-- Task 6: AWS Lambda
(6, 10, 'intermediate', 1.0),
(6, 5, 'intermediate', 0.8),
-- Task 7: Mobile UI Redesign
(7, 12, 'advanced', 1.0),
(7, 3, 'intermediate', 0.8),
-- Task 8: Icon Set
(8, 12, 'intermediate', 1.0),
(8, 13, 'beginner', 0.5),
-- Task 9: User Interview
(9, 15, 'advanced', 1.0),
-- Task 10: Twitter Calendar
(10, 17, 'beginner', 1.0),
(10, 18, 'beginner', 0.8),
-- Task 11: Instagram Reels
(11, 17, 'intermediate', 1.0),
(11, 18, 'intermediate', 0.8),
-- Task 12: SEO Audit
(12, 19, 'advanced', 1.0),
(12, 20, 'intermediate', 0.8),
-- Task 13: API Documentation
(13, 22, 'intermediate', 1.0),
(13, 1, 'beginner', 0.5),
-- Task 14: User Guide
(14, 21, 'beginner', 1.0),
-- Task 15: Blog Series
(15, 24, 'intermediate', 1.0),
(15, 23, 'intermediate', 0.8),
-- Task 16: Checkout Flow
(16, 1, 'intermediate', 1.0),
(16, 2, 'intermediate', 1.0),
(16, 4, 'intermediate', 0.8),
-- Task 17: Flutter App
(17, 9, 'advanced', 1.0),
(17, 1, 'beginner', 0.5),
-- Task 18: Landing Page
(18, 12, 'intermediate', 1.0),
-- Task 19: Chat Feature
(19, 1, 'advanced', 1.0),
(19, 4, 'advanced', 1.0),
-- Task 20: Google Ads
(20, 20, 'intermediate', 1.0),
-- Task 21: Stripe Integration
(21, 1, 'advanced', 1.0),
(21, 4, 'intermediate', 0.8),
-- Task 22: Case Study
(22, 23, 'intermediate', 1.0),
(22, 24, 'beginner', 0.5),
-- Task 23: Auth Module
(23, 1, 'intermediate', 1.0),
(23, 2, 'intermediate', 1.0),
-- Task 24: Logo Design
(24, 12, 'intermediate', 1.0),
-- Task 25: Facebook Ads
(25, 17, 'beginner', 1.0),
(25, 18, 'beginner', 0.8),
-- Task 26: Beta Testing
(26, 8, 'beginner', 1.0),
-- Task 27: Legacy Migration
(27, 5, 'expert', 1.0),
(27, 6, 'expert', 0.8),
-- Task 28: GraphQL API
(28, 1, 'advanced', 1.0),
(28, 2, 'advanced', 1.0),
(28, 4, 'intermediate', 0.8),
-- Task 29: Kubernetes
(29, 10, 'expert', 1.0),
(29, 11, 'expert', 1.0),
-- Task 30: Usability Testing
(30, 15, 'intermediate', 1.0),
(30, 16, 'intermediate', 1.0),
-- Task 31: Database Optimization
(31, 5, 'advanced', 1.0),
-- Task 32: App Store Screenshots
(32, 12, 'beginner', 1.0),
-- Task 33: Email Campaign
(33, 18, 'intermediate', 1.0),
(33, 20, 'beginner', 0.5),
-- Task 34: FAQ Documentation
(34, 21, 'beginner', 1.0),
-- Task 35: Newsletter
(35, 24, 'intermediate', 1.0),
(35, 23, 'intermediate', 0.8);

-- ============================================
-- TASK SUBMISSIONS (20+ submissions)
-- ============================================
\echo 'Seeding task submissions...'

INSERT INTO task_submissions (id, task_id, user_id, proof_of_work, notes, status, reviewer_id, reviewer_notes, score, submitted_at, reviewed_at, revision_count, metadata) VALUES
-- Submissions for submitted task (19)
(1, 19, 2, '{"repo_url": "https://github.com/alice/chat-app", "demo_url": "https://staging.chat.demo.com", "tests_passed": true}', 'Implemented WebSocket chat with presence indicators and message history', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '2 days', NULL, 0, '{}'),
-- Submissions for submitted task (20)
(2, 20, 3, '{"campaign_id": "123456789", "impressions": 50000, "clicks": 1250, "ctr": 2.5}', 'Set up search and display campaigns targeting SME market', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '1 day', NULL, 0, '{}'),
-- Submissions for under_review task (21)
(3, 21, 2, '{"stripe_account": "acct_123", "testimonials_url": "https://staging.payments.test"}', 'Full Stripe integration with webhook handlers', 'under_review', 1, NULL, NULL, NOW() - INTERVAL '12 hours', NULL, 0, '{}'),
-- Submissions for under_review task (22)
(4, 22, 3, '{"doc_url": "https://docs.company.com/case-studies/acme", "metrics": {"roi": "250%", "time_saved": "40hrs/month"}}', 'Comprehensive case study with customer interview quotes', 'under_review', 1, NULL, NULL, NOW() - INTERVAL '6 hours', NULL, 0, '{}'),
-- Submissions for completed task (23)
(5, 23, 2, '{"repo": "https://github.com/acme/auth-module", "docs": "https://docs.auth.demo.com"}', 'Complete auth module with OAuth2 support', 'approved', 1, 'Excellent implementation, well documented', 95, NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', 1, '{}'),
-- Submissions for completed task (24)
(6, 24, 3, '{"figma_url": "https://figma.com/@alice/logo-v2", "files": ["logo-primary.svg", "logo-dark.svg", "logo-icon.svg"]}', 'Logo with primary, dark, and icon variants', 'approved', 1, 'Great work, client approved', 90, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', 2, '{}'),
-- Submissions for completed task (25)
(7, 25, 2, '{"ad_ids": ["fb_1", "fb_2", "fb_3"], "copy_variations": 5}', '5 ad creatives with different copy variations', 'approved', 1, 'Good variety of creatives', 85, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', 0, '{}'),
-- Submissions for rejected task (26)
(8, 26, 2, '{"testFlight_url": "https://testflight.apple.com/abc", "bug_count": 3}', 'Beta test report with 3 critical bugs found', 'rejected', 1, 'Bugs were already known issues, please review fixed issues next time', 40, NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days', 0, '{}'),
-- Additional submissions for variety
(9, 1, 2, '{"repo_url": "https://github.com/bob/jwt-auth", "api_docs": "/api/auth/docs"}', 'JWT auth with refresh token rotation', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '3 hours', NULL, 0, '{}'),
(10, 2, 3, '{"staging_url": "https://staging-dash.demo.com", "components": 15}', 'Dashboard with 15 widget components', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '1 day', NULL, 0, '{}'),
(11, 3, 2, '{"testflight": "TF_001", "biometrics_enabled": true}', 'iOS login with Face ID support', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '4 hours', NULL, 0, '{}'),
(12, 5, 3, '{"docker_repo": "registry.docker.com/acme/services", "compose_file": "docker-compose.prod.yml"}', 'Docker setup for all 5 microservices', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '2 days', NULL, 0, '{}'),
(13, 7, 2, '{"figma_url": "https://figma.com/proto/mobile-v3", "screens": 25}', 'Complete mobile redesign with new design system', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '5 hours', NULL, 0, '{}'),
(14, 9, 3, '{"interviews_completed": 10, "insights_doc": "user-research-findings.pdf"}', 'Synthesized findings with affinity mapping', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '1 day', NULL, 0, '{}'),
(15, 12, 2, '{"audit_report": "seo-audit-2026.pdf", "priority_fixes": 15}', 'Comprehensive SEO audit with 15 priority fixes', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '6 hours', NULL, 0, '{}'),
(16, 15, 3, '{"blog_urls": ["blog 1", "blog 2", "blog 3", "blog 4", "blog 5"]}', '5 launch blog posts with SEO optimization', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '8 hours', NULL, 0, '{}'),
-- Revision requested submissions
(17, 13, 2, '{"docs_url": "https://docs.staging.acme.com", "needs_diagrams": true}', 'API docs first draft, need more diagrams', 'revision_requested', 1, 'Please add sequence diagrams and improve the authentication section', NULL, NOW() - INTERVAL '3 days', NULL, 1, '{}'),
(18, 14, 3, '{"guide_md": "user-guide-draft.md", "screenshots": 20}', 'User guide with 20 screenshots, need to add troubleshooting section', 'revision_requested', 1, 'Add troubleshooting FAQ section and improve search functionality description', NULL, NOW() - INTERVAL '2 days', NULL, 1, '{}'),
-- More approved submissions
(19, 16, 2, '{"checkout_url": "https://shop.demo.com/checkout", "stripe_webhooks": true}', 'Full checkout with Stripe and tax calculation', 'approved', 1, 'Well tested, great error handling', 92, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', 0, '{}'),
(20, 17, 3, '{"apk_url": "flutter-app-debug.apk", "repo": "https://github.com/charlie/flutter-app"}', 'Cross-platform app with offline support', 'approved', 1, 'Excellent Flutter architecture and state management', 88, NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', 0, '{}'),
(21, 18, 2, '{"figma_prototype": "https://figma.com/proto/landing-v2", "responsive": true}', 'High-converting landing page with animations', 'approved', 2, 'Modern design, good CTA placement', 87, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', 1, '{}'),
-- Additional past submissions
(22, 8, 3, '{"icons_svg": 52, "figma_file": "icon-set-v1.fig", "sizes": ["16", "24", "32", "64"]}', '52 custom icons in multiple sizes', 'approved', 1, 'Clean, consistent icon style', 91, NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days', 0, '{}'),
(23, 10, 2, '{"calendar_url": "content-calendar-april.xlsx", "posts_planned": 30}', '30-day Twitter calendar with hashtags', 'approved', 1, 'Good variety of content types', 78, NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days', 0, '{}');

SELECT setval('task_submissions_id_seq', 23, true);

-- ============================================
-- TASK WATCHLIST (users watching tasks)
-- ============================================
\echo 'Seeding task watchlist...'

INSERT INTO task_watchlist (user_id, task_id, added_at) VALUES
(1, 1, NOW() - INTERVAL '5 days'),
(1, 5, NOW() - INTERVAL '4 days'),
(1, 7, NOW() - INTERVAL '3 days'),
(2, 1, NOW() - INTERVAL '4 days'),
(2, 2, NOW() - INTERVAL '3 days'),
(2, 16, NOW() - INTERVAL '2 days'),
(2, 19, NOW() - INTERVAL '1 day'),
(3, 2, NOW() - INTERVAL '4 days'),
(3, 5, NOW() - INTERVAL '3 days'),
(3, 6, NOW() - INTERVAL '2 days'),
(3, 17, NOW() - INTERVAL '1 day'),
(3, 21, NOW() - INTERVAL '12 hours'),
(4, 1, NOW() - INTERVAL '2 days'),
(4, 10, NOW() - INTERVAL '1 day'),
(5, 2, NOW() - INTERVAL '3 days'),
(5, 8, NOW() - INTERVAL '2 days'),
(5, 15, NOW() - INTERVAL '1 day');

-- ============================================
-- TREASURY STRATEGIES (5 yield strategies)
-- ============================================
\echo 'Seeding treasury strategies...'

INSERT INTO treasury_strategies (id, tenant_id, name, description, strategy_type, target_apy, risk_level, rules, parameters, active) VALUES
(1, 1, 'US Treasury Bills', 'Low-risk US Treasury bill ladder for capital preservation', 'conservative', 0.0450, 'very_low', '{"duration_days": 90, "auto_roll": true, "ladder_enabled": true}', '{"min_investment": 10000, "max_allocation": 0.4}', true),
(2, 1, 'Corporate Bond Fund', 'Investment-grade corporate bonds with stable yields', 'moderate', 0.0550, 'low', '{"credit_rating": "A", "duration_years": 3, "diversified": true}', '{"min_investment": 25000, "max_allocation": 0.3}', true),
(3, 1, 'Stablecoin Liquidity Pool', 'Provide liquidity for stablecoin pairs with yield farming', 'liquidity_pool', 0.1200, 'medium', '{"stablecoins": ["USDC", "USDT", "DAI"], "impermanent_loss_protection": true}', '{"min_investment": 5000, "max_allocation": 0.2, "protocol": "Curve"}', true),
(4, 1, 'DeFi Yield Farming', 'High-yield DeFi strategies with diversified protocols', 'yield_farming', 0.1800, 'high', '{"protocols": ["Aave", "Compound", "Yearn"], "rebalance_frequency": "weekly"}', '{"min_investment": 10000, "max_allocation": 0.15, "max_slippage": 0.01}', true),
(5, 1, 'Balanced Reserve', 'Mix of conservative and moderate strategies for steady growth', 'moderate', 0.0650, 'medium', '{"stocks_bond_ratio": "60/40", "rebalance_threshold": 0.05}', '{"min_investment": 50000, "max_allocation": 0.35}', true);

SELECT setval('treasury_strategies_id_seq', 5, true);

-- ============================================
-- TREASURY VAULTS (6 vaults - 3 tenants x 2 vaults)
-- ============================================
\echo 'Seeding treasury vaults...'

INSERT INTO treasury_vaults (id, tenant_id, name, vault_type, balance, currency, strategy_id, target_balance, minimum_balance, metadata, created_at) VALUES
-- Tenant 1 (ACME Corp) vaults
(1, 1, 'Operational Reserve', 'operational', 150000.00000000, 'USD', 1, 200000.00000000, 50000.00000000, '{"risk_profile": "conservative", "liquidity_needs": "high"}', NOW() - INTERVAL '60 days'),
(2, 1, 'Investment Pool', 'investment', 250000.00000000, 'USD', 5, 500000.00000000, 100000.00000000, '{"risk_profile": "moderate", "growth_target": "annual", "horizon_years": 3}', NOW() - INTERVAL '60 days'),
-- Tenant 2 (Demo Community) vaults
(3, 2, 'Community Treasury', 'reserve', 50000.00000000, 'USD', 2, 100000.00000000, 25000.00000000, '{"purpose": "community_funding", "governance": "token_vote"}', NOW() - INTERVAL '45 days'),
(4, 2, 'Growth Fund', 'investment', 30000.00000000, 'USD', 3, 75000.00000000, 10000.00000000, '{"purpose": "ecosystem_growth", "community_rewards": true}', NOW() - INTERVAL '45 days'),
-- Tenant 3 (Startup Inc) vaults
(5, 3, 'Startup Operating', 'operational', 15000.00000000, 'USD', 1, 30000.00000000, 5000.00000000, '{"stage": "seed", "runway_months": 12}', NOW() - INTERVAL '30 days'),
(6, 3, 'Launch Reserve', 'reserve', 25000.00000000, 'USD', 2, 50000.00000000, 10000.00000000, '{"purpose": "product_launch", "timeline_q3": true}', NOW() - INTERVAL '30 days');

SELECT setval('treasury_vaults_id_seq', 6, true);

-- ============================================
-- TREASURY ALLOCATIONS
-- ============================================
\echo 'Seeding treasury allocations...'

INSERT INTO treasury_allocations (id, vault_id, strategy_id, amount, allocation_date, end_date, current_value, yield_earned, performance, active) VALUES
-- Vault 1 allocations
(1, 1, 1, 100000.00000000, NOW() - INTERVAL '60 days', NOW() + INTERVAL '30 days', 102250.00000000, 2250.00000000, '{"apy_realized": 0.045, "period_days": 60}', true),
(2, 1, 2, 50000.00000000, NOW() - INTERVAL '45 days', NOW() + INTERVAL '45 days', 51250.00000000, 1250.00000000, '{"apy_realized": 0.055, "period_days": 45}', true),
-- Vault 2 allocations
(3, 2, 5, 150000.00000000, NOW() - INTERVAL '55 days', NOW() + INTERVAL '40 days', 155400.00000000, 5400.00000000, '{"apy_realized": 0.065, "period_days": 55}', true),
(4, 2, 3, 75000.00000000, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', 77250.00000000, 2250.00000000, '{"apy_realized": 0.12, "period_days": 30}', true),
(5, 2, 4, 25000.00000000, NOW() - INTERVAL '20 days', NOW() + INTERVAL '70 days', 25900.00000000, 900.00000000, '{"apy_realized": 0.18, "period_days": 20}', true),
-- Vault 3 allocations
(6, 3, 2, 35000.00000000, NOW() - INTERVAL '40 days', NOW() + INTERVAL '50 days', 35875.00000000, 875.00000000, '{"apy_realized": 0.055, "period_days": 40}', true),
(7, 3, 1, 15000.00000000, NOW() - INTERVAL '35 days', NOW() + INTERVAL '55 days', 15165.00000000, 165.00000000, '{"apy_realized": 0.045, "period_days": 35}', true),
-- Vault 4 allocations
(8, 4, 3, 20000.00000000, NOW() - INTERVAL '25 days', NOW() + INTERVAL '65 days', 20720.00000000, 720.00000000, '{"apy_realized": 0.12, "period_days": 25}', true),
(9, 4, 4, 10000.00000000, NOW() - INTERVAL '15 days', NOW() + INTERVAL '75 days', 10270.00000000, 270.00000000, '{"apy_realized": 0.18, "period_days": 15}', true),
-- Vault 5 allocations
(10, 5, 1, 10000.00000000, NOW() - INTERVAL '25 days', NOW() + INTERVAL '65 days', 10112.50000000, 112.50000000, '{"apy_realized": 0.045, "period_days": 25}', true),
(11, 5, 2, 5000.00000000, NOW() - INTERVAL '20 days', NOW() + INTERVAL '70 days', 5050.00000000, 50.00000000, '{"apy_realized": 0.055, "period_days": 20}', true),
-- Vault 6 allocations
(12, 6, 2, 15000.00000000, NOW() - INTERVAL '20 days', NOW() + INTERVAL '70 days', 15150.00000000, 150.00000000, '{"apy_realized": 0.055, "period_days": 20}', true),
(13, 6, 5, 10000.00000000, NOW() - INTERVAL '15 days', NOW() + INTERVAL '75 days', 10265.00000000, 265.00000000, '{"apy_realized": 0.065, "period_days": 15}', true);

SELECT setval('treasury_allocations_id_seq', 13, true);

-- ============================================
-- TREASURY TRANSACTIONS (40+ transactions)
-- ============================================
\echo 'Seeding treasury transactions...'

INSERT INTO treasury_transactions (id, vault_id, transaction_type, amount, balance_before, balance_after, status, reference_id, description, metadata, executed_at, created_at, created_by) VALUES
-- Vault 1 transactions (Operational Reserve)
(1, 1, 'deposit', 50000.00000000, 0.00000000, 50000.00000000, 'completed', 'DEP-001', 'Initial operational reserve funding', '{}', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', 1),
(2, 1, 'deposit', 75000.00000000, 50000.00000000, 125000.00000000, 'completed', 'DEP-002', 'Additional operational funding', '{}', NOW() - INTERVAL '58 days', NOW() - INTERVAL '58 days', 1),
(3, 1, 'allocation', 100000.00000000, 125000.00000000, 25000.00000000, 'completed', 'ALLOC-001', 'Allocated to Treasury Bills strategy', '{"strategy_id": 1}', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', 1),
(4, 1, 'yield', 2250.00000000, 100000.00000000, 102250.00000000, 'completed', 'YLD-001', 'Quarterly yield from Treasury Bills', '{"apy": 0.045, "period": "Q1"}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NULL),
(5, 1, 'allocation', 50000.00000000, 102250.00000000, 52250.00000000, 'completed', 'ALLOC-002', 'Allocated to Corporate Bond Fund', '{"strategy_id": 2}', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', 1),
(6, 1, 'withdrawal', 25000.00000000, 102250.00000000, 77250.00000000, 'completed', 'WDR-001', 'Operational expenses withdrawal', '{}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 1),
(7, 1, 'yield', 500.00000000, 52250.00000000, 52750.00000000, 'completed', 'YLD-002', 'Monthly yield from bonds', '{"apy": 0.055, "period": "monthly"}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NULL),
(8, 1, 'deposit', 30000.00000000, 77250.00000000, 107250.00000000, 'completed', 'DEP-003', 'Monthly revenue deposit', '{}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 1),

-- Vault 2 transactions (Investment Pool)
(9, 2, 'deposit', 100000.00000000, 0.00000000, 100000.00000000, 'completed', 'DEP-010', 'Initial investment pool funding', '{}', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', 1),
(10, 2, 'deposit', 100000.00000000, 100000.00000000, 200000.00000000, 'completed', 'DEP-011', 'Additional investment allocation', '{}', NOW() - INTERVAL '58 days', NOW() - INTERVAL '58 days', 1),
(11, 2, 'allocation', 150000.00000000, 200000.00000000, 50000.00000000, 'completed', 'ALLOC-010', 'Allocated to Balanced Reserve strategy', '{"strategy_id": 5}', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', 1),
(12, 2, 'yield', 2700.00000000, 150000.00000000, 152700.00000000, 'completed', 'YLD-010', 'Balanced Reserve yield', '{"apy": 0.065, "period": "Q1"}', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NULL),
(13, 2, 'allocation', 75000.00000000, 152700.00000000, 77700.00000000, 'completed', 'ALLOC-011', 'Allocated to Stablecoin LP', '{"strategy_id": 3}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 1),
(14, 2, 'yield', 750.00000000, 75000.00000000, 75750.00000000, 'completed', 'YLD-011', 'Stablecoin LP yield', '{"apy": 0.12, "period": "monthly"}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NULL),
(15, 2, 'allocation', 25000.00000000, 75750.00000000, 50750.00000000, 'completed', 'ALLOC-012', 'Allocated to DeFi Yield Farming', '{"strategy_id": 4}', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 1),
(16, 2, 'yield', 450.00000000, 25000.00000000, 25450.00000000, 'completed', 'YLD-012', 'DeFi farming yield', '{"apy": 0.18, "period": "20_days"}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NULL),
(17, 2, 'deposit', 50000.00000000, 50750.00000000, 100750.00000000, 'completed', 'DEP-012', 'Q2 investment contribution', '{}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 1),

-- Vault 3 transactions (Community Treasury)
(18, 3, 'deposit', 40000.00000000, 0.00000000, 40000.00000000, 'completed', 'DEP-020', 'Initial community treasury', '{}', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', 4),
(19, 3, 'deposit', 15000.00000000, 40000.00000000, 55000.00000000, 'completed', 'DEP-021', 'Community donation', '{}', NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days', 4),
(20, 3, 'allocation', 35000.00000000, 55000.00000000, 20000.00000000, 'completed', 'ALLOC-020', 'Corporate Bond allocation', '{"strategy_id": 2}', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', 4),
(21, 3, 'yield', 480.00000000, 35000.00000000, 35480.00000000, 'completed', 'YLD-020', 'Bond yield Q1', '{"apy": 0.055}', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NULL),
(22, 3, 'withdrawal', 5000.00000000, 55000.00000000, 50000.00000000, 'completed', 'WDR-020', 'Community grant payment', '{}', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', 4),
(23, 3, 'allocation', 15000.00000000, 50000.00000000, 35000.00000000, 'completed', 'ALLOC-021', 'Treasury Bills ladder', '{"strategy_id": 1}', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', 4),

-- Vault 4 transactions (Growth Fund)
(24, 4, 'deposit', 25000.00000000, 0.00000000, 25000.00000000, 'completed', 'DEP-030', 'Initial growth fund', '{}', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', 4),
(25, 4, 'deposit', 8000.00000000, 25000.00000000, 33000.00000000, 'completed', 'DEP-031', 'Protocol fees allocation', '{}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 4),
(26, 4, 'allocation', 20000.00000000, 33000.00000000, 13000.00000000, 'completed', 'ALLOC-030', 'Stablecoin LP strategy', '{"strategy_id": 3}', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', 4),
(27, 4, 'yield', 200.00000000, 20000.00000000, 20200.00000000, 'completed', 'YLD-030', 'LP yield', '{"apy": 0.12}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NULL),
(28, 4, 'allocation', 10000.00000000, 20200.00000000, 10200.00000000, 'completed', 'ALLOC-031', 'DeFi farming allocation', '{"strategy_id": 4}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 4),

-- Vault 5 transactions (Startup Operating)
(29, 5, 'deposit', 10000.00000000, 0.00000000, 10000.00000000, 'completed', 'DEP-040', 'Seed funding operational', '{}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 2),
(30, 5, 'deposit', 8000.00000000, 10000.00000000, 18000.00000000, 'completed', 'DEP-041', 'Extended runway funding', '{}', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', 2),
(31, 5, 'allocation', 10000.00000000, 18000.00000000, 8000.00000000, 'completed', 'ALLOC-040', 'Treasury Bills strategy', '{"strategy_id": 1}', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', 2),
(32, 5, 'withdrawal', 3000.00000000, 18000.00000000, 15000.00000000, 'completed', 'WDR-040', 'Server costs', '{}', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', 2),
(33, 5, 'allocation', 5000.00000000, 15000.00000000, 10000.00000000, 'completed', 'ALLOC-041', 'Corporate bond strategy', '{"strategy_id": 2}', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 2),
(34, 5, 'yield', 45.00000000, 10000.00000000, 10045.00000000, 'completed', 'YLD-040', 'Bond monthly yield', '{"apy": 0.055}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NULL),

-- Vault 6 transactions (Launch Reserve)
(35, 6, 'deposit', 20000.00000000, 0.00000000, 20000.00000000, 'completed', 'DEP-050', 'Product launch reserve', '{}', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 2),
(36, 6, 'deposit', 7000.00000000, 20000.00000000, 27000.00000000, 'completed', 'DEP-051', 'Investor addition', '{}', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', 2),
(37, 6, 'allocation', 15000.00000000, 27000.00000000, 12000.00000000, 'completed', 'ALLOC-050', 'Corporate bond strategy', '{"strategy_id": 2}', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 2),
(38, 6, 'yield', 125.00000000, 15000.00000000, 15125.00000000, 'completed', 'YLD-050', 'Bond yield', '{"apy": 0.055}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NULL),
(39, 6, 'allocation', 10000.00000000, 27000.00000000, 17000.00000000, 'completed', 'ALLOC-051', 'Balanced reserve strategy', '{"strategy_id": 5}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 2),
(40, 6, 'rebalance', 0.00000000, 25125.00000000, 25500.00000000, 'completed', 'RB-050', 'Quarterly portfolio rebalance', '{"allocations_adjusted": true}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 2),

-- Fee transactions
(41, 1, 'fee', 50.00000000, 107250.00000000, 107200.00000000, 'completed', 'FEE-001', 'Account maintenance fee', '{}', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL),
(42, 2, 'fee', 75.00000000, 100750.00000000, 100675.00000000, 'completed', 'FEE-002', 'Investment management fee', '{}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL);

SELECT setval('treasury_transactions_id_seq', 42, true);

-- ============================================
-- RE-ENABLE ROW LEVEL SECURITY
-- ============================================
SET session_replication_role = DEFAULT;

COMMIT;

\echo ''
\echo '==============================================='
\echo 'Treasury, Tasks, and Skills Seed Data Complete!'
\echo '==============================================='
\echo ''
\echo 'Task Categories: 13 (4 parent + 9 child categories)'
\echo 'Skills: 25 (linked to categories)'
\echo 'Tasks: 35 (various statuses)'
\echo 'Task Skills: 50+ skill-task associations'
\echo 'Task Submissions: 23 (pending, approved, rejected)'
\echo 'Task Watchlist: 17 entries'
\echo 'Treasury Strategies: 5 (conservative to aggressive)'
\echo 'Treasury Vaults: 6 (2 per tenant)'
\echo 'Treasury Allocations: 13'
\echo 'Treasury Transactions: 42'
\echo ''

-- ============================================
-- ROLLBACK SECTION
-- ============================================
-- To rollback this seed data, run:
-- BEGIN;
-- DELETE FROM treasury_transactions WHERE id >= 1;
-- DELETE FROM treasury_allocations WHERE id >= 1;
-- DELETE FROM treasury_vaults WHERE id >= 1;
-- DELETE FROM treasury_strategies WHERE id >= 1;
-- DELETE FROM task_watchlist WHERE task_id >= 1;
-- DELETE FROM task_submissions WHERE id >= 1;
-- DELETE FROM task_skills WHERE task_id >= 1;
-- DELETE FROM tasks WHERE id >= 1;
-- DELETE FROM skills WHERE id >= 1;
-- DELETE FROM task_categories WHERE id >= 1;
-- ALTER SEQUENCE treasury_transactions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE treasury_allocations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE treasury_vaults_id_seq RESTART WITH 1;
-- ALTER SEQUENCE treasury_strategies_id_seq RESTART WITH 1;
-- ALTER SEQUENCE task_submissions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tasks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE skills_id_seq RESTART WITH 1;
-- ALTER SEQUENCE task_categories_id_seq RESTART WITH 1;
-- COMMIT;
