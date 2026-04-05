import { proxyActivities, ApplicationFailure, defineQuery, setHandler } from '@temporalio/workflow';
import type * as activities from '../activities/agent.activities';
import { DEFAULT_RETRY_POLICY, AgentExecutionRequest, WorkflowStatus } from '../types';

const {
  validateAgentPermissions,
  allocateAgentResources,
  releaseAgentResources,
  loadAgentMemory,
  executeAgent,
  storeResultsInMinIO,
  updateAgentMemory,
  recordAgentCosts,
  emitAgentCompletionEvent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '15m',
  retry: DEFAULT_RETRY_POLICY,
});

export const statusQuery = defineQuery<WorkflowStatus>('status');

export async function agentExecutionWorkflow(request: AgentExecutionRequest): Promise<{
  success: boolean;
  resultKey?: string;
  cost: number;
}> {
  let currentStep = 'validating';
  let allocationId: string | null = null;

  setHandler(statusQuery, () => ({ state: 'running', currentStep }));

  try {
    // Step 1: Validate agent permissions (OPA)
    const allowed = await validateAgentPermissions(request.agentId, request.userId);
    if (!allowed) {
      throw ApplicationFailure.create({
        message: 'Agent execution not permitted',
        nonRetryable: true,
      });
    }

    // Step 2: Allocate resources
    currentStep = 'allocating_resources';
    allocationId = await allocateAgentResources(request.agentId, {
      timeout: request.timeout,
      maxCost: request.maxCost,
    });

    // Step 3: Load agent memory from Qdrant
    currentStep = 'loading_memory';
    const memory = await loadAgentMemory(request.agentId);

    // Step 4: Execute agent code
    currentStep = 'executing_agent';
    const executionResult = await executeAgent(request, memory);

    // Step 5: Store results in MinIO
    currentStep = 'storing_results';
    const resultKey = await storeResultsInMinIO(
      request.agentId,
      request.id,
      executionResult.result
    );

    // Step 6: Update memory
    currentStep = 'updating_memory';
    await updateAgentMemory(request.agentId, request.id, {
      lastExecution: new Date().toISOString(),
      result: executionResult.result,
    });

    // Step 7: Record costs/revenue in ledger
    currentStep = 'recording_costs';
    await recordAgentCosts(
      request.agentId,
      request.userId,
      executionResult.cost,
      0 // Revenue logic to be implemented
    );

    // Step 8: Emit completion event
    currentStep = 'emitting_event';
    await emitAgentCompletionEvent(request.agentId, request.id, true);

    // Release resources
    if (allocationId) {
      await releaseAgentResources(allocationId);
    }

    currentStep = 'completed';
    return {
      success: true,
      resultKey,
      cost: executionResult.cost,
    };
  } catch (error) {
    // Cleanup: release resources
    if (allocationId) {
      try {
        await releaseAgentResources(allocationId);
      } catch {}
    }

    await emitAgentCompletionEvent(request.agentId, request.id, false);

    throw ApplicationFailure.create({
      message: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
      nonRetryable: false,
    });
  }
}
