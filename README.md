# StrellerMinds Backend

A modern, secure NestJS-based API server powering a blockchain education platform built on the Stellar network. Provides comprehensive user management, course delivery, and seamless Stellar blockchain integration for on-chain learning verification and credentialing.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StrellerMinds Backend is a production-ready NestJS application that delivers:

- **Secure Authentication**: JWT-based authentication with refresh tokens, MFA support, and rate limiting
- **Stellar Integration**: Direct blockchain integration for credential verification and on-chain learning records
- **RESTful APIs**: Comprehensive, well-documented endpoints with Swagger/OpenAPI support
- **Database Optimization**: Connection pooling, circuit breaker protection, and real-time monitoring
- **Scalable Architecture**: Clean separation of concerns with domain-driven design principles
- **Security First**: CSRF protection, XSS prevention, helmet headers, and secure logging
- **Monitoring & Observability**: Sentry integration, structured logging, and performance metrics
- **Video Streaming**: AWS CloudFront/S3 integration with adaptive bitrate streaming
- **GDPR Compliance**: Data export and deletion endpoints with retention policies

### Key Features

- 🔐 **Multi-factor Authentication (MFA)** - TOTP-based 2FA
- 🔗 **Blockchain Integration** - Stellar Soroban smart contracts
- 📊 **Database Connection Pooling** - Dynamic sizing with circuit breaker
- 🎥 **Video Streaming** - HLS/DASH with DRM support
- 📧 **Email Services** - SMTP integration with templates
- 🔍 **Full-text Search** - Elasticsearch integration
- 📈 **Performance Monitoring** - Real-time metrics and APM
- 🛡️ **Security Auditing** - Comprehensive logging and compliance

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18.x or 20.x | LTS versions recommended |
| **npm** | 9.x+ | Comes with Node.js |
| **PostgreSQL** | 15+ | Primary database |
| **Git** | Latest | For version control |

### Verify Installation

```bash
node --version    # Should output v18.x.x or v20.x.x
npm --version     # Should output 9.x.x or higher
psql --version    # Should output PostgreSQL 15+
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/StarkMindsHQ/strellerminds-backend.git
cd strellerminds-backend
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required due to peer dependency constraints in the project.

### 3. Verify Installation

```bash
npm run lint
```

This ensures all dependencies are correctly installed and the project structure is valid.

---

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your actual values. Below is a comprehensive table of all available environment variables:

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| **Database Configuration** |
| `DATABASE_HOST` | string | `localhost` | PostgreSQL host | ✅ |
| `DATABASE_PORT` | number | `5432` | PostgreSQL port | ✅ |
| `DATABASE_USER` | string | - | PostgreSQL username | ✅ |
| `DATABASE_PASSWORD` | string | - | PostgreSQL password | ✅ |
| `DATABASE_NAME` | string | - | Database name | ✅ |
| `DATABASE_POOL_MAX` | number | `10` | Max connection pool size | ❌ |
| `DATABASE_POOL_MIN` | number | `1` | Min connection pool size | ❌ |
| `DATABASE_IDLE_TIMEOUT` | number | `30000` | Idle timeout in ms | ❌ |
| `DATABASE_RETRY_ATTEMPTS` | number | `5` | Connection retry attempts | ❌ |
| `DATABASE_RETRY_DELAY` | number | `3000` | Retry delay in ms | ❌ |
| **Database Encryption** |
| `DB_ENCRYPTION_KEY` | string | - | 64-char hex string (32 bytes) | ❌ |
| `DB_ENCRYPTION_SALT` | string | - | Encryption salt | ❌ |
| **JWT Configuration** |
| `JWT_SECRET` | string | - | JWT signing secret (32+ chars) | ✅ |
| `JWT_REFRESH_SECRET` | string | - | Refresh token secret (32+ chars) | ✅ |
| `JWT_EXPIRES_IN` | string | `15m` | Access token expiry | ❌ |
| `JWT_REFRESH_EXPIRES_IN` | string | `7d` | Refresh token expiry | ❌ |
| `JWT_EMAIL_EXPIRES_IN` | string | `24h` | Email verification token expiry | ❌ |
| `JWT_PASSWORD_RESET_EXPIRES_IN` | string | `1h` | Password reset token expiry | ❌ |
| **Email Configuration** |
| `SMTP_HOST` | string | `smtp.gmail.com` | SMTP server host | ✅ |
| `SMTP_PORT` | number | `587` | SMTP server port | ✅ |
| `SMTP_SECURE` | boolean | `false` | Use TLS | ❌ |
| `SMTP_USER` | string | - | SMTP username | ✅ |
| `SMTP_PASS` | string | - | SMTP password/app password | ✅ |
| `SMTP_FROM` | string | `noreply@strellerminds.com` | From email address | ✅ |
| **Rate Limiting** |
| `RATE_LIMIT_TTL` | number | `60000` | Rate limit window in ms | ❌ |
| `RATE_LIMIT_MAX` | number | `10` | Max requests per window | ❌ |
| **File Uploads** |
| `UPLOAD_DIR` | string | `./uploads` | Local upload directory | ❌ |
| **Cloudinary Configuration** |
| `CLOUDINARY_CLOUD_NAME` | string | - | Cloudinary cloud name | ❌ |
| `CLOUDINARY_API_KEY` | string | - | Cloudinary API key | ❌ |
| `CLOUDINARY_API_SECRET` | string | - | Cloudinary API secret | ❌ |
| **Stellar Blockchain** |
| `SOROBAN_RPC_URL` | string | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint | ✅ |
| `STELLAR_NETWORK` | string | `TESTNET` | Network (TESTNET or PUBLIC) | ✅ |
| `CREDENTIAL_CONTRACT_ID` | string | - | Smart contract ID | ✅ |
| `SIGNER_SECRET_KEY` | string | - | Stellar secret key (56 chars) | ✅ |
| **AWS Configuration** |
| `AWS_ACCESS_KEY_ID` | string | - | AWS access key | ❌ |
| `AWS_SECRET_ACCESS_KEY` | string | - | AWS secret key | ❌ |
| `AWS_S3_BUCKET` | string | - | S3 bucket name | ❌ |
| `AWS_S3_REGION` | string | `us-east-1` | AWS region | ❌ |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | string | - | CloudFront distribution ID | ❌ |
| `AWS_CLOUDFRONT_DOMAIN` | string | - | CloudFront domain | ❌ |
| `AWS_CLOUDFRONT_PRIVATE_KEY_ID` | string | - | CloudFront key pair ID | ❌ |
| `AWS_CLOUDFRONT_PRIVATE_KEY` | string | - | CloudFront private key | ❌ |
| `AWS_SIGNED_URL_EXPIRY` | number | `3600` | Signed URL expiry in seconds | ❌ |
| **Video Processing** |
| `VIDEO_PROCESSING_ENABLED` | boolean | `true` | Enable video processing | ❌ |
| `VIDEO_PROCESSING_CONCURRENT_JOBS` | number | `2` | Concurrent processing jobs | ❌ |
| `VIDEO_PROCESSING_TEMP_DIR` | string | `./temp/video-processing` | Temp directory | ❌ |
| `FFMPEG_PATH` | string | `/usr/bin/ffmpeg` | FFmpeg binary path | ❌ |
| `FFPROBE_PATH` | string | `/usr/bin/ffprobe` | FFprobe binary path | ❌ |
| `VIDEO_MAX_FILE_SIZE` | number | `5368709120` | Max file size (5GB) | ❌ |
| `VIDEO_ALLOWED_FORMATS` | string | `mp4,webm,mov,avi,mkv` | Allowed formats | ❌ |
| `VIDEO_MAX_DURATION` | number | `7200` | Max duration in seconds | ❌ |
| **Logging Configuration** |
| `LOG_LEVEL` | string | `info` | Log level (debug, info, warn, error) | ❌ |
| `LOG_FORMAT` | string | `json` | Log format (json or text) | ❌ |
| `LOG_FILE_ENABLED` | boolean | `true` | Enable file logging | ❌ |
| `LOG_FILE_PATH` | string | `logs/app-%DATE%.log` | Log file path | ❌ |
| `LOG_FILE_MAX_SIZE` | string | `20m` | Max log file size | ❌ |
| `LOG_FILE_MAX_FILES` | number | `14` | Max log files to keep | ❌ |
| `LOG_CONSOLE_ENABLED` | boolean | `true` | Enable console logging | ❌ |
| `LOG_CONSOLE_COLORIZE` | boolean | `true` | Colorize console output | ❌ |
| **Secure Logging** |
| `SECURE_LOGGING_ENABLED` | boolean | `true` | Enable sensitive data redaction | ❌ |
| `SECURE_LOGGING_REPLACEMENT_VALUE` | string | `[REDACTED]` | Redaction placeholder | ❌ |
| `SECURE_LOGGING_SENSITIVE_FIELDS` | string | See `.env.example` | Fields to redact (comma-separated) | ❌ |
| **Sentry Configuration** |
| `SENTRY_ENABLED` | boolean | `false` | Enable Sentry error tracking | ❌ |
| `SENTRY_DSN` | string | - | Sentry DSN URL | ❌ |
| `SENTRY_TRACES_SAMPLE_RATE` | number | `0.1` | Trace sampling rate (0-1) | ❌ |
| **Elasticsearch** |
| `ELASTICSEARCH_NODE` | string | `http://localhost:9200` | Elasticsearch endpoint | ❌ |
| `ELASTICSEARCH_USERNAME` | string | `elastic` | Elasticsearch username | ❌ |
| `ELASTICSEARCH_PASSWORD` | string | - | Elasticsearch password | ❌ |
| **OpenTelemetry** |
| `OTEL_SERVICE_NAME` | string | `streller-minds-backend` | Service name for tracing | ❌ |
| `OTEL_COLLECTOR_URL` | string | `http://localhost:4318/v1/traces` | OTLP collector URL | ❌ |
| `OTEL_EXPORTER` | string | `jaeger` | Exporter type (otlp, jaeger, zipkin) | ❌ |
| `OTEL_SAMPLER_PROBABILITY` | number | `1.0` | Sampling probability (0-1) | ❌ |

### 3. Security Best Practices

⚠️ **CRITICAL**: Never commit `.env` to version control. Use a secrets manager in production:

- **AWS Secrets Manager** - For AWS deployments
- **HashiCorp Vault** - For on-premises deployments
- **Azure Key Vault** - For Azure deployments
- **GitHub Secrets** - For CI/CD pipelines

### 4. Validate Configuration

```bash
npm run lint
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE strellerminds;

# Create user (if not exists)
CREATE USER strellerminds_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE strellerminds TO strellerminds_user;

# Exit psql
\q
```

### 2. Update Environment Variables

Edit `.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=strellerminds_user
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=strellerminds
```

### 3. Run Database Migrations

```bash
npm run build
npm run start:dev
```

TypeORM will automatically run migrations on startup. Check the console for migration status.

### 4. Verify Database Connection

```bash
psql -U strellerminds_user -d strellerminds -c "\dt"
```

This should list all tables created by the application.

---

## Running the Application

### Development Mode

Start the application with hot-reload:

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` and automatically reload on file changes.

### Debug Mode

Start with Node debugger enabled:

```bash
npm run start:debug
```

Then attach your debugger to `localhost:9229`.

### Production Mode

Build and run for production:

```bash
# Build the project
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Start the production server
npm run start:prod
```

The `NODE_OPTIONS` flag allocates 4GB of heap memory for the build process.

### Verify Application is Running

```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api/docs
```

---

## Running Tests

### Run All Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:cov
```

Coverage reports are generated in the `coverage/` directory.

### Run Contract Tests

```bash
npm run test:contract
```

### Run Specific Test Suites

```bash
# Request validation tests
npm run test:contract:request

# Response validation tests
npm run test:contract:response

# Performance tests
npm run test:contract:performance

# Visual regression tests
npm run test:visual
```

---

## Project Structure

```
src/
├── auth/                          # Authentication module
│   ├── application/               # Use cases and mappers
│   ├── controllers/               # Auth endpoints
│   ├── domain/                    # Domain entities and interfaces
│   ├── dtos/                      # Data transfer objects
│   ├── entities/                  # Database entities
│   ├── guards/                    # Auth guards (JWT, CSRF, rate limit)
│   ├── services/                  # Auth services (JWT, MFA, email)
│   ├── strategies/                # Passport strategies
│   └── validators/                # Custom validators
│
├── common/                        # Shared utilities
│   ├── cache/                     # Query caching service
│   ├── database/                  # Database utilities
│   ├── decorators/                # Custom decorators
│   ├── filters/                   # Exception filters
│   ├── guards/                    # Common guards
│   ├── interceptors/              # Request/response interceptors
│   ├── middleware/                # Express middleware
│   └── pipes/                     # Validation pipes
│
├── courses/                       # Course management module
│   ├── controllers/               # Course endpoints
│   ├── services/                  # Course business logic
│   ├── entities/                  # Course database entities
│   └── dtos/                      # Course DTOs
│
├── users/                         # User management module
│   ├── controllers/               # User endpoints
│   ├── services/                  # User business logic
│   ├── entities/                  # User database entities
│   └── dtos/                      # User DTOs
│
├── blockchain/                    # Stellar blockchain integration
│   ├── services/                  # Stellar SDK wrapper
│   ├── contracts/                 # Smart contract interfaces
│   └── dtos/                      # Blockchain DTOs
│
├── video/                         # Video streaming module
│   ├── services/                  # Video processing and streaming
│   ├── controllers/               # Video endpoints
│   └── dtos/                      # Video DTOs
│
├── health/                        # Health check module
│   ├── controllers/               # Health endpoints
│   └── services/                  # Health check services
│
├── database/                      # Database monitoring
│   ├── controllers/               # Database endpoints
│   └── services/                  # Pool and metrics services
│
├── app.module.ts                  # Root module
├── app.controller.ts              # Root controller
├── app.service.ts                 # Root service
└── main.ts                        # Application entry point
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/auth` | Authentication, JWT, MFA, password management |
| `src/common` | Shared utilities, guards, interceptors, pipes |
| `src/courses` | Course CRUD operations and management |
| `src/users` | User management and profiles |
| `src/blockchain` | Stellar integration and smart contracts |
| `src/video` | Video processing, streaming, and DRM |
| `src/health` | Application health and readiness checks |
| `src/database` | Connection pooling and performance monitoring |
| `docs/` | API documentation and guides |
| `scripts/` | Build and validation scripts |

---

## Available Scripts

### Development

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Start with hot-reload |
| `npm run start:debug` | Start with debugger |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |

### Testing

| Script | Purpose |
|--------|---------|
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Generate coverage report |
| `npm run test:contract` | Run contract tests |
| `npm run test:contract:request` | Test request validation |
| `npm run test:contract:response` | Test response validation |
| `npm run test:contract:performance` | Test performance |
| `npm run test:visual` | Run visual regression tests |

### Code Quality

| Script | Purpose |
|--------|---------|
| `npm run lint` | Run ESLint and fix issues |
| `npm run format` | Format code with Prettier |
| `npm run check:circular` | Check for circular dependencies |
| `npm run check:complexity` | Check code complexity |

### Documentation

| Script | Purpose |
|--------|---------|
| `npm run docs:generate` | Generate OpenAPI spec |
| `npm run docs:validate` | Validate OpenAPI spec |

---

## API Documentation

### Swagger UI

Access the interactive API documentation:

```
http://localhost:3000/api/docs
```

### OpenAPI Specification

Download the OpenAPI JSON:

```
http://localhost:3000/api/docs-json
```

Or view the static file:

```
docs/openapi.json
```

### Documentation Files

| File | Content |
|------|---------|
| [docs/QUICK_START.md](docs/QUICK_START.md) | 5-minute quick start guide |
| [docs/API_OVERVIEW.md](docs/API_OVERVIEW.md) | Complete API reference |
| [docs/AUTHENTICATION_GUIDE.md](docs/AUTHENTICATION_GUIDE.md) | Authentication and token management |
| [docs/CONNECTION_POOLING_README.md](docs/CONNECTION_POOLING_README.md) | Database connection pooling |
| [docs/CERTIFICATE_PINNING.md](docs/CERTIFICATE_PINNING.md) | SSL/TLS certificate pinning |
| [docs/CONTRACT_TESTING.md](docs/CONTRACT_TESTING.md) | Contract testing methodology |

### API Endpoints Summary

#### Authentication (11 endpoints)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email address
- `POST /auth/update-password` - Update password
- `POST /auth/check-password-strength` - Check password strength
- `GET /auth/password-policy` - Get password policy
- `GET /auth/profile` - Get user profile
- `GET /auth/csrf-token` - Get CSRF token

#### Token Management (4 endpoints)
- `POST /auth/tokens/logout` - Logout user
- `POST /auth/tokens/verify` - Verify token validity
- `POST /auth/tokens/clear-access` - Clear access token
- `POST /auth/tokens/clear-refresh` - Clear refresh token

#### Multi-Factor Authentication (3 endpoints)
- `POST /auth/mfa/setup` - Setup MFA
- `POST /auth/mfa/verify` - Verify MFA code
- `POST /auth/mfa/disable` - Disable MFA

#### Users (2 endpoints)
- `GET /users` - List users
- `GET /users/:id` - Get user by ID

#### Courses (2 endpoints)
- `GET /courses` - List courses
- `GET /courses/:id` - Get course by ID

#### Health (4 endpoints)
- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

#### Database Monitoring (7 endpoints)
- `GET /database/pool/health` - Connection pool health
- `GET /database/pool/stats` - Pool statistics
- `GET /database/pool/stats/recent` - Recent statistics
- `GET /database/pool/utilization` - Pool utilization
- `GET /database/pool/circuit-breaker` - Circuit breaker status
- `GET /database/metrics/connection` - Connection metrics
- `GET /database/metrics/pool-size` - Pool size metrics

#### GDPR (4 endpoints)
- `GET /gdpr/export/:userId` - Export user data
- `DELETE /gdpr/users/:userId` - Delete user data
- `GET /gdpr/retention-policies` - Get retention policies
- `DELETE /gdpr/retention-policies/apply` - Apply retention policies

### Example Requests

#### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Get User Profile

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

#### List Courses

```bash
curl -X GET "http://localhost:3000/courses?category=blockchain&limit=10"
```

#### Check Database Pool Health

```bash
curl -X GET http://localhost:3000/database/pool/health
```

---

## Contributing

We welcome contributions! Please follow these guidelines:

### 1. Fork and Clone

```bash
git clone https://github.com/your-username/strellerminds-backend.git
cd strellerminds-backend
```

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 4. Run Tests and Linting

```bash
npm run lint
npm run format
npm run test
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 6. Create Pull Request

Open a PR on GitHub with a clear description of your changes.

### Code Style

- **Language**: TypeScript
- **Formatter**: Prettier
- **Linter**: ESLint
- **Architecture**: Clean Architecture with Domain-Driven Design

### Testing Requirements

- Unit tests for all business logic
- Integration tests for API endpoints
- Contract tests for API contracts
- Minimum 80% code coverage

---

## License

This project is licensed under the **UNLICENSED** license. All rights reserved.

---

## Support

For issues, questions, or contributions:

- **GitHub Issues**: [StrellerMinds Backend Issues](https://github.com/StarkMindsHQ/strellerminds-backend/issues)
- **Email**: contact@strellerminds.com
- **Documentation**: See [docs/](docs/) directory

---

## Security

For security concerns, please email security@strellerminds.com instead of using the issue tracker.

### Security Features

- ✅ JWT authentication with refresh tokens
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ XSS prevention
- ✅ SQL injection prevention (TypeORM parameterized queries)
- ✅ Secure password hashing (bcrypt)
- ✅ Helmet security headers
- ✅ Secure logging (sensitive data redaction)
- ✅ HTTPS/TLS support
- ✅ Certificate pinning support

---

**Last Updated**: 2024
**Framework**: NestJS 11.1.12
**Node.js**: 18.x, 20.x
**Database**: PostgreSQL 15+
