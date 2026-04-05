-- Migration: 001_create_extensions.sql
-- Description: Create required PostgreSQL extensions
-- Created: 2026-03-26

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram similarity for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable hstore for key-value pairs
CREATE EXTENSION IF NOT EXISTS "hstore";

-- Enable Row Level Security helper functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rollback
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
-- DROP EXTENSION IF EXISTS "pg_trgm" CASCADE;
-- DROP EXTENSION IF EXISTS "hstore" CASCADE;
-- DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
