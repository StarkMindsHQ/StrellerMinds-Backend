-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    user_agent VARCHAR(100),
    device_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    preferences JSONB,
    metadata JSONB,
    last_notification_sent TIMESTAMP,
    notification_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id_active ON push_subscriptions(user_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Create offline_sync table
CREATE TABLE IF NOT EXISTS offline_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    operation VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    data JSONB NOT NULL,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    error_message TEXT,
    result JSONB,
    processed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for offline_sync
CREATE INDEX IF NOT EXISTS idx_offline_sync_user_id_status ON offline_sync(user_id, status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status_priority_created ON offline_sync(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync(status);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon VARCHAR(500),
    badge VARCHAR(500),
    image VARCHAR(500),
    tag VARCHAR(100),
    require_interaction BOOLEAN DEFAULT false,
    silent BOOLEAN DEFAULT false,
    actions JSONB,
    default_data JSONB,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notification_templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_active ON notification_templates(type, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Create cache_policies table
CREATE TABLE IF NOT EXISTS cache_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route VARCHAR(255) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    strategy VARCHAR(50) NOT NULL,
    max_age INTEGER DEFAULT 3600,
    stale_while_revalidate INTEGER,
    headers JSONB,
    conditions JSONB,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for cache_policies
CREATE INDEX IF NOT EXISTS idx_cache_policies_route_method ON cache_policies(route, method);
CREATE INDEX IF NOT EXISTS idx_cache_policies_active ON cache_policies(is_active);

-- Insert default notification templates
INSERT INTO notification_templates (type, name, title, body, icon, variables) VALUES
('welcome', 'Welcome Notification', 'Welcome {{name}}!', 'Thanks for joining our platform. Get started by exploring our features.', '/icons/welcome.png', '["name"]'),
('reminder', 'Reminder Notification', 'Don''t forget!', '{{message}}', '/icons/reminder.png', '["message"]'),
('update', 'Update Notification', 'New Update Available', 'Version {{version}} is now available with exciting new features.', '/icons/update.png', '["version"]'),
('alert', 'Alert Notification', 'Important Alert', '{{alertMessage}}', '/icons/alert.png', '["alertMessage"]')
ON CONFLICT (type) DO NOTHING;

-- Insert default cache policies
INSERT INTO cache_policies (route, method, strategy, max_age, description) VALUES
('/api/analytics/events', 'GET', 'cache-first', 300, 'Cache analytics events for 5 minutes'),
('/api/analytics/dashboard', 'GET', 'stale-while-revalidate', 1800, 'Dashboard data with background refresh'),
('/api/pwa/push/vapid-public-key', 'GET', 'cache-only', 86400, 'VAPID public key - rarely changes'),
('/api/static/*', 'GET', 'cache-first', 31536000, 'Static assets - long cache'),
('/api/user/profile', 'GET', 'network-first', 600, 'User profile - prefer fresh data')
ON CONFLICT DO NOTHING;
