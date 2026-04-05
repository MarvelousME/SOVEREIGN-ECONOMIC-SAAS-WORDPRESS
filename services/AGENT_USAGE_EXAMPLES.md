# AI Agent Runtime - Usage Examples

## Table of Contents

- [Creating an Agent](#creating-an-agent)
- [Deploying an Agent](#deploying-an-agent)
- [Agent Code Examples](#agent-code-examples)
- [Monitoring Agents](#monitoring-agents)
- [Integration Examples](#integration-examples)

## Creating an Agent

### Example 1: Simple Task Automation Agent

```bash
curl -X POST http://localhost:3010/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Report Generator",
    "description": "Generates daily reports from various data sources",
    "type": "task_automation",
    "version": "1.0.0",
    "code": "async function main() { const report = await generateReport(input.sources); await storage.upload(\"report.json\", Buffer.from(JSON.stringify(report))); return { success: true, reportId: report.id }; }",
    "triggers": [
      {
        "type": "schedule",
        "config": { "cron": "0 9 * * *" }
      }
    ],
    "permissions": ["read:data", "write:storage"],
    "resourceLimits": {
      "maxCpuCores": 1,
      "maxMemoryMB": 512,
      "maxStorageMB": 1024,
      "maxApiCallsPerMinute": 60,
      "maxTokensPerDay": 50000,
      "maxCostPerDay": 5
    },
    "environment": {
      "REPORT_FORMAT": "json",
      "TIMEZONE": "UTC"
    },
    "memoryConfig": {
      "enableShortTerm": true,
      "enableLongTerm": true,
      "enableEpisodic": true,
      "vectorDimension": 1536
    }
  }'
```

### Example 2: Trading Agent

```javascript
// POST /api/v1/agents
{
  "name": "BTC Price Alert Agent",
  "type": "trading",
  "code": `
    async function main() {
      // Retrieve historical price data from memory
      const history = await memory.retrieve('long_term', 'BTC price', 10);
      
      // Get current price from input
      const currentPrice = input.price;
      
      // Store current price in memory
      await memory.store('episodic', JSON.stringify({
        price: currentPrice,
        timestamp: new Date()
      }), {
        asset: 'BTC',
        type: 'price_check'
      });
      
      // Check for price movement
      if (history.length > 0) {
        const lastPrice = JSON.parse(history[0].content).price;
        const change = ((currentPrice - lastPrice) / lastPrice) * 100;
        
        if (Math.abs(change) > 5) {
          // Significant price movement
          console.log(\`Alert: BTC price changed by \${change.toFixed(2)}%\`);
          
          // Store alert in long-term memory
          await memory.store('long_term', \`BTC price alert: \${change.toFixed(2)}% change\`, {
            change,
            currentPrice,
            lastPrice,
            timestamp: new Date()
          });
          
          return {
            alert: true,
            change,
            currentPrice,
            recommendation: change > 0 ? 'SELL' : 'BUY'
          };
        }
      }
      
      return { alert: false, currentPrice };
    }
  `,
  "triggers": [
    { "type": "event", "config": { "topic": "market.btc.price" } }
  ],
  "resourceLimits": {
    "maxCpuCores": 0.5,
    "maxMemoryMB": 256,
    "maxApiCallsPerMinute": 120
  }
}
```

### Example 3: Data Analysis Agent

```javascript
// POST /api/v1/agents
{
  "name": "Customer Sentiment Analyzer",
  "type": "data_analysis",
  "code": `
    async function main() {
      const reviews = input.reviews;
      
      // Analyze each review
      const results = [];
      for (const review of reviews) {
        // Store review in episodic memory
        await memory.store('episodic', review.text, {
          reviewId: review.id,
          customerId: review.customerId,
          timestamp: review.timestamp
        });
        
        // Search for similar reviews in long-term memory
        const similar = await memory.retrieve('long_term', review.text, 5);
        
        // Perform sentiment analysis
        const sentiment = analyzeSentiment(review.text);
        
        results.push({
          reviewId: review.id,
          sentiment,
          similarCount: similar.length
        });
        
        // Store summary in long-term memory for future analysis
        await memory.store('long_term', 
          \`Review \${review.id}: \${sentiment}\`, {
          reviewId: review.id,
          sentiment,
          timestamp: new Date()
        });
      }
      
      // Generate and store analysis report
      const report = {
        totalReviews: results.length,
        positive: results.filter(r => r.sentiment === 'positive').length,
        negative: results.filter(r => r.sentiment === 'negative').length,
        neutral: results.filter(r => r.sentiment === 'neutral').length,
        timestamp: new Date()
      };
      
      await storage.upload(
        'sentiment-analysis.json',
        Buffer.from(JSON.stringify(report)),
        { contentType: 'application/json' }
      );
      
      return report;
    }
    
    function analyzeSentiment(text) {
      // Simplified sentiment analysis
      const positive = /good|great|excellent|amazing|love/i;
      const negative = /bad|terrible|awful|hate|poor/i;
      
      if (positive.test(text)) return 'positive';
      if (negative.test(text)) return 'negative';
      return 'neutral';
    }
  `,
  "triggers": [
    { "type": "api", "config": {} }
  ],
  "memoryConfig": {
    "enableLongTerm": true,
    "enableEpisodic": true
  }
}
```

## Deploying an Agent

### Direct Deployment

```bash
curl -X POST http://localhost:3010/api/v1/agents/{agentId}/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "direct",
    "rollbackOnFailure": true
  }'
```

### Canary Deployment

```bash
curl -X POST http://localhost:3010/api/v1/agents/{agentId}/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "canary",
    "canaryPercent": 10,
    "healthCheckPath": "/health",
    "rollbackOnFailure": true,
    "maxRolloutDuration": 3600000
  }'
```

## Agent Code Examples

### Example 1: Personal Assistant Agent

```javascript
async function main() {
  const task = input.task;
  
  // Store task in short-term memory
  await memory.store('short_term', JSON.stringify(task), {
    type: 'todo',
    priority: task.priority
  });
  
  // Check for similar tasks
  const similar = await memory.retrieve('long_term', task.description, 3);
  
  if (similar.length > 0) {
    console.log('Found similar tasks in history:', similar.length);
  }
  
  // Process task
  const result = {
    taskId: task.id,
    status: 'scheduled',
    scheduledFor: task.dueDate,
    reminders: generateReminders(task)
  };
  
  // Store in long-term memory for learning
  await memory.store('long_term', 
    `Task completed: ${task.description}`, {
    taskId: task.id,
    category: task.category,
    completedAt: new Date()
  });
  
  return result;
}

function generateReminders(task) {
  const reminders = [];
  const due = new Date(task.dueDate);
  
  // 1 day before
  reminders.push(new Date(due.getTime() - 24 * 60 * 60 * 1000));
  
  // 1 hour before
  reminders.push(new Date(due.getTime() - 60 * 60 * 1000));
  
  return reminders;
}
```

### Example 2: Marketing Content Agent

```javascript
async function main() {
  const campaign = input.campaign;
  
  // Retrieve brand voice and style guidelines from long-term memory
  const brandGuidelines = await memory.retrieve('long_term', 'brand voice guidelines', 1);
  
  // Generate content variations
  const variations = [];
  for (let i = 0; i < 3; i++) {
    const content = generateContent(campaign, brandGuidelines);
    variations.push(content);
    
    // Store each variation
    await storage.upload(
      `campaign-${campaign.id}-variation-${i}.txt`,
      Buffer.from(content),
      { 
        contentType: 'text/plain',
        variation: i,
        campaignId: campaign.id
      }
    );
  }
  
  // Store campaign in episodic memory
  await memory.store('episodic', JSON.stringify({
    campaignId: campaign.id,
    variations: variations.length,
    platform: campaign.platform
  }), {
    type: 'campaign',
    platform: campaign.platform
  });
  
  return {
    campaignId: campaign.id,
    variationsGenerated: variations.length,
    status: 'ready'
  };
}

function generateContent(campaign, guidelines) {
  // Simplified content generation
  return `${campaign.headline}\\n\\n${campaign.message}`;
}
```

## Monitoring Agents

### Get Agent Logs

```bash
curl http://localhost:3010/api/v1/agents/{agentId}/logs?page=1&limit=50
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "exec-uuid",
      "agentId": "agent-uuid",
      "startedAt": "2024-03-26T10:00:00Z",
      "completedAt": "2024-03-26T10:00:05Z",
      "status": "success",
      "input": { "task": "generate report" },
      "output": { "reportId": "rpt-123" },
      "tokensUsed": 1500,
      "cost": 0.03,
      "executionTimeMs": 5000
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### Get Agent Metrics

```bash
curl http://localhost:3010/api/v1/agents/{agentId}/metrics?period=24h
```

Response:
```json
{
  "success": true,
  "data": {
    "agentId": "agent-uuid",
    "period": "24h",
    "executionCount": 48,
    "successCount": 45,
    "failureCount": 3,
    "avgExecutionTimeMs": 3200,
    "totalTokensUsed": 72000,
    "totalCost": 1.44,
    "totalRevenue": 0,
    "resourceUsage": {
      "avgCpuPercent": 25,
      "avgMemoryMB": 180,
      "avgStorageMB": 450
    }
  }
}
```

### List All Agents

```bash
curl http://localhost:3010/api/v1/agents?type=trading&status=deployed
```

## Integration Examples

### Example 1: Trigger Agent via NATS

```javascript
// From another service
const nats = require('nats');

const nc = await nats.connect({ servers: 'nats://localhost:4222' });
const js = nc.jetstream();

// Enqueue agent execution
await js.publish('agent.execute.5', JSON.stringify({
  type: 'execute_agent',
  agentId: 'agent-uuid',
  executionId: uuidv4(),
  payload: {
    input: { price: 42000 },
    priority: 5
  },
  timestamp: new Date()
}));
```

### Example 2: Agent to Agent Communication

```javascript
// Agent A
async function main() {
  const data = processData(input);
  
  // Store in shared memory for Agent B
  await memory.store('shared', JSON.stringify(data), {
    from: agentId,
    for: 'agent-b-uuid',
    timestamp: new Date()
  });
  
  // Publish event for Agent B
  // (would use NATS in production)
  
  return { status: 'shared', data: data.id };
}

// Agent B
async function main() {
  // Retrieve shared data from Agent A
  const sharedData = await memory.retrieve('shared', `from:${input.fromAgent}`, 1);
  
  if (sharedData.length > 0) {
    const data = JSON.parse(sharedData[0].content);
    // Process shared data
    return processSharedData(data);
  }
  
  return { error: 'No shared data found' };
}
```

### Example 3: Human-in-the-Loop Workflow

```javascript
async function main() {
  const decision = input.decision;
  
  // Retrieve pending decisions from episodic memory
  const pending = await memory.retrieve('episodic', 'pending decision', 10);
  
  if (decision.requiresApproval) {
    // Store decision awaiting approval
    await memory.store('episodic', JSON.stringify({
      decision,
      status: 'pending_approval',
      requestedAt: new Date()
    }), {
      type: 'approval_required',
      priority: decision.priority
    });
    
    // Pause execution until approval
    return {
      status: 'awaiting_approval',
      decisionId: decision.id,
      message: 'Human approval required'
    };
  }
  
  // Auto-approve based on rules
  const approved = autoApprove(decision);
  
  await memory.store('episodic', JSON.stringify({
    decision,
    status: 'approved',
    approvedAt: new Date(),
    autoApproved: true
  }), {
    type: 'decision',
    result: 'approved'
  });
  
  return {
    status: 'approved',
    autoApproved: true,
    decision
  };
}

function autoApprove(decision) {
  // Simple auto-approval logic
  return decision.amount < 1000;
}
```

## Best Practices

### 1. Memory Management

- Use **short-term memory** for session data (expires in 1 hour)
- Use **long-term memory** for knowledge that should persist
- Use **episodic memory** for event history and structured queries
- Use **shared memory** for agent-to-agent communication

### 2. Resource Optimization

- Set appropriate resource limits based on agent workload
- Monitor token usage to control costs
- Use checkpoints for long-running agents
- Implement proper error handling and retries

### 3. Security

- Request only the permissions your agent needs
- Validate all input data
- Don't store sensitive data in memory without encryption
- Use environment variables for configuration

### 4. Monitoring

- Log important events using console.log()
- Track execution metrics
- Set up alerts for failures
- Review execution logs regularly

### 5. Code Organization

- Keep agent code modular and focused
- Use helper functions for complex logic
- Document agent behavior and requirements
- Version your agents properly

## Troubleshooting

### Agent Won't Deploy

1. Check agent status: `GET /api/v1/agents/:id`
2. Verify all required permissions are granted
3. Check resource limits are within allowed ranges
4. Review agent code for syntax errors

### High Token Usage

1. Review execution logs for inefficient operations
2. Optimize memory queries (use appropriate limits)
3. Cache frequently accessed data
4. Reduce unnecessary API calls

### Execution Timeouts

1. Increase timeout in resource limits
2. Optimize agent code for performance
3. Use checkpoints for long-running tasks
4. Split work across multiple agents

## Support

For issues or questions:
- Check service logs: `docker logs agent-control-plane`
- Review execution logs via API
- Check NATS queue status
- Verify all dependent services are running
