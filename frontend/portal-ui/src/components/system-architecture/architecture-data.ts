import type { Edge, Node } from '@xyflow/react';

export type SystemCategory = 'infra' | 'core' | 'platform' | 'edge' | 'data' | 'workflow' | 'trigger';

export type SystemNodeData = {
  label: string;
  sub?: string;
  category: SystemCategory;
  /** Default HTTP port or hint */
  port?: string;
};

const cat = (category: SystemCategory) => category;

export const initialNodes: Node<SystemNodeData>[] = [
  // Infra row
  { id: 'nats', type: 'system', position: { x: 80, y: 40 }, data: { label: 'NATS', sub: 'Messaging', category: cat('infra') } },
  { id: 'temporal', type: 'system', position: { x: 320, y: 40 }, data: { label: 'Temporal', sub: 'Workflows', category: cat('infra') } },
  { id: 'postgres', type: 'system', position: { x: 560, y: 40 }, data: { label: 'PostgreSQL', sub: 'OLTP', category: cat('data') } },
  { id: 'redis', type: 'system', position: { x: 800, y: 40 }, data: { label: 'Redis', sub: 'Cache / queues', category: cat('data') } },

  // Triggers (palette for automation entry points — drag to re-link)
  { id: 'trig-manual', type: 'system', position: { x: 40, y: 120 }, data: { label: 'Manual / UI', sub: 'Trigger: operator or portal', category: cat('trigger') } },
  { id: 'trig-schedule', type: 'system', position: { x: 220, y: 120 }, data: { label: 'Schedule', sub: 'Trigger: cron / Temporal schedule', category: cat('trigger') } },
  { id: 'trig-nats', type: 'system', position: { x: 400, y: 120 }, data: { label: 'NATS event', sub: 'Trigger: JetStream / core', category: cat('trigger') } },
  { id: 'trig-api', type: 'system', position: { x: 580, y: 120 }, data: { label: 'HTTP API', sub: 'Trigger: service starts workflow', category: cat('trigger') } },

  // Temporal workflow types (workflows/src/workflows — queue ubi-cms)
  { id: 'wf-ubi-distribution', type: 'system', position: { x: 40, y: 220 }, data: { label: 'ubiDistributionWorkflow', sub: '@temporalio · UBI', category: cat('workflow') } },
  { id: 'wf-payout', type: 'system', position: { x: 220, y: 220 }, data: { label: 'payoutWorkflow', sub: 'Treasury payout', category: cat('workflow') } },
  { id: 'wf-treasury-rebalance', type: 'system', position: { x: 400, y: 220 }, data: { label: 'treasuryRebalanceWorkflow', sub: 'Treasury', category: cat('workflow') } },
  { id: 'wf-treasury-compound', type: 'system', position: { x: 580, y: 220 }, data: { label: 'treasuryCompoundWorkflow', sub: 'Treasury', category: cat('workflow') } },
  { id: 'wf-task-expiration', type: 'system', position: { x: 760, y: 220 }, data: { label: 'taskExpirationWorkflow', sub: 'Tasks', category: cat('workflow') } },
  { id: 'wf-agent-execution', type: 'system', position: { x: 940, y: 220 }, data: { label: 'agentExecutionWorkflow', sub: 'Agents', category: cat('workflow') } },
  { id: 'wf-reputation-recalc', type: 'system', position: { x: 40, y: 320 }, data: { label: 'reputationRecalcWorkflow', sub: 'Reputation', category: cat('workflow') } },
  { id: 'wf-governance-exec', type: 'system', position: { x: 220, y: 320 }, data: { label: 'governanceExecutionWorkflow', sub: 'Governance', category: cat('workflow') } },
  { id: 'wf-referral-conversion', type: 'system', position: { x: 400, y: 320 }, data: { label: 'referralConversionWorkflow', sub: 'Referrals', category: cat('workflow') } },

  // Core services
  { id: 'api', type: 'system', position: { x: 80, y: 460 }, data: { label: 'API Gateway', sub: 'api/', category: cat('core'), port: 'varies' } },
  { id: 'ubi-engine', type: 'system', position: { x: 320, y: 460 }, data: { label: 'UBI Engine', sub: 'services/ubi-engine', category: cat('core') } },
  { id: 'workflows', type: 'system', position: { x: 560, y: 460 }, data: { label: 'Temporal Worker', sub: 'workflows/', category: cat('core') } },
  { id: 'ledger', type: 'system', position: { x: 800, y: 460 }, data: { label: 'Ledger', sub: 'ledger-service', category: cat('core') } },
  { id: 'notifications', type: 'system', position: { x: 1040, y: 460 }, data: { label: 'Notifications', sub: 'notifications-service', category: cat('core') } },

  // Platform
  { id: 'tasks', type: 'system', position: { x: 80, y: 640 }, data: { label: 'Task Marketplace', sub: 'task-marketplace', category: cat('platform') } },
  { id: 'rewards', type: 'system', position: { x: 320, y: 640 }, data: { label: 'Rewards Engine', sub: 'rewards-engine', category: cat('platform') } },
  { id: 'treasury', type: 'system', position: { x: 560, y: 640 }, data: { label: 'Treasury', sub: 'treasury-engine', category: cat('platform') } },
  { id: 'governance', type: 'system', position: { x: 800, y: 640 }, data: { label: 'Governance', sub: 'governance-service', category: cat('platform') } },
  { id: 'agent-runner', type: 'system', position: { x: 1040, y: 640 }, data: { label: 'Agent Runner', sub: 'agent-runner', category: cat('platform') } },

  { id: 'auth', type: 'system', position: { x: 80, y: 800 }, data: { label: 'Auth', sub: 'auth-service', category: cat('platform') } },
  { id: 'reputation', type: 'system', position: { x: 320, y: 800 }, data: { label: 'Reputation', sub: 'reputation-service', category: cat('platform') } },
  { id: 'referral', type: 'system', position: { x: 560, y: 800 }, data: { label: 'Referral', sub: 'referral-service', category: cat('platform') } },
  { id: 'compliance', type: 'system', position: { x: 800, y: 800 }, data: { label: 'Compliance', sub: 'compliance-engine', category: cat('platform') } },
  { id: 'vault', type: 'system', position: { x: 1040, y: 800 }, data: { label: 'Data Vault', sub: 'data-vault-service', category: cat('platform') } },

  // Edge / front
  { id: 'portal', type: 'system', position: { x: 320, y: 980 }, data: { label: 'Portal UI', sub: 'frontend/portal-ui', category: cat('edge') } },
  { id: 'wordpress', type: 'system', position: { x: 560, y: 980 }, data: { label: 'WordPress', sub: 'wordpress/', category: cat('edge') } },
];

/** Baseline nodes on the canvas — not removable with Delete/Backspace (palette nodes are deletable). */
export const canvasBaselineNodes: Node<SystemNodeData>[] = initialNodes.map((n) => ({
  ...n,
  deletable: false,
}));

export const initialEdges: Edge[] = [
  // Triggers → entry points
  { id: 'e-trig-manual-portal', source: 'trig-manual', target: 'portal', label: 'Operator / UI', animated: true },
  { id: 'e-trig-schedule-temporal', source: 'trig-schedule', target: 'temporal', label: 'Schedules', animated: true },
  { id: 'e-trig-nats-nats', source: 'trig-nats', target: 'nats', label: 'Event bus', animated: true },
  { id: 'e-trig-api-api', source: 'trig-api', target: 'api', label: 'Start workflow', animated: true },
  // Workflow types → worker (registered on ubi-cms queue)
  { id: 'e-wf-ubi-w', source: 'wf-ubi-distribution', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-payout-w', source: 'wf-payout', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-treb-w', source: 'wf-treasury-rebalance', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-tcmp-w', source: 'wf-treasury-compound', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-taskexp-w', source: 'wf-task-expiration', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-agent-w', source: 'wf-agent-execution', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-rep-w', source: 'wf-reputation-recalc', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-gov-w', source: 'wf-governance-exec', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-wf-ref-w', source: 'wf-referral-conversion', target: 'workflows', label: 'registered', animated: true },
  { id: 'e-temporal-ubi', source: 'temporal', target: 'ubi-engine', label: 'Temporal client', animated: true },
  { id: 'e-temporal-workflows', source: 'temporal', target: 'workflows', label: 'Worker queue ubi-cms', animated: true },
  { id: 'e-temporal-agent', source: 'temporal', target: 'agent-runner', label: 'agent-execution', animated: true },
  { id: 'e-pg-core', source: 'postgres', target: 'ubi-engine', label: 'DB', animated: true },
  { id: 'e-pg-ledger', source: 'postgres', target: 'ledger', label: 'DB', animated: true },
  { id: 'e-workflows-ubi', source: 'workflows', target: 'ubi-engine', label: 'HTTP activities', animated: true },
  { id: 'e-workflows-ledger', source: 'workflows', target: 'ledger', label: 'HTTP', animated: true },
  { id: 'e-workflows-notify', source: 'workflows', target: 'notifications', label: 'HTTP', animated: true },
  { id: 'e-ubi-nats', source: 'ubi-engine', target: 'nats', label: 'Events', animated: true },
  { id: 'e-task-nats', source: 'tasks', target: 'nats', label: 'Events', animated: true },
  { id: 'e-rewards-nats', source: 'rewards', target: 'nats', label: 'Events', animated: true },
  { id: 'e-notify-nats', source: 'notifications', target: 'nats', label: 'Subscribe', animated: true },
  { id: 'e-agent-nats', source: 'agent-runner', target: 'nats', label: 'JetStream', animated: true },
  { id: 'e-api-portal', source: 'api', target: 'portal', label: 'REST', animated: true },
  { id: 'e-portal-api', source: 'portal', target: 'api', label: 'Calls', animated: true },
  { id: 'e-wp-api', source: 'wordpress', target: 'api', label: 'Optional', animated: true },
  { id: 'e-redis-core', source: 'redis', target: 'ubi-engine', label: 'Cache', animated: true },
];

/** Documented baseline edge ids (anything else is user-proposed wiring). */
export const BASELINE_EDGE_IDS = new Set(initialEdges.map((e) => e.id));

/** Default map node ids (palette-added nodes use `ext-` prefix). */
export const BASELINE_NODE_IDS = new Set(initialNodes.map((n) => n.id));
