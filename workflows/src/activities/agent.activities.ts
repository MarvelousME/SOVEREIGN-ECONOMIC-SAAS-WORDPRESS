import { Context } from '@temporalio/activity';
import { config } from '../config';
import { AgentExecutionRequest } from '../types';

export async function validateAgentPermissions(agentId: string, userId: string): Promise<boolean> {
  const response = await fetch(`${config.opa.url}/v1/data/agents/allow_execution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { agentId, userId },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OPA agent permission check failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result === true;
}

export async function allocateAgentResources(agentId: string, requirements: Record<string, any>): Promise<string> {
  const response = await fetch(`${config.services.agentRunner}/api/resources/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, requirements }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to allocate resources: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.allocationId;
}

export async function releaseAgentResources(allocationId: string): Promise<void> {
  const response = await fetch(`${config.services.agentRunner}/api/resources/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allocationId }),
  });
  
  if (!response.ok) {
    Context.current().log.warn(`Failed to release resources: ${allocationId}`);
  }
}

export async function loadAgentMemory(agentId: string): Promise<Record<string, any>> {
  const response = await fetch(`${config.qdrant.url}/collections/agent_memory/points/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.qdrant.apiKey && { 'api-key': config.qdrant.apiKey }),
    },
    body: JSON.stringify({
      filter: { must: [{ key: 'agent_id', match: { value: agentId } }] },
      limit: 100,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load agent memory: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result || [];
}

export async function executeAgent(
  request: AgentExecutionRequest,
  memory: Record<string, any>
): Promise<{ result: any; cost: number }> {
  const response = await fetch(`${config.services.agentRunner}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...request,
      memory,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Agent execution failed: ${error.message}`);
  }
  
  return response.json();
}

export async function storeResultsInMinIO(
  agentId: string,
  executionId: string,
  result: any
): Promise<string> {
  const response = await fetch(`${config.services.agentRunner}/api/results/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      executionId,
      result,
      bucket: config.minio.bucket,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to store results: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.objectKey;
}

export async function updateAgentMemory(
  agentId: string,
  executionId: string,
  newMemory: Record<string, any>
): Promise<void> {
  const response = await fetch(`${config.qdrant.url}/collections/agent_memory/points/upsert`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(config.qdrant.apiKey && { 'api-key': config.qdrant.apiKey }),
    },
    body: JSON.stringify({
      points: [{
        id: executionId,
        vector: newMemory.embedding || Array(384).fill(0),
        payload: {
          agent_id: agentId,
          execution_id: executionId,
          ...newMemory,
          timestamp: new Date().toISOString(),
        },
      }],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update agent memory: ${response.statusText}`);
  }
}

export async function recordAgentCosts(
  agentId: string,
  userId: string,
  cost: number,
  revenue: number
): Promise<void> {
  const response = await fetch(`${config.services.ledgerService}/api/transactions/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: [
        {
          userId,
          amount: -cost,
          type: 'agent_execution_cost',
          currency: 'UBI',
          metadata: { agentId },
        },
        {
          userId,
          amount: revenue,
          type: 'agent_execution_revenue',
          currency: 'UBI',
          metadata: { agentId },
        },
      ],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to record agent costs: ${response.statusText}`);
  }
}

export async function emitAgentCompletionEvent(
  agentId: string,
  executionId: string,
  success: boolean
): Promise<void> {
  const response = await fetch(`${config.services.agentRunner}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'agent.execution.completed',
      data: { agentId, executionId, success },
    }),
  });
  
  if (!response.ok) {
    Context.current().log.warn(`Failed to emit agent completion event`);
  }
}
