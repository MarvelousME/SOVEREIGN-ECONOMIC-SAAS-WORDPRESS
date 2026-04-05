import { config } from '../config';
import { GovernanceProposal } from '../types';

export async function getProposal(proposalId: string): Promise<GovernanceProposal> {
  const response = await fetch(`${config.services.governanceService}/api/proposals/${proposalId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch proposal: ${response.statusText}`);
  }
  
  return response.json();
}

export async function verifyQuorum(proposalId: string): Promise<boolean> {
  const response = await fetch(`${config.services.governanceService}/api/proposals/${proposalId}/verify-quorum`);
  
  if (!response.ok) {
    throw new Error(`Failed to verify quorum: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.valid;
}

export async function executeProposalAction(action: Record<string, any>): Promise<void> {
  const response = await fetch(`${config.services.governanceService}/api/proposals/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to execute proposal action: ${response.statusText}`);
  }
}

export async function updateSystemConfig(config: Record<string, any>): Promise<void> {
  const response = await fetch(`${config.services.governanceService}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update system config: ${response.statusText}`);
  }
}

export async function emitExecutionEvent(proposalId: string, success: boolean): Promise<void> {
  const response = await fetch(`${config.services.governanceService}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'proposal.executed',
      data: { proposalId, success },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to emit execution event: ${response.statusText}`);
  }
}

export async function requestHumanApproval(proposalId: string, reason: string): Promise<boolean> {
  // This would integrate with a notification/approval system
  const response = await fetch(`${config.services.governanceService}/api/proposals/${proposalId}/request-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to request approval: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.approved;
}
