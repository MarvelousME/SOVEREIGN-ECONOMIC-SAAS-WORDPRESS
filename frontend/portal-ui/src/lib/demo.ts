/**
 * Demo Mode
 *
 * When the logged-in user's username is "demo", every screen uses static
 * mock data instead of hitting the live API.  This lets stakeholders
 * explore the full UI without a running backend.
 *
 * All mock datasets live here so they are easy to update in one place.
 */

import { getStoredUser } from './auth';
import type { Agent, MarketplaceApp, NotificationRow, Reward, Task, TreasuryStrategy } from './api';

export const DEMO_USERNAME = 'demo';
export const DEMO_PASSWORD = 'Demo@Platform1';

/** Quick-login personas for local dev (password matches api/dev-seed.sql + dev-patch.sql). */
export const DEV_PERSONAS = [
  { id: 'subscriber', label: 'Subscriber (demo)', username: 'demo', password: DEMO_PASSWORD, hint: 'Daily UBI + tasks' },
  { id: 'alice', label: 'Subscriber (Alice)', username: 'alice', password: 'Admin@123456', hint: 'Plain subscriber' },
  { id: 'moderator', label: 'Moderator', username: 'moduser', password: 'Admin@123456', hint: 'Task verify + moderation' },
  { id: 'developer', label: 'Developer', username: 'developer', password: 'Admin@123456', hint: 'Publish apps, drafts' },
  { id: 'admin', label: 'Admin', username: 'admin', password: 'Admin@123456', hint: 'Full access' },
] as const;

/** Returns true when the current session belongs to the demo account. */
export function isDemoUser(): boolean {
  const user = getStoredUser();
  return user?.username === DEMO_USERNAME;
}

// ─── UBI ────────────────────────────────────────────────────────────────────

export const DEMO_UBI_BALANCE = { balance: 2_450, currency: 'UBI' };

export const DEMO_UBI_HISTORY: Reward[] = [
  { id: 1, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-27T08:00:00Z' },
  { id: 2, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-26T08:00:00Z' },
  { id: 3, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-25T08:00:00Z' },
  { id: 4, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-24T08:00:00Z' },
  { id: 5, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-23T08:00:00Z' },
  { id: 6, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-22T08:00:00Z' },
  { id: 7, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-21T08:00:00Z' },
];

export const DEMO_PLATFORM_STATS = {
  active_users: 12_480,
  total_ubi_distributed: 1_248_000,
  total_claims: 87_360,
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const DEMO_TASKS: Task[] = [
  { id: 1, title: 'Moderate Community Posts', description: 'Review 50 flagged posts and classify them according to platform guidelines. Requires good judgment.', category: 'Moderation', difficulty: 'easy', reward_amount: 25, reward_currency: 'UBI', max_participants: 20, current_participants: 8, status: 'active', deadline: '2024-02-10T23:59:59Z', created_at: '2024-01-20T00:00:00Z', proof_requirements: 'Screenshots of reviewed posts with your classifications.' },
  { id: 2, title: 'Translate Policy Document', description: 'Translate the UBI Platform Terms of Service from English to Spanish. Must be fluent in both languages.', category: 'Translation', difficulty: 'medium', reward_amount: 150, reward_currency: 'UBI', max_participants: 3, current_participants: 1, status: 'active', deadline: '2024-02-15T23:59:59Z', created_at: '2024-01-18T00:00:00Z', proof_requirements: 'Submit the completed translated document.' },
  { id: 3, title: 'Annotate ML Training Data', description: 'Label 1000 images for our computer vision model. Detailed labeling guide provided. Accuracy > 95% required.', category: 'Data', difficulty: 'medium', reward_amount: 200, reward_currency: 'UBI', max_participants: 10, current_participants: 4, status: 'active', deadline: '2024-02-20T23:59:59Z', created_at: '2024-01-15T00:00:00Z', proof_requirements: 'Submit completed annotation file via provided tool.' },
  { id: 4, title: 'Audit Smart Contract', description: 'Security audit of a Solidity ERC-20 token contract. Must have experience with Solidity and common vulnerabilities.', category: 'Security', difficulty: 'expert', reward_amount: 1000, reward_currency: 'UBI', max_participants: 2, current_participants: 0, status: 'active', deadline: '2024-02-28T23:59:59Z', created_at: '2024-01-10T00:00:00Z', proof_requirements: 'Submit detailed audit report with findings and recommendations.' },
  { id: 5, title: 'Design Social Media Graphics', description: 'Create a set of 10 social media graphics for the UBI Platform launch campaign. Canva or Figma.', category: 'Design', difficulty: 'easy', reward_amount: 80, reward_currency: 'UBI', max_participants: 5, current_participants: 5, status: 'active', deadline: '2024-02-05T23:59:59Z', created_at: '2024-01-22T00:00:00Z', proof_requirements: 'Share Figma/Canva link with all 10 graphics.' },
  { id: 6, title: 'Write Technical Blog Post', description: 'Write a 1500-word technical blog post explaining how UBI can be implemented using blockchain technology.', category: 'Writing', difficulty: 'hard', reward_amount: 300, reward_currency: 'UBI', max_participants: 5, current_participants: 2, status: 'active', deadline: '2024-02-12T23:59:59Z', created_at: '2024-01-19T00:00:00Z', proof_requirements: 'Submit Google Docs link with the completed article.' },
];

// ─── Treasury ────────────────────────────────────────────────────────────────

export const DEMO_TREASURY_BALANCE = { balance: 5_820.50, currency: 'UBI' };

export const DEMO_TREASURY_STRATEGIES: TreasuryStrategy[] = [
  { id: 1, name: 'Stable Yield', protocol: 'Aave V3', apy: 5.2, risk_level: 'low', allocation: 40, status: 'active' },
  { id: 2, name: 'Liquidity Pool', protocol: 'Uniswap V3', apy: 8.7, risk_level: 'medium', allocation: 35, status: 'active' },
  { id: 3, name: 'Governance Staking', protocol: 'Compound', apy: 6.1, risk_level: 'low', allocation: 25, status: 'active' },
];

export const DEMO_TREASURY_YIELD = {
  balance: 5_820.50,
  currency: 'UBI',
  current_apy: 6.5,
  estimated_annual_yield: 378.33,
};

export const DEMO_TREASURY_TRANSACTIONS: Reward[] = [
  { id: 10, amount: 500, currency: 'UBI', type: 'treasury_deposit', source_type: 'manual', status: 'completed', created_at: '2024-01-25T10:00:00Z' },
  { id: 11, amount: -200, currency: 'UBI', type: 'treasury_withdrawal', source_type: 'manual', status: 'completed', created_at: '2024-01-22T14:30:00Z' },
  { id: 12, amount: 1000, currency: 'UBI', type: 'treasury_deposit', source_type: 'manual', status: 'completed', created_at: '2024-01-18T09:00:00Z' },
  { id: 13, amount: 37.50, currency: 'UBI', type: 'yield_earned', source_type: 'protocol', status: 'completed', created_at: '2024-01-15T00:00:00Z' },
  { id: 14, amount: -500, currency: 'UBI', type: 'treasury_withdrawal', source_type: 'manual', status: 'completed', created_at: '2024-01-10T11:00:00Z' },
  { id: 15, amount: 35.80, currency: 'UBI', type: 'yield_earned', source_type: 'protocol', status: 'completed', created_at: '2024-01-01T00:00:00Z' },
];

// ─── Rewards ─────────────────────────────────────────────────────────────────

export const DEMO_REWARD_BALANCE = { balance: 1_875, currency: 'UBI' };

export const DEMO_REWARD_HISTORY: Reward[] = [
  { id: 20, amount: 300, currency: 'UBI', type: 'task_reward', source_type: 'task', source_id: 6, status: 'completed', created_at: '2024-01-27T12:00:00Z' },
  { id: 21, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-27T08:00:00Z' },
  { id: 22, amount: 150, currency: 'UBI', type: 'task_reward', source_type: 'task', source_id: 2, status: 'completed', created_at: '2024-01-26T15:00:00Z' },
  { id: 23, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-26T08:00:00Z' },
  { id: 24, amount: 25, currency: 'UBI', type: 'task_reward', source_type: 'task', source_id: 1, status: 'completed', created_at: '2024-01-25T18:00:00Z' },
  { id: 25, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-25T08:00:00Z' },
  { id: 26, amount: 200, currency: 'UBI', type: 'task_reward', source_type: 'task', source_id: 3, status: 'completed', created_at: '2024-01-24T20:00:00Z' },
  { id: 27, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-24T08:00:00Z' },
  { id: 28, amount: 80, currency: 'UBI', type: 'task_reward', source_type: 'task', source_id: 5, status: 'completed', created_at: '2024-01-23T16:00:00Z' },
  { id: 29, amount: 100, currency: 'UBI', type: 'ubi_distribution', source_type: 'ubi_engine', status: 'completed', created_at: '2024-01-23T08:00:00Z' },
];

// ─── Agents ──────────────────────────────────────────────────────────────────

export const DEMO_AGENTS: Agent[] = [
  { id: 'agt-001', name: 'SentimentBot', description: 'Analyzes text sentiment for user content moderation and feedback classification.', capability: 'Data Analysis', version: '2.1.0', status: 'active', price_per_call: 5, pricing_model: 'per_call', total_calls: 12840, success_rate: 98.4, created_at: '2023-06-01T00:00:00Z' },
  { id: 'agt-002', name: 'TranslateAgent', description: 'Professional document translation across 45 languages with context preservation.', capability: 'Content', version: '1.4.2', status: 'active', price_per_call: 8, pricing_model: 'per_call', total_calls: 4210, success_rate: 96.1, created_at: '2023-07-15T00:00:00Z' },
  { id: 'agt-003', name: 'TreasuryAnalyzer', description: 'Analyzes treasury data and generates risk reports with yield recommendations.', capability: 'Finance', version: '3.0.1', status: 'active', price_per_call: 20, pricing_model: 'per_call', total_calls: 890, success_rate: 99.2, created_at: '2023-08-01T00:00:00Z' },
  { id: 'agt-004', name: 'CodeReviewer', description: 'Automated code review for security vulnerabilities, performance, and best practices.', capability: 'Code', version: '1.0.0', status: 'active', price_per_call: 15, pricing_model: 'per_call', total_calls: 230, success_rate: 91.3, created_at: '2023-10-01T00:00:00Z' },
  { id: 'agt-005', name: 'FraudDetector', description: 'Detects suspicious account activity and flags potential fraud patterns in real time.', capability: 'Security', version: '2.2.0', status: 'active', price_per_call: 3, pricing_model: 'per_call', total_calls: 85400, success_rate: 97.8, created_at: '2023-05-01T00:00:00Z' },
  { id: 'agt-006', name: 'ResearchSummarizer', description: 'Summarizes academic papers and policy documents with key takeaway extraction.', capability: 'Research', version: '1.1.0', status: 'inactive', price_per_call: 10, pricing_model: 'per_call', total_calls: 540, success_rate: 94.4, created_at: '2023-09-01T00:00:00Z' },
];

// ─── Overview activity feed ───────────────────────────────────────────────────

export const DEMO_ACTIVITY = [
  { id: 'a1', type: 'ubi_claim',        label: 'Claimed daily UBI',              amount: '+100 UBI',  time: '2m ago',  color: 'text-blue-400' },
  { id: 'a2', type: 'task_completed',   label: 'Completed: Write Technical Blog', amount: '+300 UBI',  time: '1h ago',  color: 'text-green-400' },
  { id: 'a3', type: 'task_completed',   label: 'Completed: Translate Policy Doc', amount: '+150 UBI',  time: '2h ago',  color: 'text-green-400' },
  { id: 'a4', type: 'treasury_yield',   label: 'Yield earned from Aave V3',       amount: '+18.40 UBI', time: '6h ago', color: 'text-purple-400' },
  { id: 'a5', type: 'ubi_claim',        label: 'Claimed daily UBI',              amount: '+100 UBI',  time: '1d ago',  color: 'text-blue-400' },
  { id: 'a6', type: 'task_applied',     label: 'Applied: Annotate ML Data',       amount: '200 UBI pending', time: '1d ago', color: 'text-yellow-400' },
];

// ─── Analytics chart data ─────────────────────────────────────────────────────

export const DEMO_MONTHLY_UBI = [
  { month: 'Aug', distributed: 84_000, claims: 840 },
  { month: 'Sep', distributed: 102_000, claims: 1020 },
  { month: 'Oct', distributed: 128_000, claims: 1280 },
  { month: 'Nov', distributed: 154_000, claims: 1540 },
  { month: 'Dec', distributed: 188_000, claims: 1880 },
  { month: 'Jan', distributed: 248_000, claims: 2480 },
];

export const DEMO_WEEKLY_TASKS = [
  { week: 'W1', completed: 310, total: 420, rate: 73.8 },
  { week: 'W2', completed: 390, total: 480, rate: 81.3 },
  { week: 'W3', completed: 430, total: 520, rate: 82.7 },
  { week: 'W4', completed: 510, total: 580, rate: 87.9 },
  { week: 'W5', completed: 560, total: 620, rate: 90.3 },
  { week: 'W6', completed: 490, total: 550, rate: 89.1 },
  { week: 'W7', completed: 620, total: 660, rate: 93.9 },
  { week: 'W8', completed: 680, total: 720, rate: 94.4 },
];

export const DEMO_MARKETPLACE_APPS: MarketplaceApp[] = [
  { id: 1, slug: 'ubi-insights', name: 'UBI Insights', description: 'Analytics widgets.', publisher_id: 1, publisher_username: 'developer', category: 'analytics', version: '1.2.0', status: 'published', manifest: { entry: '/widgets/insights' }, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-27T00:00:00Z' },
  { id: 2, slug: 'task-boost', name: 'Task Boost', description: 'Prioritize tasks.', publisher_id: 1, publisher_username: 'developer', category: 'productivity', version: '0.9.1', status: 'published', manifest: { entry: '/boost' }, created_at: '2024-01-21T00:00:00Z', updated_at: '2024-01-26T00:00:00Z' },
  { id: 3, slug: 'draft-app', name: 'Draft Extension', description: 'Work in progress.', publisher_id: 1, publisher_username: 'developer', category: 'general', version: '0.0.1', status: 'draft', manifest: {}, created_at: '2024-01-22T00:00:00Z', updated_at: '2024-01-22T00:00:00Z' },
];

export const DEMO_NOTIFICATIONS: NotificationRow[] = [
  { id: 1, user_id: 0, title: 'Welcome to UBI Platform', body: 'Your account is ready.', type: 'info', read: false, metadata: {}, created_at: '2024-01-27T10:00:00Z' },
  { id: 2, user_id: 0, title: 'Daily UBI available', body: 'Claim your distribution from the UBI page.', type: 'info', read: true, metadata: {}, created_at: '2024-01-27T08:00:00Z' },
];

export const DEMO_AGENT_EXECUTIONS = [
  { id: 'ex001', agent_id: 'agt-001', agent_name: 'SentimentBot', input: '"Great platform!"', output: 'Positive (0.94)', duration_ms: 312, cost: 5, status: 'success' as const, created_at: '2024-01-27T14:35:00Z' },
  { id: 'ex002', agent_id: 'agt-005', agent_name: 'FraudDetector', input: 'userId: u003', output: 'Flagged — unusual login frequency', duration_ms: 88, cost: 3, status: 'success' as const, created_at: '2024-01-27T14:00:00Z' },
  { id: 'ex003', agent_id: 'agt-002', agent_name: 'TranslateAgent', input: 'UBI policy paragraph (EN)', output: 'Translated to Swahili (96%)', duration_ms: 920, cost: 8, status: 'success' as const, created_at: '2024-01-27T11:10:00Z' },
  { id: 'ex004', agent_id: 'agt-004', agent_name: 'CodeReviewer', input: 'auth middleware PR #42', output: '3 issues found (1 critical)', duration_ms: 2200, cost: 15, status: 'success' as const, created_at: '2024-01-27T09:30:00Z' },
  { id: 'ex005', agent_id: 'agt-003', agent_name: 'TreasuryAnalyzer', input: 'Portfolio snapshot', output: 'Risk: LOW — yield 6.4%', duration_ms: 1480, cost: 20, status: 'success' as const, created_at: '2024-01-27T09:05:00Z' },
];
