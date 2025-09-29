-- Create translations table
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    context TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'deprecated')),
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'tms', 'auto_translate', 'import')),
    metadata JSONB,
    translated_by VARCHAR(255),
    reviewed_by VARCHAR(255),
    translated_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    published_at TIMESTAMP,
    version INTEGER DEFAULT 1,
    parent_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key, locale, namespace)
);

-- Create indexes for translations
CREATE INDEX idx_translations_locale_namespace ON translations(locale, namespace);
CREATE INDEX idx_translations_key_locale ON translations(key, locale);
CREATE INDEX idx_translations_status_locale ON translations(status, locale);

-- Create user_locales table
CREATE TABLE user_locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    locale VARCHAR(10) NOT NULL,
    source VARCHAR(20) DEFAULT 'user_preference' CHECK (source IN ('user_preference', 'browser_detection', 'geo_location', 'default')),
    fallback_locales TEXT[],
    preferences JSONB,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_locales
CREATE INDEX idx_user_locales_locale ON user_locales(locale);
CREATE INDEX idx_user_locales_source ON user_locales(source);

-- Create locale_metadata table
CREATE TABLE locale_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    english_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(2) NOT NULL,
    country_code VARCHAR(2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'beta', 'deprecated')),
    is_rtl BOOLEAN DEFAULT false,
    formatting JSONB NOT NULL,
    fallback_locales TEXT[],
    completion_percentage INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for locale_metadata
CREATE INDEX idx_locale_metadata_code ON locale_metadata(code);
CREATE INDEX idx_locale_metadata_status ON locale_metadata(status);

-- Insert default locale metadata
INSERT INTO locale_metadata (code, name, native_name, english_name, language_code, country_code, status, formatting, priority) VALUES
('en', 'English', 'English', 'English', 'en', 'US', 'active', '{"dateFormat": "MM/dd/yyyy", "timeFormat": "HH:mm", "numberFormat": {"decimal": ".", "thousands": ",", "currency": "$"}, "pluralRules": ["one", "other"]}', 100),
('es', 'Español', 'Español', 'Spanish', 'es', 'ES', 'active', '{"dateFormat": "dd/MM/yyyy", "timeFormat": "HH:mm", "numberFormat": {"decimal": ",", "thousands": ".", "currency": "€"}, "pluralRules": ["one", "other"]}', 90),
('fr', 'Français', 'Français', 'French', 'fr', 'FR', 'active', '{"dateFormat": "dd/MM/yyyy", "timeFormat": "HH:mm", "numberFormat": {"decimal": ",", "thousands": " ", "currency": "€"}, "pluralRules": ["one", "other"]}', 80),
('de', 'Deutsch', 'Deutsch', 'German', 'de', 'DE', 'active', '{"dateFormat": "dd.MM.yyyy", "timeFormat": "HH:mm", "numberFormat": {"decimal": ",", "thousands": ".", "currency": "€"}, "pluralRules": ["one", "other"]}', 70),
('ja', '日本語', '日本語', 'Japanese', 'ja', 'JP', 'active', '{"dateFormat": "yyyy/MM/dd", "timeFormat": "HH:mm", "numberFormat": {"decimal": ".", "thousands": ",", "currency": "¥"}, "pluralRules": ["other"]}', 60),
('zh', '中文', '中文', 'Chinese', 'zh', 'CN', 'active', '{"dateFormat": "yyyy/MM/dd", "timeFormat": "HH:mm", "numberFormat": {"decimal": ".", "thousands": ",", "currency": "¥"}, "pluralRules": ["other"]}', 50);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_locales_updated_at BEFORE UPDATE ON user_locales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locale_metadata_updated_at BEFORE UPDATE ON locale_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
