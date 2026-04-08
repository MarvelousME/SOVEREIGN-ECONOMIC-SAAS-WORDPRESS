import { v4 as uuidv4 } from 'uuid';
import {
  AgentChainComplianceOutput,
  AgentChainResearchOutput,
  AgentChainStageResult,
  AgentChainStageType,
  AgentChainStrategyOutput,
  CampaignAgentChainRun,
} from '../types';

export interface CampaignAgentChainInput {
  goal: string;
  channels: string[];
  locale?: string;
}

export function getAgentChainStages(): AgentChainStageType[] {
  return ['research', 'strategy', 'compliance'];
}

export class CampaignAgentChainService {
  async runChain(input: {
    tenantId: string;
    campaignId: string;
    createdBy: string;
    payload: CampaignAgentChainInput;
  }): Promise<CampaignAgentChainRun> {
    const stages: AgentChainStageResult[] = [];

    for (const stage of getAgentChainStages()) {
      stages.push(this.executeStage(stage, input.payload));
    }

    return {
      runId: uuidv4(),
      campaignId: input.campaignId,
      tenantId: input.tenantId,
      input: input.payload,
      stages,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
  }

  private executeStage(stage: AgentChainStageType, payload: CampaignAgentChainInput): AgentChainStageResult {
    const startedAt = new Date().toISOString();
    let output: AgentChainResearchOutput | AgentChainStrategyOutput | AgentChainComplianceOutput;

    if (stage === 'research') {
      output = this.buildResearchOutput(payload);
    } else if (stage === 'strategy') {
      output = this.buildStrategyOutput(payload);
    } else {
      output = this.buildComplianceOutput(payload);
    }

    return {
      stage,
      status: 'success',
      output,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  private buildResearchOutput(payload: CampaignAgentChainInput): AgentChainResearchOutput {
    return {
      audienceInsights: [
        `Primary campaign goal: ${payload.goal}`,
        `Primary channels: ${payload.channels.join(', ')}`,
      ],
      competitorSignals: [
        `Benchmark messaging against top performers in ${payload.channels[0] || 'digital'} channel`,
      ],
    };
  }

  private buildStrategyOutput(payload: CampaignAgentChainInput): AgentChainStrategyOutput {
    return {
      messagingPillars: [
        `Lead with campaign objective: ${payload.goal}`,
        'Support claims with concrete outcomes and proof points',
      ],
      channelPlan: payload.channels.map((channel) => `Publish and optimize for ${channel}`),
    };
  }

  private buildComplianceOutput(payload: CampaignAgentChainInput): AgentChainComplianceOutput {
    return {
      requiredDisclosures: ['Affiliate relationship disclosure', 'Privacy and tracking notice'],
      policyChecks: [
        `Locale policy baseline: ${payload.locale || 'en-US'}`,
        'Verify ad-platform claim and disclosure policy conformance',
      ],
    };
  }
}
