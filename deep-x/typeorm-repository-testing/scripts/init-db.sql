-- PostgreSQL initialization script for TypeORM Repository Testing

-- Create database if not exists (this is handled by Docker environment)
-- CREATE DATABASE IF NOT EXISTS daytona_test;

-- Set timezone
SET timezone = 'UTC';

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema for testing (optional)
-- CREATE SCHEMA IF NOT EXISTS test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE daytona_test TO daytona_test;

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'TypeORM Repository Testing database initialized successfully!';
END $$; 