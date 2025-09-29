-- Data Quality Rules Table
CREATE TABLE data_quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('completeness', 'accuracy', 'consistency', 'validity', 'uniqueness', 'timeliness', 'conformity')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft', 'deprecated')),
    entity_type VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL,
    parameters JSONB,
    sql_query TEXT,
    error_message TEXT,
    threshold DECIMAL(5,2) DEFAULT 0,
    auto_fix BOOLEAN DEFAULT FALSE,
    fix_actions JSONB,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for data_quality_rules
CREATE INDEX idx_data_quality_rules_entity_status ON data_quality_rules(entity_type, status);
CREATE INDEX idx_data_quality_rules_type_severity ON data_quality_rules(rule_type, severity);

-- Data Quality Metrics Table
CREATE TABLE data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES data_quality_rules(id),
    entity_type VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL CHECK (metric_category IN ('completeness', 'accuracy', 'consistency', 'validity', 'uniqueness', 'timeliness', 'overall')),
    metric_name VARCHAR(255) NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    threshold DECIMAL(10,4),
    passed BOOLEAN DEFAULT TRUE,
    details JSONB,
    dimensions JSONB,
    timestamp TIMESTAMP NOT NULL,
    granularity VARCHAR(10) DEFAULT '1h',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for data_quality_metrics
CREATE INDEX idx_data_quality_metrics_entity_category_time ON data_quality_metrics(entity_type, metric_category, timestamp);
CREATE INDEX idx_data_quality_metrics_rule_time ON data_quality_metrics(rule_id, timestamp);

-- Data Quality Issues Table
CREATE TABLE data_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES data_quality_rules(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'ignored')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    issue_data JSONB NOT NULL,
    context JSONB,
    resolution TEXT,
    assigned_to VARCHAR(100),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,
    occurrence_count INTEGER DEFAULT 0,
    first_occurrence TIMESTAMP NOT NULL,
    last_occurrence TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for data_quality_issues
CREATE INDEX idx_data_quality_issues_status_priority ON data_quality_issues(status, priority);
CREATE INDEX idx_data_quality_issues_entity_rule ON data_quality_issues(entity_type, rule_id);
CREATE INDEX idx_data_quality_issues_created_status ON data_quality_issues(created_at, status);

-- Data Governance Policies Table
CREATE TABLE data_governance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('data_retention', 'data_access', 'data_classification', 'data_privacy', 'data_quality', 'data_lineage')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft', 'under_review')),
    entity_type VARCHAR(100) NOT NULL,
    rules JSONB NOT NULL,
    enforcement JSONB,
    exceptions JSONB,
    owner VARCHAR(100),
    stakeholders TEXT[],
    effective_date DATE,
    expiration_date DATE,
    review_date DATE,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for data_governance_policies
CREATE INDEX idx_data_governance_policies_type_status ON data_governance_policies(policy_type, status);
CREATE INDEX idx_data_governance_policies_entity_status ON data_governance_policies(entity_type, status);

-- Data Lineage Table
CREATE TABLE data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity VARCHAR(255) NOT NULL,
    source_field VARCHAR(255),
    target_entity VARCHAR(255) NOT NULL,
    target_field VARCHAR(255),
    lineage_type VARCHAR(50) NOT NULL CHECK (lineage_type IN ('source', 'transformation', 'destination', 'dependency')),
    transformation_logic TEXT,
    metadata JSONB,
    process_name VARCHAR(255),
    process_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for data_lineage
CREATE INDEX idx_data_lineage_source_target ON data_lineage(source_entity, target_entity);
CREATE INDEX idx_data_lineage_type_created ON data_lineage(lineage_type, created_at);

-- Data Quality Reports Table
CREATE TABLE data_quality_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'adhoc')),
    status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    report_date TIMESTAMP NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    summary JSONB NOT NULL,
    metrics JSONB NOT NULL,
    issues JSONB,
    recommendations JSONB,
    file_path TEXT,
    generated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for data_quality_reports
CREATE INDEX idx_data_quality_reports_type_created ON data_quality_reports(report_type, created_at);
CREATE INDEX idx_data_quality_reports_status_created ON data_quality_reports(status, created_at);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_quality_rules_updated_at BEFORE UPDATE ON data_quality_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_quality_issues_updated_at BEFORE UPDATE ON data_quality_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_governance_policies_updated_at BEFORE UPDATE ON data_governance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_lineage_updated_at BEFORE UPDATE ON data_lineage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
