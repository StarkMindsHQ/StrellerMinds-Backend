# CI/CD Pipeline Enhancement Guide

## Overview

This document describes the enhanced CI/CD pipeline for the StrellerMinds Backend application, featuring comprehensive automated testing, blue-green deployment, automated rollback mechanisms, and pipeline monitoring.

## Architecture

### Pipeline Components

1. **Enhanced GitHub Actions Workflows**
   - Comprehensive testing pipeline
   - Security scanning and quality gates
   - Blue-green deployment strategy
   - Automated rollback mechanisms
   - Pipeline monitoring and notifications

2. **Deployment Strategy**
   - Blue-green deployments for zero downtime
   - Automated health checks and smoke tests
   - Emergency rollback capabilities
   - Database backup and restore automation

3. **Monitoring and Alerting**
   - Real-time deployment monitoring
   - Performance metrics collection
   - Slack and PagerDuty integrations
   - Grafana dashboards

## Workflows

### 1. Enhanced CI/CD Pipeline (`.github/workflows/enhanced-ci-cd.yml`)

**Triggers:**
- Push to `main`, `develop`, `staging` branches
- Pull requests to `main`, `develop`
- Manual workflow dispatch with environment selection

**Jobs:**
- `build-and-test`: Comprehensive testing and Docker image building
- `security-scan`: Vulnerability scanning with Trivy and Snyk
- `performance-test`: Load testing and performance baselines
- `deploy-staging`: Blue-green deployment to staging
- `deploy-production`: Blue-green deployment to production with approval gates
- `rollback`: Manual rollback capability
- `post-deployment-monitoring`: Extended health checks and monitoring
- `cleanup`: Resource cleanup and metrics update
- `validate-migrations`: Database migration validation

### 2. Comprehensive Testing Pipeline (`.github/workflows/comprehensive-testing.yml`)

**Test Types:**
- Code quality and linting
- Unit tests (multiple Node.js versions)
- Integration tests with PostgreSQL and Redis
- End-to-end tests with Cypress
- Performance tests with Artillery
- Security tests with Snyk and OWASP ZAP
- Accessibility tests
- Coverage gates (80% threshold)

### 3. Database Migration Gate (`.github/workflows/database-migration-check.yml`)

**Triggers:**
- Pull requests to `main`, `develop`, `staging`

**Jobs:**
- `validate-migrations`: Validates database migrations against a seeded PostgreSQL instance.
  - Sets up Node.js and PostgreSQL.
  - Installs dependencies and runs migrations.
  - Runs `db:validate` and `db:status` to check for pending migrations or mismatches.
  - Fails the job if any issues are found.
  - Uploads migration logs as a CI artifact.

## Deployment Scripts

### Blue-Green Deployment (`scripts/blue-green-deploy.sh`)

**Features:**
- Zero-downtime deployments
- Automatic color switching (blue/green)
- Health checks before traffic switch
- Rollback on deployment failure
- Kubernetes integration

**Usage:**
```bash
./scripts/blue-green-deploy.sh <environment> <image_tag>
```

### Rollback Mechanisms

#### Standard Rollback (`scripts/rollback.sh`)
- Controlled rollback to previous version
- Health validation
- State persistence for audit

#### Emergency Rollback (`scripts/emergency-rollback.sh`)
- Fast rollback for critical issues
- Maintenance mode fallback
- Emergency notifications

**Usage:**
```bash
# Standard rollback
./scripts/rollback.sh <environment> [version]

# Emergency rollback
./scripts/emergency-rollback.sh <environment>
```

## Monitoring and Testing

### Smoke Tests (`scripts/smoke-tests.sh`)
- Health endpoint validation
- API endpoint testing
- Security headers verification
- Performance checks
- SSL certificate validation

### Deployment Monitoring (`scripts/monitor-deployment.sh`)
- Real-time health monitoring
- Error rate tracking
- Resource usage monitoring
- Automated alerting

### Pipeline Monitoring (`scripts/pipeline-monitoring.sh`)
- Metrics collection
- Grafana dashboard setup
- Alerting rules configuration
- Notification channels

## Security

### Security Scanning (`scripts/security-scan.sh`)
- npm audit for dependency vulnerabilities
- Snyk security scanning
- Container image scanning with Trivy
- SAST with Semgrep
- License compliance checking

### Security Features
- Container security contexts
- Non-root user execution
- Read-only root filesystems
- Dropped capabilities
- Network policies (when configured)

## Database Management

### Backup (`scripts/backup-database.sh`)
- Pre-deployment backups
- Compressed storage
- Cloud storage integration (S3)
- Retention policies

### Restore (`scripts/restore-database.sh`)
- Emergency database restoration
- Pre-restore safety backups
- Verification checks
- Rollback capabilities

## Kubernetes Configuration

### Manifests Structure
```
k8s/
├── namespace.yaml          # Environment namespaces
├── secrets.yaml           # Application secrets
├── configmap.yaml         # Environment configuration
├── deployment.yaml        # Blue-green deployments
├── service.yaml           # Load balancer and color services
├── ingress.yaml           # Traffic routing with SSL
└── hpa.yaml              # Horizontal pod autoscaling
```

### Environment Separation
- **Staging**: `strellerminds-staging` namespace
- **Production**: `strellerminds-production` namespace

### Resource Configuration
- **Staging**: 3 replicas, 256Mi-512Mi memory, 250m-500m CPU
- **Production**: 5 replicas, 512Mi-1Gi memory, 500m-1000m CPU

## Package.json Scripts

### CI/CD Scripts
```json
{
  "ci:build": "npm ci && npm run lint && npm run test:coverage:unit && npm run build",
  "ci:test:full": "npm run test:coverage:unit && npm run test:coverage:integration && npm run test:e2e",
  "ci:security": "npm run security:audit && npm run security:snyk",
  "ci:performance": "npm run perf:baseline && npm run load:test:full",
  "ci:deploy:staging": "npm run ci:build && npm run ci:test:full && npm run deploy:staging",
  "ci:deploy:production": "npm run ci:build && npm run ci:test:full && npm run ci:security && npm run deploy:production"
}
```

### Deployment Scripts
```json
{
  "deploy:staging": "./scripts/blue-green-deploy.sh staging",
  "deploy:production": "./scripts/blue-green-deploy.sh production",
  "rollback:staging": "./scripts/rollback.sh staging",
  "rollback:production": "./scripts/rollback.sh production",
  "rollback:emergency": "./scripts/emergency-rollback.sh"
}
```

### Monitoring Scripts
```json
{
  "smoke:test:staging": "./scripts/smoke-tests.sh staging",
  "smoke:test:production": "./scripts/smoke-tests.sh production",
  "monitor:deployment": "./scripts/monitor-deployment.sh",
  "pipeline:monitor": "./scripts/pipeline-monitoring.sh"
}
```

## Environment Variables

### Required Secrets
- `GITHUB_TOKEN`: GitHub API access
- `SNYK_TOKEN`: Snyk security scanning
- `SLACK_WEBHOOK_URL`: Slack notifications
- `PAGERDUTY_INTEGRATION_KEY`: PagerDuty alerts
- `KUBE_CONFIG_STAGING`: Kubernetes config for staging
- `KUBE_CONFIG_PRODUCTION`: Kubernetes config for production
- `PROD_DB_*`: Production database credentials
- `STAGING_DB_*`: Staging database credentials

### Optional Configuration
- `GRAFANA_API_KEY`: Grafana dashboard management
- `METRICS_API_KEY`: Metrics collection
- `AWS_S3_BACKUP_BUCKET`: Database backup storage
- `BACKUP_RETENTION_DAYS`: Backup retention period

## Usage Examples

### Manual Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Rollback staging
npm run rollback:staging

# Emergency rollback production
npm run rollback:emergency production
```

### Testing Pipeline
```bash
# Run all CI tests
npm run ci:test:full

# Run security scans
npm run ci:security

# Run performance tests
npm run ci:performance

# Test pipeline configuration
./scripts/pipeline-tests.sh
```

### Monitoring
```bash
# Run smoke tests
npm run smoke:test:production

# Monitor deployment
npm run monitor:deployment production 300

# Setup pipeline monitoring
npm run pipeline:monitor production
```

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check pod logs: `kubectl logs -f deployment/strellerminds-backend-production-blue -n strellerminds-production`
   - Verify health endpoints: `curl https://production.strellerminds.com/health`
   - Check resource limits and requests

2. **Rollback Issues**
   - Verify previous deployment exists
   - Check deployment state ConfigMaps
   - Use emergency rollback for critical issues

3. **Security Scan Failures**
   - Update dependencies: `npm audit fix`
   - Review Snyk recommendations
   - Check container base image updates

4. **Performance Issues**
   - Review load test results
   - Check resource utilization
   - Verify database performance
   - Monitor error rates

### Monitoring Dashboards

- **Grafana**: `https://grafana.strellerminds.com/d/deployment-pipeline`
- **Metrics**: `https://metrics.strellerminds.com`
- **Logs**: Kubernetes logs via kubectl or monitoring solution

## Best Practices

1. **Always test in staging first**
2. **Use feature flags for risky changes**
3. **Monitor deployments for at least 5 minutes**
4. **Keep rollback procedures tested and ready**
5. **Maintain comprehensive test coverage (>80%)**
6. **Regular security scanning and updates**
7. **Document all configuration changes**
8. **Use infrastructure as code principles**

## Support and Maintenance

- **Pipeline Tests**: Run `./scripts/pipeline-tests.sh` regularly
- **Security Updates**: Weekly dependency and image updates
- **Monitoring**: 24/7 monitoring with automated alerts
- **Backup Verification**: Monthly backup restoration tests
- **Documentation**: Keep this guide updated with changes
