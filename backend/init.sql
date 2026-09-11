-- Token Vault Database Initialization Script
-- PostgreSQL Schema

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table will be created by the backend adapter
-- Tokens table will be created by the backend adapter
-- This file is for any additional initialization

-- Create indexes for better performance
-- These will be created by the adapter, but we can add more here

-- Full-text search index for tokens (optional enhancement)
-- CREATE INDEX idx_tokens_search ON tokens USING gin(to_tsvector('english', issuer || ' ' || account));

-- Index for faster statistics queries
-- CREATE INDEX idx_tokens_stats ON tokens(user_id, use_count, last_used);

-- Default admin user (optional, for testing)
-- Password: admin123 (hashed with bcrypt)
-- INSERT INTO users (email, password_hash, name, created_at, updated_at)
-- VALUES ('admin@example.com', '$2a$10$..hash..', 'Admin', extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
-- ON CONFLICT (email) DO NOTHING;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Token Vault database initialized successfully';
END $$;
