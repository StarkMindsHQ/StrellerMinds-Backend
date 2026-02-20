-- Database initialization script for development
-- This script is executed when PostgreSQL container starts

-- Create additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS analytics;
-- CREATE SCHEMA IF NOT EXISTS audit;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create indexes for common queries
-- These will be created by TypeORM migrations, but we can add them here for initial setup

-- Create sample data for development (optional)
-- This section can be uncommented for initial development data

-- Sample user roles
-- INSERT INTO roles (name, description) VALUES 
-- ('ADMIN', 'System administrator'),
-- ('INSTRUCTOR', 'Course instructor'),
-- ('STUDENT', 'Regular student'),
-- ('MODERATOR', 'Community moderator')
-- ON CONFLICT (name) DO NOTHING;

-- Sample course categories
-- INSERT INTO categories (name, description, icon) VALUES
-- ('Blockchain', 'Learn about blockchain technology', 'blockchain'),
-- ('Cryptocurrency', 'Understanding digital currencies', 'crypto'),
-- ('DeFi', 'Decentralized Finance applications', 'defi'),
-- ('Smart Contracts', 'Smart contract development', 'contract'),
-- ('Web3', 'Web3 development and tools', 'web3')
-- ON CONFLICT (name) DO NOTHING;

-- Create database statistics view
CREATE OR REPLACE VIEW database_stats AS
SELECT 
    'users' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM users
UNION ALL
SELECT 
    'courses' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM courses
UNION ALL
SELECT 
    'enrollments' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM enrollments;

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO strellerminds;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO strellerminds;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO strellerminds;

-- Create performance monitoring functions
CREATE OR REPLACE FUNCTION get_table_stats(table_name TEXT)
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    index_count INTEGER,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        index_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
    FROM pg_stat_user_tables
    JOIN (
        SELECT schemaname, tablename, COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) indexes ON pg_stat_user_tables.schemaname = indexes.schemaname 
                AND pg_stat_user_tables.tablename = indexes.tablename
    WHERE pg_stat_user_tables.schemaname = 'public' 
          AND pg_stat_user_tables.tablename = table_name;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function (for sensitive tables)
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs(table_name, operation, old_data, user_id, timestamp)
        VALUES(TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_setting('app.current_user_id', true), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs(table_name, operation, old_data, new_data, user_id, timestamp)
        VALUES(TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs(table_name, operation, new_data, user_id, timestamp)
        VALUES(TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_setting('app.current_user_id', true), NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create search optimization function
CREATE OR REPLACE FUNCTION optimize_search()
RETURNS void AS $$
BEGIN
    -- Update table statistics for better query planning
    ANALYZE users;
    ANALYZE courses;
    ANALYZE enrollments;
    
    -- Rebuild indexes if needed
    REINDEX INDEX CONCURRENTLY IF EXISTS idx_users_email;
    REINDEX INDEX CONCURRENTLY IF EXISTS idx_courses_title;
    REINDEX INDEX CONCURRENTLY IF EXISTS idx_courses_description;
    
    RAISE NOTICE 'Search optimization completed';
END;
$$ LANGUAGE plpgsql;

-- Create backup function
CREATE OR REPLACE FUNCTION create_backup(backup_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    actual_backup_name TEXT;
BEGIN
    IF backup_name IS NULL THEN
        actual_backup_name := 'strellerminds_backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    ELSE
        actual_backup_name := backup_name;
    END IF;
    
    EXECUTE format('COPY (SELECT * FROM database_stats) TO %L WITH CSV HEADER', '/tmp/' || actual_backup_name || '_stats.csv');
    
    RETURN actual_backup_name;
END;
$$ LANGUAGE plpgsql;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO strellerminds;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO strellerminds;

-- Create notification function for real-time features
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('table_changes', 
        json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'id', COALESCE(NEW.id, OLD.id),
            'timestamp', NOW()
        )::text
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'StrellerMinds database initialized successfully';
    RAISE NOTICE 'Extensions: uuid-ossp, pg_trgm, btree_gin, pg_stat_statements';
    RAISE NOTICE 'Custom functions: update_updated_at_column, get_table_stats, audit_trigger_function, optimize_search, create_backup, notify_table_change';
    RAISE NOTICE 'Views: database_stats';
    RAISE NOTICE 'Ready for application startup';
END $$;
