import config from '../config';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  apiCallCost: number;
  inputTokenCost: number;
  outputTokenCost: number;
  computeCost: number;
  storageCost: number;
  totalCost: number;
}

export interface CostTrackerState {
  apiCalls: number;
  apiCallDetails: Array<{
    provider: string;
    timestamp: Date;
    cost: number;
  }>;
  tokenUsage: TokenUsage;
  computeTimeMs: number;
  storageBytes: number;
}

export class CostTracker {
  private state: CostTrackerState;
  private startTime: Date;

  constructor() {
    this.reset();
    this.startTime = new Date();
  }

  reset(): void {
    this.state = {
      apiCalls: 0,
      apiCallDetails: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      computeTimeMs: 0,
      storageBytes: 0,
    };
    this.startTime = new Date();
  }

  getState(): CostTrackerState {
    return { ...this.state };
  }

  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  incrementApiCalls(provider: string = 'custom'): void {
    this.state.apiCalls++;
    const apiCallCost = this.getApiCallCost(provider);
    this.state.apiCallDetails.push({
      provider,
      timestamp: new Date(),
      cost: apiCallCost,
    });
  }

  addApiCalls(count: number, provider: string = 'custom'): void {
    this.state.apiCalls += count;
    const apiCallCost = this.getApiCallCost(provider) * count;
    this.state.apiCallDetails.push({
      provider,
      timestamp: new Date(),
      cost: apiCallCost,
    });
  }

  addTokens(inputTokens: number, outputTokens: number, model?: string): void {
    this.state.tokenUsage.inputTokens += inputTokens;
    this.state.tokenUsage.outputTokens += outputTokens;
    this.state.tokenUsage.totalTokens += inputTokens + outputTokens;
  }

  setComputeTime(durationMs: number): void {
    this.state.computeTimeMs = durationMs;
  }

  addStorageBytes(bytes: number): void {
    this.state.storageBytes += bytes;
  }

  setStorageBytes(bytes: number): void {
    this.state.storageBytes = bytes;
  }

  private getApiCallCost(provider: string): number {
    return config.pricing.apiCallCosts[provider as keyof typeof config.pricing.apiCallCosts] || 0;
  }

  private getModelPricing(modelName: string): { inputTokenCost: number; outputTokenCost: number; apiCallCost: number } {
    const modelKey = modelName in config.pricing.models ? modelName : 'default';
    return config.pricing.models[modelKey as keyof typeof config.pricing.models] || config.pricing.models['default'];
  }

  calculateCost(model?: string): CostBreakdown {
    const inputTokenCost = this.calculateTokenCost(
      this.state.tokenUsage.inputTokens,
      'input',
      model
    );
    const outputTokenCost = this.calculateTokenCost(
      this.state.tokenUsage.outputTokens,
      'output',
      model
    );
    const apiCallCost = this.calculateApiCallCost();
    const computeCost = this.calculateComputeCost();
    const storageCost = this.calculateStorageCost();

    return {
      apiCallCost,
      inputTokenCost,
      outputTokenCost,
      computeCost,
      storageCost,
      totalCost: apiCallCost + inputTokenCost + outputTokenCost + computeCost + storageCost,
    };
  }

  private calculateTokenCost(tokens: number, type: 'input' | 'output', model?: string): number {
    if (tokens === 0) return 0;
    const pricing = model ? this.getModelPricing(model) : config.pricing.models['default'];
    const costPerMillion = type === 'input' ? pricing.inputTokenCost : pricing.outputTokenCost;
    return (tokens / 1_000_000) * costPerMillion;
  }

  private calculateApiCallCost(): number {
    return this.state.apiCallDetails.reduce((sum, call) => sum + call.cost, 0);
  }

  private calculateComputeCost(): number {
    return (this.state.computeTimeMs / 1000) * config.pricing.computeCostPerSecond;
  }

  private calculateStorageCost(): number {
    if (this.state.storageBytes === 0) return 0;
    const gbSeconds = (this.state.storageBytes / (1024 * 1024 * 1024)) * (this.state.computeTimeMs / 1000);
    return gbSeconds * config.pricing.storageCostPerGBPerDay / 86400;
  }

  getCostSummary(model?: string): {
    totalCost: number;
    costBreakdown: CostBreakdown;
    apiCallsCount: number;
    tokensUsed: number;
    computeTimeMs: number;
  } {
    const costBreakdown = this.calculateCost(model);
    return {
      totalCost: costBreakdown.totalCost,
      costBreakdown,
      apiCallsCount: this.state.apiCalls,
      tokensUsed: this.state.tokenUsage.totalTokens,
      computeTimeMs: this.state.computeTimeMs,
    };
  }
}

export const costTracker = new CostTracker();

export default CostTracker;
