# Docker Compose Development Guide

This guide explains how to use Docker Compose for local development with StrellerMinds Backend.

## Overview

The Docker Compose setup provides a complete local development environment with all necessary services:

- **PostgreSQL**: Database with persistent storage
- **Redis**: Cache and queue management
- **Mailhog**: Email testing with web interface
- **LocalStack**: AWS S3 emulation

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- Node.js v18+ (for running the application)

## Quick Start

1. **Clone and setup**:

   ```bash
   git clone <repository-url>
   cd strellerminds-backend
   cp development.env.example .env.development
   ```

2. **Start services**:

   ```bash
   docker-compose up -d
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Start the application**:
   ```bash
   npm run start:dev
   ```

## Service Details

### PostgreSQL Database

- **Port**: 5432
- **Database**: strellerminds_dev
- **Username**: postgres
- **Password**: postgres
- **Volume**: postgres_data (persistent)

**Connection string**:

```
postgresql://postgres:postgres@localhost:5432/strellerminds_dev
```

### Redis Cache

- **Port**: 6379
- **Password**: redis_password
- **Database**: 0
- **Volume**: redis_data (persistent)

**Connection string**:

```
redis://:redis_password@localhost:6379/0
```

### Mailhog Email Testing

- **SMTP Port**: 1025
- **Web UI Port**: 8025
- **Web UI URL**: http://localhost:8025

**SMTP Configuration**:

```
Host: localhost
Port: 1025
Username: (empty)
Password: (empty)
TLS: false
```

### LocalStack S3

- **Port**: 4566
- **Region**: us-east-1
- **Access Key**: test
- **Secret Key**: test
- **Bucket**: strellerminds-dev-storage

**S3 Configuration**:

```
Endpoint: http://localhost:4566
Region: us-east-1
Access Key ID: test
Secret Access Key: test
Bucket: strellerminds-dev-storage
```

## Environment Variables

The `.env.development` file contains all necessary configuration for local development:

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=strellerminds_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Email (Mailhog)
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_SECURE=false

# AWS S3 (LocalStack)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=strellerminds-dev-storage
AWS_S3_REGION=us-east-1
AWS_S3_ENDPOINT=http://localhost:4566
```

## Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart service
docker-compose restart redis

# Check service status
docker-compose ps
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d strellerminds_dev

# Run migrations
npm run db:migrate

# Reset database
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

### Redis Operations

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli -a redis_password

# Monitor Redis
docker-compose exec redis redis-cli -a redis_password monitor
```

### S3 Operations

```bash
# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List objects in bucket
aws --endpoint-url=http://localhost:4566 s3 ls s3://strellerminds-dev-storage

# Upload test file
echo "test" | aws --endpoint-url=http://localhost:4566 s3 cp - s3://strellerminds-dev-storage/test.txt

# Download file
aws --endpoint-url=http://localhost:4566 s3 cp s3://strellerminds-dev-storage/test.txt ./test.txt
```

## Troubleshooting

### Services Not Starting

1. **Check Docker is running**:

   ```bash
   docker --version
   docker-compose --version
   ```

2. **Check port conflicts**:

   ```bash
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   lsof -i :1025  # Mailhog SMTP
   lsof -i :8025  # Mailhog Web
   lsof -i :4566  # LocalStack
   ```

3. **View service logs**:
   ```bash
   docker-compose logs <service-name>
   ```

### Database Connection Issues

1. **Check PostgreSQL is ready**:

   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```

2. **Verify environment variables**:
   ```bash
   cat .env.development | grep DATABASE
   ```

### Redis Connection Issues

1. **Test Redis connection**:

   ```bash
   docker-compose exec redis redis-cli -a redis_password ping
   ```

2. **Check Redis logs**:
   ```bash
   docker-compose logs redis
   ```

### Email Not Working

1. **Check Mailhog is running**:

   ```bash
   curl http://localhost:8025/api/v1/messages
   ```

2. **Verify SMTP settings**:
   ```bash
   telnet localhost 1025
   ```

### S3 Operations Failing

1. **Check LocalStack health**:

   ```bash
   curl http://localhost:4566/_localstack/health
   ```

2. **Run S3 setup script**:
   ```bash
   ./scripts/setup-localstack.sh
   ```

## Development Workflow

### Daily Development

1. **Start services**:

   ```bash
   docker-compose up -d
   ```

2. **Start application**:

   ```bash
   npm run start:dev
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

### Database Changes

1. **Create migration**:

   ```bash
   npm run db:generate -- --name=your-migration-name
   ```

2. **Run migration**:

   ```bash
   npm run db:migrate
   ```

3. **Verify in database**:
   ```bash
   docker-compose exec postgres psql -U postgres -d strellerminds_dev
   ```

### Testing Email Features

1. **Trigger email in application**
2. **Check Mailhog web UI**: http://localhost:8025
3. **Verify email content and delivery**

### Testing File Uploads

1. **Upload file via application**
2. **Check S3 bucket**:
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 ls s3://strellerminds-dev-storage
   ```

## Cleanup

### Reset Everything

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove any dangling images
docker image prune -f

# Start fresh
docker-compose up -d
npm run db:migrate
```

### Reset Specific Service

```bash
# Reset PostgreSQL
docker-compose down postgres
docker volume rm strellerminds-backend_postgres_data
docker-compose up -d postgres

# Reset Redis
docker-compose down redis
docker volume rm strellerminds-backend_redis_data
docker-compose up -d redis
```

## Production Considerations

This Docker Compose setup is **only for local development**. For production:

- Use managed database services (AWS RDS, Google Cloud SQL)
- Use managed Redis (AWS ElastiCache, Google Cloud Memorystore)
- Use production email services (SendGrid, AWS SES)
- Use production S3 or compatible storage
- Implement proper security, monitoring, and backup strategies

## Support

If you encounter issues:

1. Check this guide first
2. Review service logs: `docker-compose logs`
3. Verify environment configuration
4. Check for port conflicts
5. Open an issue with detailed logs and configuration
