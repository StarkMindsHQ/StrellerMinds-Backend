#!/bin/bash

# Automated Documentation Generation Script
# This script generates comprehensive documentation for the StrellerMinds Backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_DIR="docs"
API_DOCS_DIR="${OUTPUT_DIR}/api"
GENERATED_DIR="${OUTPUT_DIR}/generated"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_URL="http://localhost:3000"

echo -e "${BLUE}📚 StrellerMinds Backend Documentation Generator${NC}"
echo -e "${YELLOW}===============================================${NC}"

# Create directories
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${API_DOCS_DIR}"
mkdir -p "${GENERATED_DIR}"

echo -e "${YELLOW}🔧 Setting up environment...${NC}"

# Check if application is running
if ! curl -s "${BASE_URL}/api/health" > /dev/null; then
    echo -e "${RED}❌ Application is not running at ${BASE_URL}${NC}"
    echo -e "${YELLOW}🚀 Starting application...${NC}"
    
    # Start the application in background
    npm run start:prod &
    APP_PID=$!
    
    # Wait for application to be ready
    echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
    for i in {1..30}; do
        if curl -s "${BASE_URL}/api/health" > /dev/null; then
            echo -e "${GREEN}✅ Application is ready!${NC}"
            break
        fi
        echo -e "${YELLOW}⏳ Waiting... ($i/30)${NC}"
        sleep 2
    done
    
    if ! curl -s "${BASE_URL}/api/health" > /dev/null; then
        echo -e "${RED}❌ Failed to start application${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}📄 Generating API documentation...${NC}"

# Generate OpenAPI/Swagger JSON
curl -s "${BASE_URL}/api/docs-json" -o "${API_DOCS_DIR}/openapi-${TIMESTAMP}.json"
echo -e "${GREEN}✅ OpenAPI JSON generated${NC}"

# Generate API documentation in multiple formats
echo -e "${YELLOW}🔄 Converting API documentation to different formats...${NC}"

# Generate HTML documentation using swagger-codegen (if available)
if command -v swagger-codegen &> /dev/null; then
    swagger-codegen generate -i "${API_DOCS_DIR}/openapi-${TIMESTAMP}.json" \
        -l html2 \
        -o "${API_DOCS_DIR}/html-${TIMESTAMP}" \
        --additional-properties basePackage=strellerminds
    echo -e "${GREEN}✅ HTML documentation generated${NC}"
else
    echo -e "${YELLOW}⚠️  swagger-codegen not found, skipping HTML generation${NC}"
fi

# Generate Markdown documentation
echo -e "${YELLOW}📝 Generating Markdown documentation...${NC}"

# Create comprehensive README
cat > "${OUTPUT_DIR}/README.md" << EOF
# StrellerMinds Backend API Documentation

Generated on: $(date)

## Overview

This documentation provides comprehensive information about the StrellerMinds Backend API, a blockchain education platform backend built with NestJS.

## Quick Start

### Base URL
- **Development**: \`${BASE_URL}/api\`
- **Production**: \`https://api.strellerminds.com/api\`

### Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`bash
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting

All endpoints are rate-limited to prevent abuse. Rate limit information is included in response headers:

- \`X-RateLimit-Limit\`: Request limit per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when the rate limit window resets

## API Endpoints

### Authentication

#### Register User
\`\`\`http
POST /auth/register
\`\`\`

Registers a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
\`\`\`

#### Login User
\`\`\`http
POST /auth/login
\`\`\`

Authenticates a user and returns JWT tokens.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
\`\`\`

#### Get User Profile
\`\`\`http
GET /auth/profile
\`\`\`

Gets the current user's profile information.

**Headers:**
\`\`\`bash
Authorization: Bearer <jwt-token>
\`\`\`

### Courses

#### Get Courses
\`\`\`http
GET /courses
\`\`\`

Retrieves a paginated list of courses.

**Query Parameters:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10)
- \`level\`: Course difficulty level (BEGINNER, INTERMEDIATE, ADVANCED)
- \`category\`: Course category filter

#### Get Course Details
\`\`\`http
GET /courses/{id}
\`\`\`

Retrieves detailed information about a specific course.

**Path Parameters:**
- \`id\`: Course ID

#### Enroll in Course
\`\`\`http
POST /courses/{id}/enroll
\`\`\`

Enrolls the current user in a course.

**Headers:**
\`\`\`bash
Authorization: Bearer <jwt-token>
\`\`\`

### Health Checks

#### Basic Health Check
\`\`\`http
GET /health
\`\`\`

Basic health check endpoint.

#### Detailed Health Check
\`\`\`http
GET /health/detailed
\`\`\`

Detailed health check with service status.

## Response Format

All API responses follow a consistent format:

### Success Response
\`\`\`json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## SDKs and Tools

### Postman Collection
A Postman collection is available at \`postman/collection.json\` for easy API testing.

### Swagger UI
Interactive API documentation is available at:
- **Development**: \`${BASE_URL}/api/docs\`
- **Production**: \`https://api.strellerminds.com/api/docs\`

## Development

### Running Tests
\`\`\`bash
# Unit tests
npm run test

# Integration tests
npm run test -- --testPathPattern=integration

# E2E tests
npm run test:e2e

# API tests (Newman)
npm run test:api
\`\`\`

### Code Quality
\`\`\`bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking
npx tsc --noEmit
\`\`\`

## Support

For API support and questions:
- Email: api-support@strellerminds.com
- Documentation: https://docs.strellerminds.com
- Issues: https://github.com/your-org/strellerminds-backend/issues

---

*This documentation was automatically generated on $(date)*
EOF

echo -e "${GREEN}✅ README.md generated${NC}"

# Generate API reference
echo -e "${YELLOW}📖 Generating API reference...${NC}"

# Extract endpoint information from OpenAPI spec
if command -v jq &> /dev/null; then
    jq -r '
        .paths | to_entries[] | 
        {
            endpoint: .key,
            methods: .value | keys | join(", "),
            summary: .value | to_entries[] | .value.summary // "No summary"
        } | 
        "- **\(.endpoint)** (\(.methods))\n  \(.summary)\n"
    ' "${API_DOCS_DIR}/openapi-${TIMESTAMP}.json" > "${GENERATED_DIR}/api-endpoints-${TIMESTAMP}.md"
    
    echo -e "${GREEN}✅ API endpoints reference generated${NC}"
else
    echo -e "${YELLOW}⚠️  jq not found, skipping API endpoints extraction${NC}"
fi

# Generate architecture documentation
echo -e "${YELLOW}🏗️  Generating architecture documentation...${NC}"

cat > "${OUTPUT_DIR}/ARCHITECTURE.md" << EOF
# StrellerMinds Backend Architecture

## Overview

StrellerMinds Backend is a comprehensive blockchain education platform built with NestJS, TypeScript, and PostgreSQL.

## Technology Stack

### Core Framework
- **NestJS**: Progressive Node.js framework for building efficient, scalable server-side applications
- **TypeScript**: Type-safe JavaScript superset for better development experience
- **Express.js**: Web application framework (used by NestJS)

### Database & Storage
- **PostgreSQL**: Primary relational database
- **Redis**: Caching and session storage
- **Elasticsearch**: Search and analytics
- **AWS S3**: File storage (via MinIO in development)

### Authentication & Security
- **JWT**: JSON Web Tokens for authentication
- **Passport.js**: Authentication middleware
- **bcrypt**: Password hashing
- **Helmet**: Security headers
- **Rate Limiting**: Request throttling

### Payment & Blockchain
- **Stripe**: Payment processing
- **Stellar SDK**: Blockchain integration
- **Web3**: Ethereum integration (if applicable)

### Communication & Real-time
- **Socket.IO**: Real-time communication
- **Nodemailer**: Email sending
- **Twilio**: SMS notifications

### Monitoring & Observability
- **Winston**: Logging
- **Sentry**: Error tracking
- **Prometheus**: Metrics collection
- **Health Checks**: Service monitoring

## Project Structure

\`\`\`
src/
├── auth/                    # Authentication & authorization
├── common/                  # Shared utilities and decorators
├── config/                  # Configuration management
├── course/                  # Course management
├── database/                # Database utilities
├── files/                   # File upload and management
├── forum/                   # Discussion forums
├── gamification/            # Points, badges, achievements
├── health/                  # Health check endpoints
├── integrations/            # Third-party integrations
├── learning-path/           # Educational learning paths
├── notifications/           # Push notifications
├── payment/                 # Payment processing
├── search/                  # Search functionality
├── security/                # Security utilities
├── user/                    # User management
├── video/                   # Video processing
├── app.module.ts            # Root module
└── main.ts                 # Application entry point
\`\`\`

## Data Flow

1. **Request Processing**: Incoming requests pass through security middleware
2. **Authentication**: JWT tokens are validated and user context established
3. **Authorization**: Role-based access control checks permissions
4. **Business Logic**: Core application logic processes the request
5. **Data Access**: TypeORM handles database operations
6. **Response**: Formatted response sent back to client

## Security Architecture

### Authentication Flow
1. User provides credentials to \`/auth/login\`
2. Server validates credentials against database
3. JWT access token and refresh token are generated
4. Tokens are returned to client
5. Client includes access token in subsequent requests

### Security Layers
- **Input Validation**: All inputs validated using class-validator
- **SQL Injection Prevention**: TypeORM parameterized queries
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: CSRF tokens and same-site cookies
- **Rate Limiting**: Request throttling per endpoint and user
- **Security Headers**: Helmet.js for security headers

## Performance Considerations

### Database Optimization
- **Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: N+1 query prevention and pagination
- **Caching**: Redis caching for frequently accessed data

### Application Performance
- **Lazy Loading**: Modules loaded on demand
- **Compression**: Gzip compression for responses
- **CDN**: Static assets served via CDN in production
- **Monitoring**: Performance metrics and alerting

## Deployment Architecture

### Development Environment
- Docker Compose with all services
- Hot reloading for development
- Development databases and services
- Debugging and profiling tools

### Production Environment
- Containerized deployment
- Load balancing with nginx
- Database replication and backups
- Monitoring and logging infrastructure

## API Design Principles

### RESTful Design
- Resource-based URLs
- HTTP methods for operations (GET, POST, PUT, DELETE)
- Proper HTTP status codes
- Consistent response format

### Versioning
- URL-based versioning (\`/api/v1/\`)
- Backward compatibility maintenance
- Deprecation notices for breaking changes

### Documentation
- OpenAPI/Swagger specification
- Interactive API documentation
- Code examples in multiple languages
- Change logs and migration guides

## Testing Strategy

### Unit Tests
- Jest testing framework
- Mock dependencies for isolation
- High code coverage (>80%)
- Test-driven development approach

### Integration Tests
- Database integration testing
- API endpoint testing
- Third-party service mocking
- Transaction rollback testing

### E2E Tests
- Cypress for end-to-end testing
- Real browser automation
- User journey testing
- Cross-browser compatibility

### Performance Tests
- Load testing with Artillery
- Stress testing scenarios
- Database performance monitoring
- API response time tracking

## Monitoring & Observability

### Logging
- Structured logging with Winston
- Log levels and categories
- Centralized log aggregation
- Log rotation and retention

### Metrics
- Prometheus metrics collection
- Custom business metrics
- System performance metrics
- Alert thresholds and notifications

### Error Tracking
- Sentry integration for error tracking
- Stack trace collection
- User context in errors
- Error rate monitoring

---

*This architecture documentation was automatically generated on $(date)*
EOF

echo -e "${GREEN}✅ Architecture documentation generated${NC}"

# Generate deployment guide
echo -e "${YELLOW}🚀 Generating deployment guide...${NC}"

cat > "${OUTPUT_DIR}/DEPLOYMENT.md" << EOF
# StrellerMinds Backend Deployment Guide

## Overview

This guide covers deploying the StrellerMinds Backend to various environments.

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- Docker and Docker Compose (for containerized deployment)
- SSL certificates (for production)

## Environment Configuration

### Required Environment Variables

\`\`\`bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=strellerminds
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=strellerminds_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_very_secure_jwt_secret_key
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# External Services
ELASTICSEARCH_URL=http://localhost:9200
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STELLAR_NETWORK=public

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# File Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=strellerminds-files
\`\`\`

## Deployment Methods

### 1. Docker Deployment (Recommended)

#### Development
\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/strellerminds-backend.git
cd strellerminds-backend

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
\`\`\`

#### Production
\`\`\`bash
# Build production image
docker build -t strellerminds-backend:latest .

# Run with environment file
docker run -d \\
  --name strellerminds-backend \\
  -p 3000:3000 \\
  --env-file .env.production \\
  strellerminds-backend:latest
\`\`\`

### 2. Traditional Deployment

#### Install Dependencies
\`\`\`bash
# Clone repository
git clone https://github.com/your-org/strellerminds-backend.git
cd strellerminds-backend

# Install dependencies
npm ci --production

# Build application
npm run build
\`\`\`

#### Database Setup
\`\`\`bash
# Create database
createdb strellerminds_prod

# Run migrations
npm run migration:run

# Seed initial data (optional)
npm run seed
\`\`\`

#### Start Application
\`\`\`bash
# Start production server
npm run start:prod
\`\`\`

### 3. Kubernetes Deployment

#### Namespace and ConfigMap
\`\`\`yaml
apiVersion: v1
kind: Namespace
metadata:
  name: strellerminds
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: strellerminds-config
  namespace: strellerminds
data:
  NODE_ENV: "production"
  PORT: "3000"
\`\`\`

#### Deployment
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: strellerminds-backend
  namespace: strellerminds
spec:
  replicas: 3
  selector:
    matchLabels:
      app: strellerminds-backend
  template:
    metadata:
      labels:
        app: strellerminds-backend
    spec:
      containers:
      - name: strellerminds-backend
        image: strellerminds-backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: strellerminds-config
        - secretRef:
            name: strellerminds-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
\`\`\`

#### Service
\`\`\`yaml
apiVersion: v1
kind: Service
metadata:
  name: strellerminds-backend-service
  namespace: strellerminds
spec:
  selector:
    app: strellerminds-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
\`\`\`

## Monitoring and Maintenance

### Health Checks
- Basic health: \`GET /api/health\`
- Detailed health: \`GET /api/health/detailed\`
- Metrics: \`GET /api/metrics\` (admin only)

### Log Management
\`\`\`bash
# View application logs
docker logs strellerminds-backend

# Follow logs
docker logs -f strellerminds-backend

# Kubernetes logs
kubectl logs -f deployment/strellerminds-backend -n strellerminds
\`\`\`

### Database Maintenance
\`\`\`bash
# Create backup
npm run backup

# Restore backup
npm run backup:restore

# Run database optimizations
psql -d strellerminds_prod -c "VACUUM ANALYZE;"
\`\`\`

## Security Considerations

### SSL/TLS
- Use HTTPS in production
- Configure SSL certificates
- Redirect HTTP to HTTPS

### Firewall
- Only expose necessary ports
- Use VPN for database access
- Implement IP whitelisting

### Secrets Management
- Use environment variables for secrets
- Rotate secrets regularly
- Use secret management services

## Troubleshooting

### Common Issues

#### Database Connection
\`\`\`bash
# Check PostgreSQL status
docker exec postgres pg_isready

# Test connection
psql -h localhost -U strellerminds -d strellerminds_prod
\`\`\`

#### Redis Connection
\`\`\`bash
# Check Redis status
docker exec redis redis-cli ping

# Test connection
redis-cli -h localhost -p 6379 ping
\`\`\`

#### Application Issues
\`\`\`bash
# Check application logs
docker logs strellerminds-backend

# Check health endpoint
curl http://localhost:3000/api/health

# Check port availability
netstat -tlnp | grep 3000
\`\`\`

---

*This deployment guide was automatically generated on $(date)*
EOF

echo -e "${GREEN}✅ Deployment guide generated${NC}"

# Clean up background process if we started it
if [ ! -z "${APP_PID}" ]; then
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    kill ${APP_PID} 2>/dev/null || true
    wait ${APP_PID} 2>/dev/null || true
fi

# Generate documentation index
echo -e "${YELLOW}📋 Generating documentation index...${NC}"

cat > "${OUTPUT_DIR}/INDEX.md" << EOF
# StrellerMinds Backend Documentation Index

Generated on: $(date)

## Documentation Files

### API Documentation
- [README.md](README.md) - Main API documentation
- [API Endpoints](generated/api-endpoints-${TIMESTAMP}.md) - Complete API endpoints reference
- [OpenAPI Spec](api/openapi-${TIMESTAMP}.json) - Raw OpenAPI specification

### Architecture
- [Architecture.md](ARCHITECTURE.md) - System architecture and design
- [Database Schema](database-schema.md) - Database structure and relationships

### Development
- [Development Guide](DEVELOPMENT.md) - Local development setup
- [Testing Guide](TESTING.md) - Testing strategies and guidelines
- [Code Style](CODE_STYLE.md) - Coding standards and conventions

### Deployment
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Docker Guide](DOCKER.md) - Container deployment guide
- [Kubernetes Guide](KUBERNETES.md) - K8s deployment guide

### Operations
- [Monitoring Guide](MONITORING.md) - Monitoring and alerting setup
- [Security Guide](SECURITY.md) - Security best practices
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

### API Reference
- [Authentication](api/authentication.md) - Authentication endpoints
- [Courses](api/courses.md) - Course management endpoints
- [Users](api/users.md) - User management endpoints
- [Payments](api/payments.md) - Payment processing endpoints

## Quick Links

- **Swagger UI**: \`${BASE_URL}/api/docs\`
- **Health Check**: \`${BASE_URL}/api/health\`
- **API Base URL**: \`${BASE_URL}/api\`

## Getting Started

1. **Local Development**: See [Development Guide](DEVELOPMENT.md)
2. **API Testing**: Import [Postman Collection](../postman/collection.json)
3. **Deployment**: Follow [Deployment Guide](DEPLOYMENT.md)
4. **Contributing**: See [Contributing Guide](CONTRIBUTING.md)

## Support

- **Documentation Issues**: [Create Issue](https://github.com/your-org/strellerminds-backend/issues/new?template=documentation)
- **API Issues**: [Create Issue](https://github.com/your-org/strellerminds-backend/issues/new?template=api)
- **General Support**: api-support@strellerminds.com

---

*This documentation index was automatically generated on $(date)*
EOF

echo -e "${GREEN}✅ Documentation index generated${NC}"

# Summary
echo -e "${BLUE}📚 Documentation Generation Complete!${NC}"
echo -e "${YELLOW}===============================================${NC}"
echo -e "${GREEN}📁 Output Directory: ${OUTPUT_DIR}${NC}"
echo -e "${GREEN}📄 Files Generated:${NC}"
echo -e "  - README.md"
echo -e "  - ARCHITECTURE.md"
echo -e "  - DEPLOYMENT.md"
echo -e "  - INDEX.md"
echo -e "  - api/openapi-${TIMESTAMP}.json"
echo -e "  - generated/api-endpoints-${TIMESTAMP}.md"

echo -e "${YELLOW}🌐 Next Steps:${NC}"
echo -e "  1. Review generated documentation"
echo -e "  2. Commit documentation changes"
echo -e "  3. Deploy documentation to documentation site"
echo -e "  4. Update API documentation links in README"

echo -e "${GREEN}✅ Documentation generation completed successfully!${NC}"
