#!/bin/bash

set -e

# StrellerMinds Backend Deployment Script
# Usage: ./scripts/deploy.sh [environment] [rollback]
# Environments: development, staging, production

# Configuration
ENVIRONMENT=${1:-staging}
BACKUP_DIR="/var/backups/strellerminds-backend"
APP_DIR="/var/www/strellerminds-backend"
LOG_FILE="/var/log/deploy.log"
HEALTH_CHECK_TIMEOUT=300
MAX_RETRIES=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Info message
info() {
    echo -e "${BLUE}INFO: $1${NC}" | tee -a $LOG_FILE
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        error_exit "Invalid environment: $ENVIRONMENT. Valid options: development, staging, production"
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        read -p "⚠️  You are deploying to PRODUCTION. Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            error_exit "Production deployment cancelled"
        fi
    fi
}

# Pre-deployment checks
pre_deploy_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if environment file exists
    ENV_FILE="$APP_DIR/.env.$ENVIRONMENT"
    if [ ! -f "$ENV_FILE" ]; then
        error_exit "Environment file $ENV_FILE not found"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "18" ]; then
        error_exit "Node.js version 18+ required. Current version: $(node --version)"
    fi
    
    # Check if required directories exist
    if [ ! -d "$APP_DIR" ]; then
        error_exit "Application directory $APP_DIR not found"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df "$APP_DIR" | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt "1048576" ]; then # 1GB in KB
        warning "Low disk space: ${AVAILABLE_SPACE}KB available"
    fi
    
    # Check database connection
    log "Testing database connection..."
    cd "$APP_DIR"
    if ! npm run test:db > /dev/null 2>&1; then
        error_exit "Database connection failed"
    fi
    
    # Check Redis connection
    log "Testing Redis connection..."
    if ! npm run test:redis > /dev/null 2>&1; then
        error_exit "Redis connection failed"
    fi
    
    # Run security scan
    log "Running security scan..."
    SECURITY_OUTPUT=$(npm run security:scan 2>&1 || true)
    if echo "$SECURITY_OUTPUT" | grep -q "vulnerabilities"; then
        warning "Security vulnerabilities detected. Review output:"
        echo "$SECURITY_OUTPUT"
        read -p "Continue with deployment despite vulnerabilities? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            error_exit "Deployment cancelled due to security vulnerabilities"
        fi
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup of current deployment..."
    
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)_$ENVIRONMENT"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup application files
    if [ -d "$APP_DIR/current" ]; then
        cp -r "$APP_DIR/current" "$BACKUP_PATH/app"
        log "Application files backed up"
    else
        warning "No current application found to backup"
    fi
    
    # Backup database
    DB_NAME="strellerminds_$ENVIRONMENT"
    if pg_dump "$DB_NAME" > "$BACKUP_PATH/database.sql" 2>/dev/null; then
        log "Database backed up"
    else
        warning "Database backup failed"
    fi
    
    # Backup environment files
    cp "$ENV_FILE" "$BACKUP_PATH/"
    
    # Backup PM2 configuration
    if command -v pm2 &> /dev/null; then
        pm2 save > "$BACKUP_PATH/pm2_dump.json" 2>/dev/null || true
        log "PM2 configuration backed up"
    fi
    
    # Create backup metadata
    cat > "$BACKUP_PATH/metadata.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$ENVIRONMENT",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "git_remote": "$(git remote get-url origin 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "deployer": "$(whoami)",
  "backup_size": "$(du -sh $BACKUP_PATH | cut -f1)"
}
EOF
    
    # Compress backup
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
    rm -rf "$BACKUP_PATH"
    
    # Store backup name for potential rollback
    echo "$BACKUP_NAME.tar.gz" > "$BACKUP_DIR/last_backup_$ENVIRONMENT"
    
    success "Backup created: $BACKUP_NAME.tar.gz"
}

# Deploy application
deploy_app() {
    log "Starting application deployment..."
    
    cd "$APP_DIR"
    
    # Store current git state
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    # Pull latest code
    log "Pulling latest code..."
    git fetch origin
    git reset --hard origin/main
    
    # Verify git pull
    NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    if [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
        log "Updated from commit $CURRENT_COMMIT to $NEW_COMMIT"
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Verify installation
    if [ ! -d "node_modules" ]; then
        error_exit "Dependencies installation failed"
    fi
    
    # Run database migrations
    log "Running database migrations..."
    npm run migration:run
    
    # Verify migrations
    log "Verifying migrations..."
    if ! npm run migration:show > /dev/null 2>&1; then
        error_exit "Migration verification failed"
    fi
    
    # Build application
    log "Building application..."
    npm run build
    
    # Verify build
    if [ ! -d "dist" ]; then
        error_exit "Application build failed"
    fi
    
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
    
    cd "$APP_DIR"
    
    # Load environment variables
    set -a
    source ".env.$ENVIRONMENT"
    set +a
    
    # Restart application with PM2
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "strellerminds-backend"; then
            log "Reloading existing PM2 process..."
            pm2 reload strellerminds-backend
        else
            log "Starting new PM2 process..."
            pm2 start ecosystem.config.js --env "$ENVIRONMENT"
        fi
        
        # Save PM2 configuration
        pm2 save
        
        # Setup PM2 startup script
        pm2 startup
    else
        error_exit "PM2 not found. Please install PM2: npm install -g pm2"
    fi
    
    # Restart nginx if needed
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        log "Testing nginx configuration..."
        if sudo nginx -t; then
            sudo systemctl reload nginx
            log "Nginx reloaded successfully"
        else
            error_exit "Nginx configuration test failed"
        fi
    fi
    
    success "Services restarted successfully"
}

# Health check with timeout
health_check() {
    local url=$1
    local timeout=$2
    local counter=0
    
    log "Starting health check for $url (timeout: ${timeout}s)..."
    
    while [ $counter -lt $timeout ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            success "Health check passed"
            return 0
        fi
        
        counter=$((counter + 5))
        sleep 5
        
        if [ $((counter % 30)) -eq 0 ]; then
            log "Health check in progress... (${counter}/${timeout}s)"
        fi
    done
    
    error_exit "Health check failed after ${timeout}s"
}

# Post-deployment verification
post_deploy_verification() {
    log "Starting post-deployment verification..."
    
    # Determine base URL
    BASE_URL="http://localhost:3000"
    if [ "$ENVIRONMENT" = "production" ]; then
        BASE_URL="https://api.strellerminds.com"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        BASE_URL="https://staging-api.strellerminds.com"
    fi
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 10
    
    # Main health check
    health_check "$BASE_URL/health" $HEALTH_CHECK_TIMEOUT
    
    # Check critical endpoints
    ENDPOINTS=("/health" "/api/docs" "/admin/webhooks/health")
    for endpoint in "${ENDPOINTS[@]}"; do
        log "Checking endpoint: $endpoint"
        if ! curl -f -s "$BASE_URL$endpoint" > /dev/null 2>&1; then
            warning "Endpoint $endpoint not responding"
        else
            log "✅ $endpoint responding correctly"
        fi
    done
    
    # Check application health details
    HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
    
    # Check database health
    if echo "$HEALTH_RESPONSE" | grep -q '"database":"healthy"'; then
        log "✅ Database connectivity OK"
    else
        error_exit "Database health check failed"
    fi
    
    # Check Redis health
    if echo "$HEALTH_RESPONSE" | grep -q '"redis":"healthy"'; then
        log "✅ Redis connectivity OK"
    else
        error_exit "Redis health check failed"
    fi
    
    # Check webhook health
    WEBHOOK_RESPONSE=$(curl -s "$BASE_URL/admin/webhooks/health")
    if echo "$WEBHOOK_RESPONSE" | grep -q '"isHealthy":true'; then
        log "✅ Webhook system healthy"
    else
        warning "Webhook system may have issues"
    fi
    
    success "Post-deployment verification completed"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep last 7 days of backups
    DELETED=$(find "$BACKUP_DIR" -name "backup_*_$ENVIRONMENT.tar.gz" -mtime +7 -delete -print)
    
    if [ -n "$DELETED" ]; then
        log "Old backups cleaned up"
    else
        log "No old backups to clean up"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send Slack notification if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        if [ "$status" = "failed" ]; then
            color="danger"
        elif [ "$status" = "warning" ]; then
            color="warning"
        fi
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            2>/dev/null || true
    fi
    
    # Send email notification if configured
    if [ -n "$DEPLOYMENT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "StrellerMinds Deployment [$ENVIRONMENT]: $status" "$DEPLOYMENT_EMAIL"
    fi
}

# Rollback function
rollback() {
    log "Starting rollback process for $ENVIRONMENT..."
    
    LAST_BACKUP_FILE="$BACKUP_DIR/last_backup_$ENVIRONMENT"
    
    if [ ! -f "$LAST_BACKUP_FILE" ]; then
        error_exit "No backup found for rollback"
    fi
    
    BACKUP_NAME=$(cat "$LAST_BACKUP_FILE")
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    if [ ! -f "$BACKUP_PATH" ]; then
        error_exit "Backup file not found: $BACKUP_PATH"
    fi
    
    log "Rolling back to backup: $BACKUP_NAME"
    
    # Extract backup
    TEMP_DIR="/tmp/rollback_$ENVIRONMENT"
    mkdir -p "$TEMP_DIR"
    tar -xzf "$BACKUP_PATH" -C "$TEMP_DIR"
    
    # Find backup directory
    BACKUP_DIR_NAME=$(find "$TEMP_DIR" -name "backup_*" -type d | head -n 1)
    
    if [ -z "$BACKUP_DIR_NAME" ]; then
        error_exit "Invalid backup format"
    fi
    
    # Stop current application
    log "Stopping current application..."
    pm2 stop strellerminds-backend || true
    
    # Restore application
    if [ -d "$BACKUP_DIR_NAME/app" ]; then
        rm -rf "$APP_DIR/current"
        cp -r "$BACKUP_DIR_NAME/app" "$APP_DIR/current"
        log "Application files restored"
    fi
    
    # Restore database
    if [ -f "$BACKUP_DIR_NAME/database.sql" ]; then
        DB_NAME="strellerminds_$ENVIRONMENT"
        log "Restoring database..."
        sudo -u postgres psql -d "$DB_NAME" < "$BACKUP_DIR_NAME/database.sql"
        log "Database restored"
    fi
    
    # Restore environment file
    if [ -f "$BACKUP_DIR_NAME/.env.$ENVIRONMENT" ]; then
        cp "$BACKUP_DIR_NAME/.env.$ENVIRONMENT" "$APP_DIR/"
        log "Environment file restored"
    fi
    
    # Restore PM2 configuration
    if [ -f "$BACKUP_DIR_NAME/pm2_dump.json" ]; then
        pm2 resurrect "$BACKUP_DIR_NAME/pm2_dump.json"
        log "PM2 configuration restored"
    fi
    
    # Cleanup temp directory
    rm -rf "$TEMP_DIR"
    
    # Restart services
    restart_services
    
    # Verify rollback
    post_deploy_verification
    
    success "Rollback completed successfully"
    send_notification "success" "✅ Rollback to $ENVIRONMENT completed successfully"
}

# Main deployment function
main() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    # Send deployment start notification
    send_notification "info" "🚀 Starting deployment to $ENVIRONMENT..."
    
    # Execute deployment steps
    validate_environment
    pre_deploy_checks
    create_backup
    deploy_app
    restart_services
    post_deploy_verification
    cleanup_backups
    
    success "Deployment to $ENVIRONMENT completed successfully!"
    
    # Send success notification
    send_notification "success" "✅ Deployment to $ENVIRONMENT completed successfully!"
    
    # Display deployment summary
    echo
    echo "🎉 Deployment Summary"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo "Application URL: $BASE_URL"
    echo "Health Endpoint: $BASE_URL/health"
    echo
}

# Handle script arguments
case "$2" in
    "rollback")
        rollback
        exit 0
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [environment] [action]"
        echo
        echo "Environments:"
        echo "  development - Deploy to development environment"
        echo "  staging     - Deploy to staging environment"
        echo "  production  - Deploy to production environment"
        echo
        echo "Actions:"
        echo "  (none)      - Deploy application"
        echo "  rollback    - Rollback to last backup"
        echo "  help        - Show this help message"
        echo
        echo "Examples:"
        echo "  $0 staging          # Deploy to staging"
        echo "  $0 production       # Deploy to production"
        echo "  $0 staging rollback  # Rollback staging deployment"
        exit 0
        ;;
esac

# Error handling
trap 'error_exit "Deployment interrupted or failed"' ERR

# Run main deployment
main
