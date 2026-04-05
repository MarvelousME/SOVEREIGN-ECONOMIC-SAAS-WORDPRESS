/**
 * Agent Controller
 * 
 * @version 1.0.0
 * Agent marketplace API endpoints
 */

const agentModel = require('../Models/agent');

class AgentController {
    async list(req, res) {
        try {
            const { status, capability, search, page = 1, limit = 20 } = req.query;
            const result = await agentModel.list({ status, capability, search }, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            console.error('List agents error:', error.message);
            res.status(500).json({ error: 'Failed to list agents' });
        }
    }

    async get(req, res) {
        try {
            const agent = await agentModel.findById(req.params.id);
            if (!agent) {
                return res.status(404).json({ error: 'Agent not found' });
            }
            res.json(agent);
        } catch (error) {
            console.error('Get agent error:', error.message);
            res.status(500).json({ error: 'Failed to get agent' });
        }
    }

    async register(req, res) {
        try {
            const { name, description, capability, endpoint, auth_type, pricing_model, price_per_call } = req.body;
            
            const agent = await agentModel.create({
                owner_id: req.user.userId,
                name,
                description,
                capability,
                endpoint,
                auth_type,
                pricing_model,
                price_per_call,
            });
            
            res.status(201).json(agent);
        } catch (error) {
            console.error('Register agent error:', error.message);
            res.status(500).json({ error: 'Failed to register agent' });
        }
    }

    async execute(req, res) {
        try {
            const agent = await agentModel.findById(req.params.id);
            if (!agent) {
                return res.status(404).json({ error: 'Agent not found' });
            }
            
            if (agent.status !== 'active') {
                return res.status(400).json({ error: 'Agent is not active' });
            }
            
            const { input } = req.body;
            const startTime = Date.now();
            
            // Simulate agent execution (in production, this would call the actual agent endpoint)
            let output;
            try {
                // In real implementation, make HTTP request to agent.endpoint
                // For now, simulate a response
                output = {
                    result: `Processed by ${agent.name}`,
                    input,
                    timestamp: new Date().toISOString(),
                };
            } catch (execError) {
                console.error('Agent execution error:', execError.message);
                return res.status(502).json({ error: 'Agent execution failed' });
            }
            
            const durationMs = Date.now() - startTime;
            const cost = agent.price_per_call || 0;
            
            // Record execution
            const execution = await agentModel.recordExecution(
                agent.id,
                req.user.userId,
                input,
                output,
                durationMs,
                cost
            );
            
            res.json({
                execution_id: execution.id,
                output,
                duration_ms: durationMs,
                cost,
            });
        } catch (error) {
            console.error('Execute agent error:', error.message);
            res.status(500).json({ error: 'Failed to execute agent' });
        }
    }
}

module.exports = new AgentController();