-- Migration: 006_create_task_marketplace_schema.sql
-- Description: Create task marketplace tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE task_status AS ENUM ('draft', 'open', 'assigned', 'in_progress', 'submitted', 'under_review', 'completed', 'rejected', 'cancelled', 'expired');
CREATE TYPE task_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE submission_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'revision_requested');
CREATE TYPE proficiency_level AS ENUM ('novice', 'beginner', 'intermediate', 'advanced', 'expert');

-- Task categories table
CREATE TABLE task_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id BIGINT REFERENCES task_categories(id) ON DELETE SET NULL,
    icon VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_category_slug UNIQUE (tenant_id, slug)
);

-- Create indexes for task_categories
CREATE INDEX idx_task_categories_tenant_id ON task_categories(tenant_id);
CREATE INDEX idx_task_categories_parent_id ON task_categories(parent_id);
CREATE INDEX idx_task_categories_slug ON task_categories(slug);
CREATE INDEX idx_task_categories_active ON task_categories(active);

-- Skills table
CREATE TABLE skills (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    category_id BIGINT REFERENCES task_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_skill_slug UNIQUE (tenant_id, slug)
);

-- Create indexes for skills
CREATE INDEX idx_skills_tenant_id ON skills(tenant_id);
CREATE INDEX idx_skills_category_id ON skills(category_id);
CREATE INDEX idx_skills_slug ON skills(slug);

-- Tasks table
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES task_categories(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    difficulty task_difficulty NOT NULL,
    reward_amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status task_status NOT NULL DEFAULT 'draft',
    max_assignments INTEGER NOT NULL DEFAULT 1,
    current_assignments INTEGER NOT NULL DEFAULT 0,
    proof_required BOOLEAN NOT NULL DEFAULT true,
    proof_instructions TEXT,
    estimated_duration_minutes INTEGER,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT positive_reward CHECK (reward_amount > 0),
    CONSTRAINT positive_max_assignments CHECK (max_assignments > 0),
    CONSTRAINT valid_assignments CHECK (current_assignments <= max_assignments),
    CONSTRAINT valid_duration CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0)
);

-- Create indexes for tasks
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_expires_at ON tasks(expires_at);
CREATE INDEX idx_tasks_reward ON tasks(reward_amount DESC);
CREATE INDEX idx_tasks_metadata ON tasks USING GIN(metadata);
CREATE INDEX idx_tasks_title_trgm ON tasks USING GIN(title gin_trgm_ops);
CREATE INDEX idx_tasks_description_trgm ON tasks USING GIN(description gin_trgm_ops);

-- Task skills table
CREATE TABLE task_skills (
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_required proficiency_level NOT NULL DEFAULT 'beginner',
    weight NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    
    PRIMARY KEY (task_id, skill_id),
    CONSTRAINT weight_range CHECK (weight >= 0 AND weight <= 10)
);

-- Create indexes for task_skills
CREATE INDEX idx_task_skills_task_id ON task_skills(task_id);
CREATE INDEX idx_task_skills_skill_id ON task_skills(skill_id);
CREATE INDEX idx_task_skills_proficiency ON task_skills(proficiency_required);

-- Task submissions table
CREATE TABLE task_submissions (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proof_of_work JSONB NOT NULL,
    notes TEXT,
    status submission_status NOT NULL DEFAULT 'pending',
    reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    score NUMERIC(5, 2),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    revision_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    CONSTRAINT unique_user_task_submission UNIQUE (task_id, user_id, submitted_at),
    CONSTRAINT score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

-- Create indexes for task_submissions
CREATE INDEX idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX idx_task_submissions_status ON task_submissions(status);
CREATE INDEX idx_task_submissions_reviewer_id ON task_submissions(reviewer_id);
CREATE INDEX idx_task_submissions_submitted_at ON task_submissions(submitted_at DESC);
CREATE INDEX idx_task_submissions_reviewed_at ON task_submissions(reviewed_at DESC);
CREATE INDEX idx_task_submissions_proof ON task_submissions USING GIN(proof_of_work);

-- Task watchlist table (users following tasks)
CREATE TABLE task_watchlist (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, task_id)
);

-- Create indexes for task_watchlist
CREATE INDEX idx_task_watchlist_user_id ON task_watchlist(user_id);
CREATE INDEX idx_task_watchlist_task_id ON task_watchlist(task_id);

-- Function to auto-expire tasks
CREATE OR REPLACE FUNCTION auto_expire_tasks()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status NOT IN ('completed', 'cancelled', 'expired') THEN
        NEW.status := 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-expire tasks
CREATE TRIGGER auto_expire_tasks_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION auto_expire_tasks();

-- Function to update task assignment count
CREATE OR REPLACE FUNCTION update_task_assignment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
        NEW.current_assignments := NEW.current_assignments + 1;
        IF NEW.current_assignments >= NEW.max_assignments THEN
            NEW.status := 'assigned';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update assignment count
CREATE TRIGGER update_task_assignment_count_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_task_assignment_count();

-- Update timestamps trigger
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON task_categories
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON skills
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON tasks
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON task_skills
    USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON task_submissions
    USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON task_watchlist
    USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON task_watchlist;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON task_submissions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON task_skills;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON tasks;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON skills;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON task_categories;
-- DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
-- DROP TRIGGER IF EXISTS update_task_assignment_count_trigger ON tasks;
-- DROP TRIGGER IF EXISTS auto_expire_tasks_trigger ON tasks;
-- DROP FUNCTION IF EXISTS update_task_assignment_count CASCADE;
-- DROP FUNCTION IF EXISTS auto_expire_tasks CASCADE;
-- DROP TABLE IF EXISTS task_watchlist CASCADE;
-- DROP TABLE IF EXISTS task_submissions CASCADE;
-- DROP TABLE IF EXISTS task_skills CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS skills CASCADE;
-- DROP TABLE IF EXISTS task_categories CASCADE;
-- DROP TYPE IF EXISTS proficiency_level CASCADE;
-- DROP TYPE IF EXISTS submission_status CASCADE;
-- DROP TYPE IF EXISTS task_difficulty CASCADE;
-- DROP TYPE IF EXISTS task_status CASCADE;
