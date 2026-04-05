/**
 * Agent Model
 *
 * @version 2.0.0
 * Agent marketplace repository for database operations.
 *
 * Fixes vs v1.0.0:
 *  - list() parameterized query was broken: capability filter used hardcoded "$1"
 *    instead of the rolling $paramIndex, causing wrong parameter binding.
 *  - capability is a single VARCHAR column (not an array), so filter uses "= $n"
 *    not "ANY(capability)".
 *  - Search condition now correctly reuses one param slot for both ILIKE comparisons.
 *  - LIMIT / OFFSET param indices now correctly follow after other params.
 *  - count query runs in parallel with data query.
 */

const db = require('./db');

class AgentModel {
    async findById(id) {
        const result = await db.query(
            'SELECT * FROM agents WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async create(agentData) {
        const { owner_id, name, description, capability, endpoint, auth_type, pricing_model, price_per_call } = agentData;
        const result = await db.query(
            `INSERT INTO agents (owner_id, name, description, capability, endpoint, auth_type, pricing_model, price_per_call)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [owner_id, name, description, capability, endpoint, auth_type || 'api_key', pricing_model || 'free', price_per_call || 0]
        );
        return result.rows[0];
    }

    async update(id, agentData) {
        const { name, description, capability, endpoint, auth_type, status, pricing_model, price_per_call } = agentData;
        const result = await db.query(
            `UPDATE agents
             SET name           = COALESCE($1, name),
                 description    = COALESCE($2, description),
                 capability     = COALESCE($3, capability),
                 endpoint       = COALESCE($4, endpoint),
                 auth_type      = COALESCE($5, auth_type),
                 status         = COALESCE($6, status),
                 pricing_model  = COALESCE($7, pricing_model),
                 price_per_call = COALESCE($8, price_per_call),
                 updated_at     = NOW()
             WHERE id = $9
             RETURNING *`,
            [name, description, capability, endpoint, auth_type, status, pricing_model, price_per_call, id]
        );
        return result.rows[0];
    }

    async list(filters = {}, page = 1, limit = 20) {
        const { status, capability, search } = filters;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Status filter is always applied (defaults to 'active')
        conditions.push(`status = $${paramIndex++}`);
        params.push(status || 'active');

        if (capability) {
            // capability is a VARCHAR column, plain equality match
            conditions.push(`capability = $${paramIndex++}`);
            params.push(capability);
        }

        if (search) {
            // Both ILIKE clauses share the same parameter slot
            conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = 'WHERE ' + conditions.join(' AND ');
        const offset = (page - 1) * limit;

        const limitIndex  = paramIndex++;
        const offsetIndex = paramIndex++;

        const [result, countResult] = await Promise.all([
            db.query(
                `SELECT * FROM agents ${whereClause} ORDER BY rating DESC, total_calls DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
                [...params, limit, offset]
            ),
            db.query(`SELECT COUNT(*) FROM agents ${whereClause}`, params),
        ]);

        const total = parseInt(countResult.rows[0].count);
        return {
            data: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async recordExecution(agentId, userId, inputData, outputData, durationMs, cost) {
        const result = await db.query(
            `INSERT INTO agent_executions (agent_id, user_id, input_data, output_data, status, duration_ms, cost, completed_at)
             VALUES ($1, $2, $3, $4, 'completed', $5, $6, NOW())
             RETURNING *`,
            [agentId, userId, JSON.stringify(inputData), JSON.stringify(outputData), durationMs, cost]
        );

        await db.query(
            'UPDATE agents SET total_calls = total_calls + 1 WHERE id = $1',
            [agentId]
        );

        return result.rows[0];
    }

    async delete(id) {
        await db.query('DELETE FROM agents WHERE id = $1', [id]);
    }
}

module.exports = new AgentModel();
