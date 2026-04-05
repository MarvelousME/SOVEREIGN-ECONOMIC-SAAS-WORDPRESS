/**
 * Task Controller
 * 
 * @version 1.0.0
 * Task management API endpoints
 */

const taskModel = require('../Models/task');
const userModel = require('../Models/user');
const rewardModel = require('../Models/reward');
const db = require('../Models/db');

class TaskController {
    async list(req, res) {
        try {
            const { status, category, difficulty, page = 1, limit = 20 } = req.query;
            const result = await taskModel.list({ status, category, difficulty }, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            console.error('List tasks error:', error.message);
            res.status(500).json({ error: 'Failed to list tasks' });
        }
    }

    async get(req, res) {
        try {
            const task = await taskModel.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.json(task);
        } catch (error) {
            console.error('Get task error:', error.message);
            res.status(500).json({ error: 'Failed to get task' });
        }
    }

    async create(req, res) {
        try {
            const { title, description, category, difficulty, reward_amount, reward_currency, max_participants, deadline, proof_requirements } = req.body;
            
            const task = await taskModel.create({
                title,
                description,
                category,
                difficulty,
                reward_amount,
                reward_currency,
                max_participants,
                deadline,
                proof_requirements,
                created_by: req.user.userId,
            });
            
            res.status(201).json(task);
        } catch (error) {
            console.error('Create task error:', error.message);
            res.status(500).json({ error: 'Failed to create task' });
        }
    }

    async update(req, res) {
        try {
            const task = await taskModel.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            const updated = await taskModel.update(req.params.id, req.body);
            res.json(updated);
        } catch (error) {
            console.error('Update task error:', error.message);
            res.status(500).json({ error: 'Failed to update task' });
        }
    }

    async delete(req, res) {
        try {
            const task = await taskModel.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            await taskModel.delete(req.params.id);
            res.json({ message: 'Task deleted' });
        } catch (error) {
            console.error('Delete task error:', error.message);
            res.status(500).json({ error: 'Failed to delete task' });
        }
    }

    async assign(req, res) {
        try {
            const task = await taskModel.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            if (task.status !== 'active') {
                return res.status(400).json({ error: 'Task is not active' });
            }
            
            if (task.current_participants >= task.max_participants) {
                return res.status(400).json({ error: 'Task is full' });
            }
            
            const user = await userModel.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Check for existing assignment
            const existingAssignment = await db.query(
                'SELECT * FROM task_assignments WHERE task_id = $1 AND user_id = $2',
                [req.params.id, req.user.userId]
            );
            
            if (existingAssignment.rows.length > 0) {
                return res.status(400).json({ error: 'Already assigned to this task' });
            }
            
            // Create assignment
            await db.query(
                'INSERT INTO task_assignments (task_id, user_id, status) VALUES ($1, $2, $3)',
                [req.params.id, req.user.userId, 'assigned']
            );
            
            // Increment participants
            await taskModel.incrementParticipants(req.params.id);
            
            res.status(201).json({ message: 'Task assigned successfully' });
        } catch (error) {
            console.error('Assign task error:', error.message);
            res.status(500).json({ error: 'Failed to assign task' });
        }
    }

    async submit(req, res) {
        try {
            const { proof_data } = req.body;
            
            const result = await db.query(
                `UPDATE task_assignments 
                 SET proof_data = $1, submitted_at = NOW(), status = 'submitted'
                 WHERE task_id = $2 AND user_id = $3
                 RETURNING *`,
                [JSON.stringify(proof_data), req.params.id, req.user.userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Assignment not found' });
            }
            
            res.json({ message: 'Task submitted for verification' });
        } catch (error) {
            console.error('Submit task error:', error.message);
            res.status(500).json({ error: 'Failed to submit task' });
        }
    }

    async verify(req, res) {
        try {
            const { status } = req.body; // 'approved' or 'rejected'
            
            const result = await db.query(
                `UPDATE task_assignments 
                 SET status = $1, verified_by = $2, verified_at = NOW()
                 WHERE task_id = $3 AND status = 'submitted'
                 RETURNING *`,
                [status, req.user.userId, req.params.id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No submissions to verify' });
            }
            
            // If approved, distribute reward
            if (status === 'approved') {
                const assignment = result.rows[0];
                const task = await taskModel.findById(req.params.id);
                
                await rewardModel.create({
                    user_id: assignment.user_id,
                    amount: task.reward_amount,
                    currency: task.reward_currency,
                    type: 'task_reward',
                    source_type: 'task',
                    source_id: task.id,
                });
                
                await db.query(
                    'UPDATE task_assignments SET reward_distributed = true WHERE id = $1',
                    [assignment.id]
                );
            }
            
            res.json({ message: `Task ${status}`, assignments: result.rows });
        } catch (error) {
            console.error('Verify task error:', error.message);
            res.status(500).json({ error: 'Failed to verify task' });
        }
    }
}

module.exports = new TaskController();