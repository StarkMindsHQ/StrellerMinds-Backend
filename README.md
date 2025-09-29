**StrellerMinds-Backend**

StrellerMinds-Backend is the NestJS-based API server powering StarkMinds, a pioneering blockchain education platform built on Stellar. This repository provides secure, scalable endpoints for user authentication, course management, data persistence, and integration with Stellar smart contracts.

**Features**  
• Secure JWT-based authentication and authorization  
• RESTful APIs for managing courses and user data  
• Integration with Stellar smart contracts for on-chain interactions  
• Modular architecture with environment-based configuration  
• Comprehensive logging, error handling, and testing (Jest)  
• Auto-generated API docs with Swagger  
• CI/CD pipeline integration for continuous delivery

**Getting Started**

_Prerequisites:_  
• Node.js v14 or higher  
• npm  
• Docker and Docker Compose (for local development services)
• PostgreSQL (if not using Docker)

## Local Development with Docker Compose

The easiest way to set up local development is using Docker Compose, which provides all necessary services:

### Quick Start

1. Clone the repository:  
   `git clone https://github.com/your-username/strellerminds-backend.git`
2. Change to the project directory:  
   `cd strellerminds-backend`
3. Copy the development environment file:  
   `cp development.env.example .env.development`
4. Start all services:  
   `docker-compose up -d`
5. Install dependencies:  
   `npm install`
6. Start the development server:  
   `npm run start:dev`

### Services Included

The Docker Compose setup includes:

- **PostgreSQL** (port 5432): Database with persistent storage
- **Redis** (port 6379): Cache and queue management with password protection
- **Mailhog** (ports 1025/8025): Email testing with web UI at http://localhost:8025
- **LocalStack** (port 4566): AWS S3 emulation for file storage

### Service URLs

- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api
- **Mailhog Web UI**: http://localhost:8025
- **LocalStack S3**: http://localhost:4566

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v

# Restart a specific service
docker-compose restart postgres

# Check service health
docker-compose ps
```

### Manual Installation (without Docker)

1. Clone the repository:  
   `git clone https://github.com/your-username/strellerminds-backend.git`
2. Change to the project directory:  
   `cd strellerminds-backend`
3. Install dependencies:  
   `npm install`
4. Set up PostgreSQL database and Redis
5. Create a `.env` file based on the provided `.env.example`
6. Start the development server:  
   `npm run start:dev`

_Contribution Guidelines:_  
• Fork the repository and create a feature branch.  
• Follow the established ESLint/Prettier configurations.  
• Write tests for new features and ensure all existing tests pass.  
• Submit a detailed pull request describing your changes.

**Contact**  
For questions or feedback, please open an issue or contact the maintainers.

# User Data Retention Policy

## Overview

This document outlines the data retention policies for user accounts within our platform, focusing on how user data is handled during account deactivation and deletion processes. These policies have been designed to comply with privacy regulations while maintaining the integrity of blockchain credentials where necessary.

## Account States

User accounts may exist in one of the following states:

1. **Active** - Normal operational state
2. **Deactivated** - Temporarily suspended but recoverable
3. **Pending Deletion** - Awaiting confirmation for permanent deletion
4. **Deleted** - Permanently removed (soft-deleted with data scrubbing)

## Data Categories

User data is categorized as follows:

### Personal Identifiable Information (PII)

- Full name
- Email address
- Profile picture
- Biography
- Other personal details

### Account Data

- User ID
- Account credentials (password hash)
- Role information
- Account creation and activity timestamps

### Blockchain Credentials

- Wallet address
- Chain ID
- Wallet type
- Associated blockchain credentials

### Activity Data

- Learning progress
- Course completion records
- Transaction history (if applicable)

## Retention Periods

| Data Category          | Active Account | Deactivated Account | Post-Deletion                               |
| ---------------------- | -------------- | ------------------- | ------------------------------------------- |
| PII                    | Retained       | Retained            | Scrubbed immediately                        |
| Account Data           | Retained       | Retained            | Soft-deleted for 30 days, then hard-deleted |
| Blockchain Credentials | Retained       | Retained            | Preserved indefinitely for compliance\*     |
| Activity Data          | Retained       | Retained            | Soft-deleted for 30 days, then hard-deleted |

\* _Retention of blockchain credentials is necessary for compliance with financial regulations and to maintain the integrity of blockchain transactions. These credentials are dissociated from personal information upon account deletion._

## Data Handling Procedures

### Account Deactivation

When an account is deactivated:

- All data is preserved
- Access to the account is suspended
- User can reactivate the account at any time
- Deactivation is logged for audit purposes

### Account Deletion Request

When a user requests account deletion:

1. User must confirm deletion via a secure link sent to their email
2. Account is marked as "Pending Deletion"
3. User has 24 hours to cancel the deletion request
4. Request is logged for audit purposes

### Account Deletion Process

When account deletion is confirmed:

1. Personal identifiable information is immediately scrubbed:
   - Name fields are replaced with "[REDACTED]"
   - Email is anonymized
   - Profile picture and bio are removed
2. Account is soft-deleted and marked as "Deleted"
3. Blockchain credentials are preserved but dissociated from personal information
4. Learning progress data is soft-deleted
5. Deletion is logged for audit purposes
6. Complete data purge is scheduled after the retention period

### Final Data Purge

After the 30-day retention period:

1. All remaining user data is permanently deleted from the system
2. Blockchain credentials are reviewed and retained only if necessary for legal compliance
3. Purge is logged for audit purposes

## Compliance Considerations

This data retention policy is designed to comply with:

- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Other applicable privacy regulations

The policy provides users with the "right to be forgotten" while maintaining necessary data for legal and operational requirements.

## Audit Trail

All account state changes and data handling operations are logged with:

- Action type
- Timestamp
- User ID (or system identifier for automated processes)
- Details of the action performed

Audit logs are retained for a minimum of 2 years for compliance purposes.

## Special Considerations for Blockchain Data

Due to the immutable nature of blockchain technology:

- Transactions recorded on the blockchain cannot be removed
- Wallet addresses and public keys remain on the blockchain
- Our system preserves the minimum necessary information to maintain blockchain integrity
- All preserved blockchain data is dissociated from personal information

## Policy Review

This data retention policy is reviewed annually and updated as necessary to comply with evolving regulations and platform requirements.

# OAuth Strategy Integration Guide

## Supported Providers

- Google
- Facebook
- Apple Sign-In

## Design Pattern

- All OAuth strategies implement `IAuthStrategy`
- Each is wrapped in an Adapter to conform to internal structure
- Dynamic injection via 'AUTH_STRATEGIES' token
- Strategy selection based on `provider` string

## Flow

1. User hits `/auth/{provider}` → redirects to provider login
2. Callback `/auth/{provider}/callback` is handled
3. User profile is validated, token issued via `AuthService.login`
4. Optionally, credentials can be used to `register` or `link` accounts

## Adding a New Provider

1. Implement provider’s Passport strategy
2. Create Adapter implementing `IAuthStrategy`
3. Register Adapter and Strategy in AuthModule
4. Add new route in AuthController

# API Documentation

The backend provides interactive OpenAPI (Swagger) documentation and supports SDK generation for client integration.

### Swagger UI
- Access the interactive API docs at: `/api` (e.g., http://localhost:3000/api)
- All endpoints, request/response models, and modules are grouped and described for clarity.

### SDK Generation

You can generate client SDKs in various languages using the OpenAPI spec:

#### Generate OpenAPI Spec

```
npm run generate:openapi
```

#### Generate SDK (example using openapi-generator-cli)

```
npx openapi-generator-cli generate -i http://localhost:3000/api-json -g typescript-axios -o ./sdk/typescript
```

Replace `typescript-axios` and output path as needed for your target language.

### Scripts

- `generate:openapi`: Exports the OpenAPI spec to `openapi.json` for SDK generation.

### SDK Consumption

You can consume the published TypeScript Axios SDK directly from npm once a release tag is created and the automation publishes the package.

- Install:

```
npm install @starkmindshq/strellerminds-sdk
```

or

```
yarn add @starkmindshq/strellerminds-sdk
```

- Basic usage:

```ts
import { Configuration, DefaultApi } from '@starkmindshq/strellerminds-sdk';

const config = new Configuration({
  basePath: 'https://api.yourdomain.com',
  accessToken: () => 'YOUR_JWT_TOKEN',
});

const api = new DefaultApi(config);

// Example call (replace with actual API class/method generated from tags)
api.healthControllerGetHealth().then((res) => {
  console.log('API health:', res.data);
});
```

- Version alignment:
  The SDK version matches the backend `package.json` version used for the git tag. For example, pushing tag `v1.2.3` publishes SDK version `1.2.3`.

- Release assets and spec:
  Each GitHub Release includes the `openapi.json` and a `sdk-<version>.tgz` archive for manual download if needed.


## Contributing

Please follow the contribution guidelines outlined in the **Getting Started** section. Additionally, ensure your code changes do not break the API contract and are reflected in the OpenAPI documentation.

# OAuth Strategy Integration Guide

## Supported Providers

- Google
- Facebook
- Apple Sign-In

## Design Pattern

- All OAuth strategies implement `IAuthStrategy`
- Each is wrapped in an Adapter to conform to internal structure
- Dynamic injection via 'AUTH_STRATEGIES' token
- Strategy selection based on `provider` string

## Flow

1. User hits `/auth/{provider}` → redirects to provider login
2. Callback `/auth/{provider}/callback` is handled
3. User profile is validated, token issued via `AuthService.login`
4. Optionally, credentials can be used to `register` or `link` accounts

## Adding a New Provider

1. Implement provider’s Passport strategy
2. Create Adapter implementing `IAuthStrategy`
3. Register Adapter and Strategy in AuthModule
4. Add new route in AuthController

# API Documentation

The backend provides interactive OpenAPI (Swagger) documentation and supports SDK generation for client integration.

### Swagger UI
- Access the interactive API docs at: `/api` (e.g., http://localhost:3000/api)
- All endpoints, request/response models, and modules are grouped and described for clarity.

### SDK Generation

You can generate client SDKs in various languages using the OpenAPI spec:

#### Generate OpenAPI Spec

```
npm run generate:openapi
```

#### Generate SDK (example using openapi-generator-cli)

```
npx openapi-generator-cli generate -i http://localhost:3000/api-json -g typescript-axios -o ./sdk/typescript
```

Replace `typescript-axios` and output path as needed for your target language.

### Scripts

- `generate:openapi`: Exports the OpenAPI spec to `openapi.json` for SDK generation.

## Contributing

Please follow the contribution guidelines outlined in the **Getting Started** section. Additionally, ensure your code changes do not break the API contract and are reflected in the OpenAPI documentation.


# Contract Testing with Pact

We use Pact for consumer-driven contract tests against external integrations:
- Stellar Horizon API
- SMTP Provider
- S3 (LocalStack)

## Running locally
```bash
yarn test:contract