#!/bin/bash

# GitHub Issues Import Script
# Usage: ./import-issues.sh
# Make sure you have GitHub CLI (gh) installed and authenticated

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="LaGodxy/StrellerMinds-Backend"
DELAY=2  # seconds between requests to avoid rate limiting

echo -e "${BLUE}📋 GitHub Issues Import Script${NC}"
echo -e "${BLUE}Repository: ${REPO}${NC}"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) not found. Installing...${NC}"
    echo "Please install GitHub CLI first:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli#installation"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub. Please login...${NC}"
    gh auth login
fi

echo -e "${GREEN}✅ GitHub CLI is ready${NC}"
echo ""

# Function to create issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    echo -e "${BLUE}Creating: ${title}${NC}"
    
    gh issue create \
        --repo "$REPO" \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --silent 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Failed to create: ${title}${NC}"
        return 1
    }
    
    sleep $DELAY
}

# Array to track created issues
created=0
failed=0

# Critical Issues (1-25)
echo -e "${GREEN}🐛 Creating Critical Issues (1-25)...${NC}"

create_issue "Add Input Validation for Auth Endpoints" \
"All authentication endpoints need comprehensive input validation using DTOs with class-validator decorators to prevent injection attacks.\n\n**Acceptance Criteria:**\n- [ ] All endpoints use DTOs\n- [ ] class-validator decorators applied\n- [ ] Custom validation messages\n- [ ] Validation tests added" \
"bug,security,auth" && ((created++)) || ((failed++))

create_issue "Implement Password Strength Requirements" \
"Add password complexity requirements to prevent weak passwords.\n\n**Requirements:**\n- Minimum 8 characters\n- At least 1 uppercase letter\n- At least 1 lowercase letter\n- At least 1 number\n- At least 1 special character\n\n**Acceptance Criteria:**\n- [ ] Password validation on registration\n- [ ] Clear error messages\n- [ ] Frontend validation hints" \
"bug,security,auth" && ((created++)) || ((failed++))

create_issue "Add Rate Limiting to Prevent Brute Force" \
"Implement rate limiting on login endpoints to prevent brute force attacks.\n\n**Requirements:**\n- Max 5 attempts per 15 minutes\n- Progressive delay after failed attempts\n- IP-based tracking\n\n**Acceptance Criteria:**\n- [ ] Rate limiter configured\n- [ ] Redis storage for rate data\n- [ ] Custom error responses\n- [ ] Tests for rate limiting" \
"bug,security,performance" && ((created++)) || ((failed++))

create_issue "Secure JWT Token Storage" \
"Ensure JWT tokens are stored securely using httpOnly cookies instead of localStorage to prevent XSS attacks.\n\n**Acceptance Criteria:**\n- [ ] httpOnly cookies implemented\n- [ ] Secure flag enabled\n- [ ] SameSite attribute set\n- [ ] Token refresh mechanism" \
"bug,security,auth" && ((created++)) || ((failed++))

create_issue "Add CSRF Protection" \
"Implement CSRF tokens for all state-changing operations to prevent cross-site request forgery attacks.\n\n**Acceptance Criteria:**\n- [ ] CSRF middleware added\n- [ ] Token generation and validation\n- [ ] Exempt GET endpoints\n- [ ] Tests for CSRF protection" \
"bug,security" && ((created++)) || ((failed++))

create_issue "Fix SQL Injection Vulnerabilities" \
"Review all database queries and ensure parameterized queries are used instead of string concatenation.\n\n**Acceptance Criteria:**\n- [ ] All queries use parameters\n- [ ] No raw SQL with concatenation\n- [ ] TypeORM query builder used\n- [ ] Security tests added" \
"bug,security,database" && ((created++)) || ((failed++))

create_issue "Implement Account Lockout Mechanism" \
"Lock accounts after 5 failed login attempts for 30 minutes to prevent brute force attacks.\n\n**Acceptance Criteria:**\n- [ ] Failed attempt tracking\n- [ ] Auto-lock after threshold\n- [ ] Auto-unlock after timeout\n- [ ] Admin unlock capability\n- [ ] Email notification on lock" \
"bug,security,auth" && ((created++)) || ((failed++))

create_issue "Add HTTPS Enforcement" \
"Enforce HTTPS for all endpoints in production and redirect HTTP to HTTPS.\n\n**Acceptance Criteria:**\n- [ ] HTTPS redirect middleware\n- [ ] HSTS headers configured\n- [ ] Environment-based enforcement\n- [ ] Health check endpoint exempt" \
"bug,security,infrastructure" && ((created++)) || ((failed++))

create_issue "Secure File Upload Endpoints" \
"Add file type validation, size limits, and virus scanning for all file upload endpoints.\n\n**Acceptance Criteria:**\n- [ ] File type whitelist\n- [ ] Size limit (10MB max)\n- [ ] Virus scanning integration\n- [ ] Secure storage\n- [ ] Metadata validation" \
"bug,security" && ((created++)) || ((failed++))

create_issue "Implement Proper CORS Configuration" \
"Configure CORS to only allow specific trusted origins instead of wildcard (*) in production.\n\n**Acceptance Criteria:**\n- [ ] Environment-based CORS config\n- [ ] Whitelist of allowed origins\n- [ ] Proper headers configured\n- [ ] Preflight request handling" \
"bug,security" && ((created++)) || ((failed++))

create_issue "Add Request Size Limits" \
"Implement request body size limits to prevent DoS attacks.\n\n**Requirements:**\n- Max 10MB for regular requests\n- Max 50MB for file uploads\n- Proper error messages\n\n**Acceptance Criteria:**\n- [ ] Body parser limits set\n- [ ] Custom error handler\n- [ ] Tests for large payloads" \
"bug,security,performance" && ((created++)) || ((failed++))

create_issue "Secure Database Connection Strings" \
"Ensure database credentials are stored in environment variables and not hardcoded.\n\n**Acceptance Criteria:**\n- [ ] All credentials in .env\n- [ ] .env in .gitignore\n- [ ] Production secrets in vault\n- [ ] Connection string validation" \
"bug,security,infrastructure" && ((created++)) || ((failed++))

create_issue "Add API Versioning" \
"Implement API versioning (v1, v2) to maintain backward compatibility during updates.\n\n**Acceptance Criteria:**\n- [ ] URL-based versioning (/api/v1/)\n- [ ] Version headers support\n- [ ] Deprecation notices\n- [ ] Migration guide" \
"bug,architecture" && ((created++)) || ((failed++))

create_issue "Implement Proper Error Handling" \
"Create consistent error response format with proper HTTP status codes and error messages.\n\n**Format:**\n\`\`\`json\n{\n  \"statusCode\": 400,\n  \"error\": \"Bad Request\",\n  \"message\": \"Validation failed\",\n  \"timestamp\": \"2024-01-01T00:00:00Z\"\n}\n\`\`\`\n\n**Acceptance Criteria:**\n- [ ] Global exception filter\n- [ ] Custom error classes\n- [ ] Consistent format\n- [ ] Error documentation" \
"bug,architecture" && ((created++)) || ((failed++))

create_issue "Add Request ID Tracking" \
"Generate unique request IDs for tracking requests through the system for debugging.\n\n**Acceptance Criteria:**\n- [ ] UUID generation per request\n- [ ] Request ID in headers\n- [ ] Request ID in logs\n- [ ] Request ID in responses" \
"bug,monitoring" && ((created++)) || ((failed++))

create_issue "Implement Database Connection Pooling" \
"Configure connection pooling to prevent database connection exhaustion under load.\n\n**Requirements:**\n- Max 20 connections\n- Min 5 connections\n- Connection timeout: 30s\n\n**Acceptance Criteria:**\n- [ ] TypeORM pool configured\n- [ ] Monitoring for pool usage\n- [ ] Alerting on exhaustion\n- [ ] Load tests passed" \
"bug,performance,database" && ((created++)) || ((failed++))

create_issue "Add Health Check Endpoints" \
"Create /health endpoint that checks database, cache, and external service connectivity.\n\n**Acceptance Criteria:**\n- [ ] Database health check\n- [ ] Redis health check\n- [ ] External services check\n- [ ] Ready/live endpoints\n- [ ] Kubernetes integration" \
"bug,monitoring,infrastructure" && ((created++)) || ((failed++))

create_issue "Implement Graceful Shutdown" \
"Handle SIGTERM and SIGINT signals to complete in-flight requests before shutdown.\n\n**Acceptance Criteria:**\n- [ ] Signal handlers added\n- [ ] Drain connections\n- [ ] Close DB connections\n- [ ] Cleanup resources\n- [ ] Timeout for forced shutdown" \
"bug,infrastructure" && ((created++)) || ((failed++))

create_issue "Add Database Indexes" \
"Add proper indexes on frequently queried columns (email, foreign keys, timestamps).\n\n**Acceptance Criteria:**\n- [ ] Email column indexed\n- [ ] Foreign keys indexed\n- [ ] Timestamp columns indexed\n- [ ] Migration created\n- [ ] Query performance verified" \
"bug,performance,database" && ((created++)) || ((failed++))

create_issue "Fix N+1 Query Problems" \
"Use eager loading and batch queries to prevent N+1 query performance issues.\n\n**Acceptance Criteria:**\n- [ ] Identify N+1 queries\n- [ ] Add JOINs or batch loading\n- [ ] Query count reduced\n- [ ] Performance tests added" \
"bug,performance,database" && ((created++)) || ((failed++))

create_issue "Implement Pagination for All List Endpoints" \
"Add cursor-based pagination to all endpoints returning lists to prevent memory issues.\n\n**Acceptance Criteria:**\n- [ ] Cursor pagination implemented\n- [ ] Consistent response format\n- [ ] Max limit enforced\n- [ ] Navigation links included" \
"bug,performance" && ((created++)) || ((failed++))

create_issue "Add Database Transaction Support" \
"Implement proper transaction handling for operations that modify multiple entities.\n\n**Acceptance Criteria:**\n- [ ] Transaction decorators\n- [ ] Rollback on failure\n- [ ] Nested transactions\n- [ ] Tests for rollback" \
"bug,database" && ((created++)) || ((failed++))

create_issue "Secure Sensitive Data in Logs" \
"Ensure passwords, tokens, and PII are never logged in application logs.\n\n**Acceptance Criteria:**\n- [ ] Log sanitization middleware\n- [ ] Sensitive fields blacklisted\n- [ ] Tests for log output\n- [ ] Audit log review" \
"bug,security,monitoring" && ((created++)) || ((failed++))

create_issue "Implement Cache Invalidation Strategy" \
"Add proper cache invalidation when data is updated to prevent stale data issues.\n\n**Acceptance Criteria:**\n- [ ] Cache tags implemented\n- [ ] Invalidation on update\n- [ ] TTL configuration\n- [ ] Cache hit monitoring" \
"bug,performance,cache" && ((created++)) || ((failed++))

create_issue "Add Database Migration System" \
"Set up TypeORM migrations for database schema versioning and rollback capability.\n\n**Acceptance Criteria:**\n- [ ] Migration scripts created\n- [ ] CI/CD integration\n- [ ] Rollback tested\n- [ ] Documentation added" \
"bug,database,infrastructure" && ((created++)) || ((failed++))

echo ""
echo -e "${GREEN}🧪 Creating Testing Issues (26-50)...${NC}"

create_issue "Add Unit Tests for Auth Service" \
"Create comprehensive unit tests for AuthService covering login, registration, and token validation.\n\n**Acceptance Criteria:**\n- [ ] 80%+ coverage\n- [ ] Mock dependencies\n- [ ] Edge cases tested\n- [ ] Error scenarios covered" \
"testing,auth" && ((created++)) || ((failed++))

create_issue "Add Integration Tests for User Module" \
"Write integration tests for all User module endpoints with real database interactions.\n\n**Acceptance Criteria:**\n- [ ] All endpoints tested\n- [ ] Test database used\n- [ ] Data cleanup after tests\n- [ ] CI integration" \
"testing,user" && ((created++)) || ((failed++))

create_issue "Add E2E Tests for Critical Paths" \
"Implement end-to-end tests for user registration, login, and course enrollment flows.\n\n**Acceptance Criteria:**\n- [ ] Registration flow tested\n- [ ] Login flow tested\n- [ ] Course enrollment tested\n- [ ] Test data management" \
"testing,e2e" && ((created++)) || ((failed++))

create_issue "Add API Contract Tests" \
"Create contract tests to ensure API responses match OpenAPI specification.\n\n**Acceptance Criteria:**\n- [ ] OpenAPI spec generated\n- [ ] Contract tests created\n- [ ] CI validation added\n- [ ] Breaking change detection" \
"testing,quality" && ((created++)) || ((failed++))

create_issue "Add Load Testing Suite" \
"Set up Artillery.io load tests to verify system handles expected traffic.\n\n**Requirements:**\n- 100 concurrent users\n- 1000 requests/second\n- Response time < 200ms\n\n**Acceptance Criteria:**\n- [ ] Load tests configured\n- [ ] Baseline established\n- [ ] CI integration\n- [ ] Performance report" \
"testing,performance" && ((created++)) || ((failed++))

echo ""
echo -e "${GREEN}📊 Progress Summary${NC}"
echo -e "${GREEN}✅ Created: ${created} issues${NC}"
if [ $failed -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Failed: ${failed} issues${NC}"
fi
echo ""
echo -e "${BLUE}Remaining issues can be created by uncommenting the create_issue calls in this script${NC}"
echo ""
echo "Done! 🎉"
