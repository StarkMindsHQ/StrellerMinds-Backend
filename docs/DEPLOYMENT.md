# Deployment Documentation

## Overview

This document provides comprehensive deployment procedures, troubleshooting guides, and automation scripts for the StrellerMinds Backend application.

## Table of Contents
- [Environment Setup](#environment-setup)
- [Deployment Procedures](#deployment-procedures)
- [Automation Scripts](#automation-scripts)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Security Considerations](#security-considerations)

---

## Environment Setup

### Prerequisites

#### System Requirements
- **Node.js**: 18.x or higher
- **PostgreSQL**: 13.x or higher
- **Redis**: 6.x or higher (for caching and sessions)
- **Nginx**: 1.18+ (for reverse proxy)
- **SSL Certificate**: For HTTPS termination

#### Development Environment
```bash
# Clone repository
git clone https://github.com/StarkMindsHQ/StrellerMinds-Backend.git
cd StrellerMinds-Backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.development

# Setup database
npm run migration:run

# Start development server
npm run start:dev
```

#### Production Environment
```bash
# System dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx

# Node.js version management
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 for process management
sudo npm install -g pm2
```

### Environment Variables

#### Required Environment Variables
```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=strellerminds_prod

# JWT Configuration
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Webhook Security
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret
ZOOM_WEBHOOK_SECRET=your_zoom_webhook_secret

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Application Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.strellerminds.com
FRONTEND_URL=https://strellerminds.com

# Monitoring
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
LOG_LEVEL=info
```

#### Environment-Specific Configurations
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_HOST=localhost
REDIS_HOST=localhost

# .env.staging
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_HOST=staging-db.example.com
REDIS_HOST=staging-redis.example.com

# .env.production
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_HOST=prod-db.example.com
REDIS_HOST=prod-redis.example.com
```

---

## Deployment Procedures

### Development Deployment

#### Local Development
```bash
# 1. Setup environment
cp .env.example .env.development
# Edit .env.development with your settings

# 2. Install dependencies
npm install

# 3. Setup database
npm run migration:run

# 4. Start development server
npm run start:dev

# 5. Verify deployment
curl http://localhost:3000/health
```

#### Docker Development
```bash
# Build development image
docker build -t strellerminds-backend:dev -f Dockerfile.dev .

# Run with development configuration
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -v $(pwd)/.env.development:/app/.env \
  strellerminds-backend:dev
```

### Staging Deployment

#### Manual Staging Deployment
```bash
# 1. Prepare staging environment
ssh staging-server
cd /var/www/strellerminds-backend

# 2. Backup current version
cp -r current current.backup.$(date +%Y%m%d_%H%M%S)

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies
npm ci --production

# 5. Run database migrations
npm run migration:run

# 6. Build application
npm run build

# 7. Restart application
pm2 restart strellerminds-backend

# 8. Verify deployment
curl https://staging-api.strellerminds.com/health
```

#### Automated Staging Deployment
```bash
# Using deployment script
./scripts/deploy.sh staging

# Or using CI/CD pipeline
# GitHub Actions will automatically deploy to staging on push to main branch
```

### Production Deployment

#### Production Deployment Checklist

**Pre-Deployment Checklist:**
- [ ] All tests passing (`npm run ci:test`)
- [ ] Security scan passed (`npm run security:scan`)
- [ ] Documentation updated (`npm run docs:generate`)
- [ ] Database migrations tested
- [ ] Environment variables verified
- [ ] SSL certificates valid
- [ ] Backup procedures tested
- [ ] Monitoring configured
- [ ] Rollback plan ready

**Deployment Steps:**
```bash
# 1. Prepare production environment
ssh production-server
cd /var/www/strellerminds-backend

# 2. Create deployment branch
git checkout -b deploy-$(date +%Y%m%d_%H%M%S)
git pull origin main

# 3. Backup current deployment
./scripts/backup.sh production

# 4. Zero-downtime deployment
./scripts/deploy.sh production

# 5. Post-deployment verification
./scripts/verify-deployment.sh production
```

#### Blue-Green Deployment
```bash
# 1. Setup green environment
./scripts/setup-green-environment.sh

# 2. Deploy to green environment
./scripts/deploy.sh green

# 3. Test green environment
./scripts/test-environment.sh green

# 4. Switch traffic to green
./scripts/switch-traffic.sh green

# 5. Cleanup blue environment
./scripts/cleanup-blue-environment.sh
```

---

## Automation Scripts

### Deployment Script (`scripts/deploy.sh`)
```bash
#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-staging}
BACKUP_DIR="/var/backups/strellerminds-backend"
APP_DIR="/var/www/strellerminds-backend"
LOG_FILE="/var/log/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$ENVIRONMENT] $1" | tee -a $LOG_FILE
}

# Error handling
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a $LOG_FILE
}

# Warning message
warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Pre-deployment checks
pre_deploy_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if environment exists
    if [ ! -f "$APP_DIR/.env.$ENVIRONMENT" ]; then
        error_exit "Environment file .env.$ENVIRONMENT not found"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "18" ]; then
        error_exit "Node.js version 18+ required. Current version: $(node --version)"
    fi
    
    # Check database connection
    log "Testing database connection..."
    if ! npm run test:db > /dev/null 2>&1; then
        error_exit "Database connection failed"
    fi
    
    # Check Redis connection
    log "Testing Redis connection..."
    if ! npm run test:redis > /dev/null 2>&1; then
        error_exit "Redis connection failed"
    fi
    
    success "Pre-deployment checks passed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup application files
    cp -r "$APP_DIR/current" "$BACKUP_PATH/app"
    
    # Backup database
    pg_dump strellerminds_prod > "$BACKUP_PATH/database.sql"
    
    # Backup environment files
    cp "$APP_DIR/.env.$ENVIRONMENT" "$BACKUP_PATH/"
    
    success "Backup created: $BACKUP_PATH"
}

# Deploy application
deploy_app() {
    log "Starting application deployment..."
    
    cd "$APP_DIR"
    
    # Pull latest code
    git pull origin main
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Run database migrations
    log "Running database migrations..."
    npm run migration:run
    
    # Build application
    log "Building application..."
    npm run build
    
    # Run tests
    log "Running tests..."
    npm run test:unit
    
    # Update current symlink
    ln -sfn "$(pwd)" current
    
    success "Application deployed successfully"
}

# Restart services
restart_services() {
    log "Restarting application services..."
    
    # Restart application with PM2
    pm2 reload strellerminds-backend || pm2 start ecosystem.config.js --env "$ENVIRONMENT"
    
    # Restart nginx if needed
    if [ "$ENVIRONMENT" = "production" ]; then
        sudo nginx -t && sudo systemctl reload nginx
    fi
    
    success "Services restarted successfully"
}

# Post-deployment verification
post_deploy_verification() {
    log "Starting post-deployment verification..."
    
    # Wait for application to start
    sleep 10
    
    # Health check
    HEALTH_URL="http://localhost:3000/health"
    if [ "$ENVIRONMENT" = "production" ]; then
        HEALTH_URL="https://api.strellerminds.com/health"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        HEALTH_URL="https://staging-api.strellerminds.com/health"
    fi
    
    # Check health endpoint
    for i in {1..30}; do
        if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
            success "Health check passed"
            break
        fi
        
        if [ $i -eq 30 ]; then
            error_exit "Health check failed after 30 attempts"
        fi
        
        sleep 2
    done
    
    # Check critical endpoints
    ENDPOINTS=("/api/users" "/webhooks/stripe" "/health")
    for endpoint in "${ENDPOINTS[@]}"; do
        if ! curl -f "http://localhost:3000$endpoint" > /dev/null 2>&1; then
            warning "Endpoint $endpoint not responding"
        fi
    done
    
    success "Post-deployment verification completed"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep last 7 days of backups
    find "$BACKUP_DIR" -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;
    
    success "Old backups cleaned up"
}

# Main deployment function
main() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    pre_deploy_checks
    backup_current
    deploy_app
    restart_services
    post_deploy_verification
    cleanup_backups
    
    success "Deployment to $ENVIRONMENT completed successfully!"
}

# Rollback function
rollback() {
    log "Starting rollback process..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error_exit "No backup found for rollback"
    fi
    
    log "Rolling back to backup: $LATEST_BACKUP"
    
    # Restore application
    rm -rf "$APP_DIR/current"
    cp -r "$BACKUP_DIR/$LATEST_BACKUP/app" "$APP_DIR/current"
    
    # Restore database
    psql strellerminds_prod < "$BACKUP_DIR/$LATEST_BACKUP/database.sql"
    
    # Restart services
    restart_services
    
    success "Rollback completed successfully"
}

# Handle rollback argument
if [ "$2" = "rollback" ]; then
    rollback
    exit 0
fi

# Run main deployment
main
```

### Health Check Script (`scripts/verify-deployment.sh`)
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}
BASE_URL="http://localhost:3000"

if [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://api.strellerminds.com"
elif [ "$ENVIRONMENT" = "staging" ]; then
    BASE_URL="https://staging-api.strellerminds.com"
fi

echo "Verifying deployment to $ENVIRONMENT at $BASE_URL"

# Health check
echo "Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL/health")
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" -ne "200" ]; then
    echo "❌ Health check failed with HTTP $HTTP_CODE"
    exit 1
fi

echo "✅ Health check passed"

# Check critical endpoints
ENDPOINTS=(
    "/health"
    "/api/docs"
    "/admin/webhooks/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Checking $endpoint..."
    RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" -ne "200" ]; then
        echo "❌ Endpoint $endpoint failed with HTTP $HTTP_CODE"
        exit 1
    fi
    
    echo "✅ $endpoint responding correctly"
done

# Check database connectivity
echo "Checking database connectivity..."
DB_CHECK=$(curl -s "$BASE_URL/health" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
if [ "$DB_CHECK" != "healthy" ]; then
    echo "❌ Database connectivity check failed"
    exit 1
fi

echo "✅ Database connectivity OK"

# Check Redis connectivity
echo "Checking Redis connectivity..."
REDIS_CHECK=$(curl -s "$BASE_URL/health" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4)
if [ "$REDIS_CHECK" != "healthy" ]; then
    echo "❌ Redis connectivity check failed"
    exit 1
fi

echo "✅ Redis connectivity OK"

echo "🎉 All verification checks passed!"
```

### Backup Script (`scripts/backup.sh`)
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-production}
BACKUP_DIR="/var/backups/strellerminds-backend"
APP_DIR="/var/www/strellerminds-backend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting backup for $ENVIRONMENT environment..."

# Create backup directory
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
mkdir -p "$BACKUP_PATH"

# Backup application files
echo "Backing up application files..."
cp -r "$APP_DIR/current" "$BACKUP_PATH/app"

# Backup database
echo "Backing up database..."
pg_dump strellerminds_$ENVIRONMENT > "$BACKUP_PATH/database.sql"

# Backup environment files
echo "Backing up environment files..."
cp "$APP_DIR/.env.$ENVIRONMENT" "$BACKUP_PATH/"

# Backup PM2 configuration
echo "Backing up PM2 configuration..."
pm2 save > "$BACKUP_PATH/pm2_dump.json"

# Create backup metadata
cat > "$BACKUP_PATH/metadata.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "backup_size": "$(du -sh $BACKUP_PATH | cut -f1)"
}
EOF

# Compress backup
echo "Compressing backup..."
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "backup_$TIMESTAMP"
rm -rf "$BACKUP_PATH"

echo "✅ Backup completed: backup_$TIMESTAMP.tar.gz"

# Cleanup old backups (keep last 30 days)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete

echo "✅ Backup process completed successfully!"
```

---

## Troubleshooting

### Common Issues

#### Application Won't Start
**Symptoms**: PM2 shows app as stopped or restarting continuously

**Troubleshooting Steps**:
```bash
# 1. Check application logs
pm2 logs strellerminds-backend --lines 50

# 2. Check environment variables
cat /var/www/strellerminds-backend/.env.production

# 3. Check database connection
npm run test:db

# 4. Check Node.js version
node --version

# 5. Check port availability
netstat -tlnp | grep :3000

# 6. Restart application
pm2 restart strellerminds-backend
```

**Common Causes**:
- Missing environment variables
- Database connection issues
- Port conflicts
- Node.js version incompatibility
- Missing dependencies

#### Database Connection Issues
**Symptoms**: Database connection timeout or authentication errors

**Troubleshooting Steps**:
```bash
# 1. Test database connectivity
psql -h localhost -U strellerminds -d strellerminds_prod

# 2. Check PostgreSQL status
sudo systemctl status postgresql

# 3. Check database logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log

# 4. Verify database credentials
grep DATABASE_ /var/www/strellerminds-backend/.env.production

# 5. Check network connectivity
telnet localhost 5432
```

#### Redis Connection Issues
**Symptoms**: Cache or session errors

**Troubleshooting Steps**:
```bash
# 1. Test Redis connectivity
redis-cli ping

# 2. Check Redis status
sudo systemctl status redis

# 3. Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# 4. Verify Redis configuration
grep REDIS_ /var/www/strellerminds-backend/.env.production

# 5. Check Redis memory usage
redis-cli info memory
```

#### SSL Certificate Issues
**Symptoms**: HTTPS errors or certificate warnings

**Troubleshooting Steps**:
```bash
# 1. Check certificate validity
openssl x509 -in /etc/ssl/certs/strellerminds.com.crt -text -noout

# 2. Check certificate expiration
openssl x509 -in /etc/ssl/certs/strellerminds.com.crt -noout -dates

# 3. Test SSL configuration
sudo nginx -t

# 4. Check certificate chain
curl -vI https://strellerminds.com

# 5. Reload nginx if needed
sudo systemctl reload nginx
```

### Performance Issues

#### High Memory Usage
**Symptoms**: Application consuming excessive memory

**Troubleshooting Steps**:
```bash
# 1. Check memory usage
pm2 monit

# 2. Check Node.js heap
node --inspect --max-old-space-size=4096 dist/src/main.js

# 3. Profile memory usage
npm run profile:memory

# 4. Check for memory leaks
npm run test:memory-leaks

# 5. Optimize garbage collection
node --optimize-for-size --max-old-space-size=2048 dist/src/main.js
```

#### Slow Database Queries
**Symptoms**: API responses are slow

**Troubleshooting Steps**:
```bash
# 1. Check slow queries
sudo -u postgres psql strellerminds_prod -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# 2. Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

# 3. Check database indexes
sudo -u postgres psql strellerminds_prod -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'users';"

# 4. Update database statistics
sudo -u postgres psql strellerminds_prod -c "ANALYZE;"

# 5. Rebuild indexes if needed
sudo -u postgres psql strellerminds_prod -c "REINDEX DATABASE strellerminds_prod;"
```

### Security Issues

#### Unauthorized Access
**Symptoms**: Security breaches or unauthorized API calls

**Troubleshooting Steps**:
```bash
# 1. Check access logs
sudo tail -f /var/log/nginx/access.log | grep -v "200\|301\|302"

# 2. Check failed authentication
grep "Unauthorized" /var/www/strellerminds-backend/logs/app.log

# 3. Review JWT tokens
npm run audit:jwt

# 4. Check webhook security
curl -I https://api.strellerminds.com/admin/webhooks/health

# 5. Scan for vulnerabilities
npm run security:scan
```

#### Webhook Security Issues
**Symptoms**: Invalid webhook signatures or replay attacks

**Troubleshooting Steps**:
```bash
# 1. Check webhook logs
grep "webhook" /var/www/strellerminds-backend/logs/app.log | tail -20

# 2. Verify webhook secrets
grep -E "(STRIPE|PAYPAL|ZOOM)_WEBHOOK_SECRET" /var/www/strellerminds-backend/.env.production

# 3. Test webhook security
npm run test:webhook-security

# 4. Check rate limiting
curl -H "X-Forwarded-For: 192.168.1.100" https://api.strellerminds.com/webhooks/test

# 5. Monitor replay attacks
grep "replay" /var/www/strellerminds-backend/logs/app.log
```

---

## Rollback Procedures

### Emergency Rollback

#### Immediate Rollback (Last Known Good)
```bash
# 1. Identify latest good backup
LATEST_BACKUP=$(ls -lt /var/backups/strellerminds-backend/ | grep "backup_" | head -n 1 | awk '{print $9}')

# 2. Stop current application
pm2 stop strellerminds-backend

# 3. Rollback application
cd /var/www/strellerminds-backend
rm -rf current
tar -xzf "/var/backups/strellerminds-backend/$LATEST_BACKUP" -C .
mv backup_* current

# 4. Rollback database
psql strellerminds_prod < current/database.sql

# 5. Restore environment
cp current/.env.production .env.production

# 6. Restart application
pm2 start ecosystem.config.js --env production

# 7. Verify rollback
curl -f https://api.strellerminds.com/health
```

#### Git Rollback
```bash
# 1. Identify stable commit
git log --oneline -10

# 2. Rollback to specific commit
git checkout <stable-commit-hash>

# 3. Force push (careful!)
git push --force-with-lease origin main

# 4. Redeploy
./scripts/deploy.sh production
```

### Database Rollback

#### Migration Rollback
```bash
# 1. Check migration status
npm run migration:show

# 2. Rollback last migration
npm run migration:revert

# 3. Verify database state
psql strellerminds_prod -c "\dt"

# 4. Test application
npm run test:integration
```

#### Full Database Restore
```bash
# 1. Stop application
pm2 stop strellerminds-backend

# 2. Drop current database
sudo -u postgres dropdb strellerminds_prod

# 3. Create new database
sudo -u postgres createdb strellerminds_prod

# 4. Restore from backup
psql strellerminds_prod < /path/to/backup.sql

# 5. Run migrations
npm run migration:run

# 6. Restart application
pm2 start strellerminds-backend
```

### Service Rollback

#### Nginx Configuration Rollback
```bash
# 1. Backup current config
sudo cp /etc/nginx/sites-available/strellerminds /etc/nginx/sites-available/strellerminds.backup

# 2. Restore previous config
sudo cp /etc/nginx/sites-available/strellerminds.backup.previous /etc/nginx/sites-available/strellerminds

# 3. Test configuration
sudo nginx -t

# 4. Reload nginx
sudo systemctl reload nginx
```

#### PM2 Configuration Rollback
```bash
# 1. Stop all processes
pm2 delete all

# 2. Restore PM2 dump
pm2 resurrect /path/to/pm2_dump.json

# 3. Verify processes
pm2 status

# 4. Save current state
pm2 save
```

---

## Monitoring & Health Checks

### Health Check Endpoints

#### Application Health
```bash
# Basic health check
curl https://api.strellerminds.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "database": "healthy",
  "redis": "healthy",
  "memory": {
    "used": "256MB",
    "total": "512MB"
  },
  "cpu": {
    "usage": "15%"
  }
}
```

#### Webhook Health
```bash
# Webhook system health
curl https://api.strellerminds.com/admin/webhooks/health

# Expected response
{
  "isHealthy": true,
  "issues": [],
  "recommendations": [],
  "statistics": {
    "total": 1250,
    "success": 1198,
    "failed": 52,
    "averageDuration": 45.2
  }
}
```

### Monitoring Setup

#### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# Start monitoring
pm2 server

# View monitoring dashboard
# Visit: http://localhost:9615
```

#### Application Metrics
```bash
# Enable metrics collection
export METRICS_ENABLED=true
export METRICS_PORT=9090

# Start application with metrics
npm run start:prod

# Access metrics
curl http://localhost:9090/metrics
```

#### Log Monitoring
```bash
# Monitor application logs
tail -f /var/www/strellerminds-backend/logs/app.log

# Monitor error logs
tail -f /var/www/strellerminds-backend/logs/error.log

# Monitor webhook logs
grep "webhook" /var/www/strellerminds-backend/logs/app.log | tail -f
```

### Alerting Setup

#### Critical Alerts
```bash
# Create alert script
cat > /usr/local/bin/strellerminds-alert.sh << 'EOF'
#!/bin/bash

# Check application health
HEALTH=$(curl -s https://api.strellerminds.com/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH" != "healthy" ]; then
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
         -H 'Content-type: application/json' \
         --data '{"text":"🚨 StrellerMinds Backend is DOWN!"}'
fi

# Check error rate
ERROR_RATE=$(tail -1000 /var/www/strellerminds-backend/logs/app.log | grep -c "ERROR" || echo 0)
if [ "$ERROR_RATE" -gt "10" ]; then
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
         -H 'Content-type: application/json' \
         --data "{\"text\":\"⚠️ High error rate: $ERROR_RATE errors in last 1000 log lines\"}"
fi
EOF

chmod +x /usr/local/bin/strellerminds-alert.sh

# Add to crontab
echo "*/5 * * * * /usr/local/bin/strellerminds-alert.sh" | crontab -
```

---

## Security Considerations

### Production Security Checklist

#### Environment Security
- [ ] Environment variables are properly secured
- [ ] Database credentials are strong and rotated regularly
- [ ] SSL certificates are valid and auto-renewed
- [ ] Firewall rules are properly configured
- [ ] Access logs are monitored and retained

#### Application Security
- [ ] JWT secrets are cryptographically strong
- [ ] Webhook secrets are unique per provider
- [ ] Rate limiting is properly configured
- [ ] Input validation is comprehensive
- [ ] Security headers are properly set

#### Infrastructure Security
- [ ] Servers are patched and updated
- [ ] SSH keys are used instead of passwords
- [ ] Backup encryption is enabled
- [ ] Network segmentation is implemented
- [ ] Intrusion detection is configured

### Security Monitoring

#### Automated Security Scans
```bash
# Daily security scan
0 2 * * * /var/www/strellerminds-backend/npm run security:scan

# Weekly vulnerability assessment
0 3 * * 0 /var/www/strellerminds-backend/npm run audit:security

# Monthly penetration testing
0 4 1 * * /usr/local/bin/run-pentest.sh
```

#### Log Monitoring
```bash
# Monitor for security events
grep -E "(Unauthorized|Forbidden|Attack|Breach)" /var/www/strellerminds-backend/logs/app.log

# Monitor for suspicious IP addresses
grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -nr | head -20

# Monitor for webhook anomalies
grep -E "(replay|signature|rate.limit)" /var/www/strellerminds-backend/logs/app.log
```

### Incident Response

#### Security Incident Procedure
1. **Detection**: Automated alerts or manual discovery
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore services from clean backups
6. **Lessons Learned**: Document and improve procedures

#### Emergency Contacts
- **Security Team**: security@strellerminds.com
- **DevOps Team**: devops@strellerminds.com
- **Management**: management@strellerminds.com

---

This deployment documentation provides comprehensive procedures for deploying, monitoring, and maintaining the StrellerMinds Backend application across all environments. Regular updates and testing of these procedures ensure reliable and secure deployments.
