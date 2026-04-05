-- Task Marketplace Tables Migration
-- Creates tables for task management, submissions, milestones, and disputes

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('simple', 'bounty', 'recurring', 'milestone', 'survey')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'content_creation', 'data_entry', 'design', 'development', 
        'marketing', 'research', 'testing', 'translation', 'writing', 'other'
    )),
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN (
        'draft', 'open', 'claimed', 'in_progress', 'submitted', 
        'under_review', 'approved', 'rejected', 'disputed', 'expired', 'cancelled'
    )),
    reward_amount NUMERIC(10, 2) NOT NULL CHECK (reward_amount > 0),
    required_skills TEXT[] DEFAULT '{}',
    min_reputation INTEGER DEFAULT 0 CHECK (min_reputation >= 0),
    max_submissions INTEGER,
    submission_count INTEGER DEFAULT 0 CHECK (submission_count >= 0),
    assignee_id UUID,
    claimed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for tasks table
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX idx_tasks_expires_at ON tasks(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_required_skills ON tasks USING GIN(required_skills);

-- Task milestones table
CREATE TABLE IF NOT EXISTS task_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    reward_amount NUMERIC(10, 2) NOT NULL CHECK (reward_amount > 0),
    "order" INTEGER NOT NULL CHECK ("order" > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'completed', 'approved', 'rejected'
    )),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, "order")
);

CREATE INDEX idx_task_milestones_task_id ON task_milestones(task_id);
CREATE INDEX idx_task_milestones_status ON task_milestones(status);

-- Task submissions table
CREATE TABLE IF NOT EXISTS task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    milestone_id UUID REFERENCES task_milestones(id) ON DELETE SET NULL,
    proof_text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX idx_task_submissions_status ON task_submissions(status);
CREATE INDEX idx_task_submissions_submitted_at ON task_submissions(submitted_at DESC);

-- Task recurrences table
CREATE TABLE IF NOT EXISTS task_recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    last_generated_at TIMESTAMP,
    next_generation_at TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_recurrences_task_id ON task_recurrences(task_id);
CREATE INDEX idx_task_recurrences_next_generation ON task_recurrences(next_generation_at);

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

-- Task disputes table
CREATE TABLE IF NOT EXISTS task_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    resolution TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_disputes_task_id ON task_disputes(task_id);
CREATE INDEX idx_task_disputes_submission_id ON task_disputes(submission_id);
CREATE INDEX idx_task_disputes_status ON task_disputes(status);
CREATE INDEX idx_task_disputes_raised_by ON task_disputes(raised_by);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_milestones_updated_at BEFORE UPDATE ON task_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_submissions_updated_at BEFORE UPDATE ON task_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_recurrences_updated_at BEFORE UPDATE ON task_recurrences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_disputes_updated_at BEFORE UPDATE ON task_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE tasks IS 'Main tasks table for task-to-earn marketplace';
COMMENT ON TABLE task_milestones IS 'Milestones for multi-step tasks';
COMMENT ON TABLE task_submissions IS 'User submissions and proof-of-work';
COMMENT ON TABLE task_recurrences IS 'Configuration for recurring tasks';
COMMENT ON TABLE task_attachments IS 'File attachments for tasks';
COMMENT ON TABLE task_disputes IS 'Dispute management for task submissions';
