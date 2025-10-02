# Pact Contract Testing Guide

## Overview

This guide explains how to use Pact contract testing in the StrellerMinds-Backend project to ensure API compatibility between services.

## What is Pact?

Pact is a contract testing framework that allows you to test the interactions between services without having to have all services running at the same time. It works by:

1. **Consumer Tests**: Define the expected interactions with external services
2. **Provider Verification**: Verify that the provider actually implements the expected contract
3. **Contract Sharing**: Share contracts via a Pact Broker

## Project Structure

```
apps/backend/tests/contract/
├── stellar.consumer.pact.test.ts    # Stellar API contracts
├── email.consumer.pact.test.ts      # Email service contracts
└── storage.consumer.pact.test.ts    # Cloud storage contracts

pacts/                               # Generated pact files
logs/                                # Pact execution logs
```

## Contract Tests

### 1. Stellar API Contracts

**File**: `apps/backend/tests/contract/stellar.consumer.pact.test.ts`

**Coverage**:

- Account details fetching
- Transaction monitoring
- Error handling scenarios

**Key Interactions**:

- `GET /accounts/{accountId}` - Fetch account details
- `GET /transactions/{txHash}` - Monitor transaction status
- Error responses for invalid accounts/transactions

### 2. Email Service Contracts

**File**: `apps/backend/tests/contract/email.consumer.pact.test.ts`

**Coverage**:

- Single email sending
- Bulk email sending
- Email delivery failures

**Key Interactions**:

- `POST /send` - Send email with `to`, `from`, `subject`, `html`
- Response includes `messageId`, `accepted`, `rejected` arrays
- Error handling for invalid recipients

### 3. Cloud Storage Contracts

**File**: `apps/backend/tests/contract/storage.consumer.pact.test.ts`

**Coverage**:

- File uploads (images, videos)
- File deletion
- AWS S3 integration
- Cloudinary transformations

**Key Interactions**:

- `PUT /uploads/{filename}` - Upload files
- `DELETE /delete/{publicId}` - Delete files
- Response includes `fileUrl`, `publicId`, `secureUrl`

## Running Contract Tests

### Local Development

```bash
# Run all contract tests
npm run test:contract

# Run with watch mode
npm run test:contract:watch

# Run with coverage
npm run test:contract:coverage

# Run specific contract test
npm test apps/backend/tests/contract/stellar.consumer.pact.test.ts
```

### CI/CD Pipeline

Contract tests are automatically run in the CI/CD pipeline:

1. **Consumer Tests**: Run during the build phase
2. **Pact Publishing**: Publish contracts to Pact Broker
3. **Compatibility Check**: Verify compatibility before deployment

## Pact Broker Integration

### Environment Variables

Set these in your CI/CD environment:

```bash
PACT_BROKER_URL=https://your-pact-broker.com
PACT_BROKER_TOKEN=your-broker-token
```

### Publishing Contracts

```bash
# Publish contracts to broker
npm run pact:publish

# Manual publish with specific version
pact-broker publish ./pacts \
  --consumer-app-version=1.2.3 \
  --broker-base-url=$PACT_BROKER_URL \
  --broker-token=$PACT_BROKER_TOKEN
```

### Provider Verification

```bash
# Verify provider against contracts
npm run pact:verify

# Manual verification
pact-broker verify \
  --provider-base-url=http://localhost:3000 \
  --provider-app-version=1.2.3 \
  --broker-base-url=$PACT_BROKER_URL \
  --broker-token=$PACT_BROKER_TOKEN
```

### Compatibility Checks

```bash
# Check if deployment is safe
npm run pact:can-i-deploy

# Manual check
pact-broker can-i-deploy \
  --pacticipant StrellerMinds-Backend \
  --version=1.2.3 \
  --to-environment=production \
  --broker-base-url=$PACT_BROKER_URL \
  --broker-token=$PACT_BROKER_TOKEN
```

## CI/CD Pipeline Integration

### Consumer Job (Build Phase)

```yaml
- name: Run Consumer Contract Tests
  run: npm run test:contract

- name: Publish Pacts to Broker
  run: |
    pact-broker publish ./pacts \
      --consumer-app-version=${{ steps.version.outputs.version }} \
      --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
      --broker-token=${{ secrets.PACT_BROKER_TOKEN }} \
      --branch=${{ github.ref_name }} \
      --build-url=${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

### Provider Verification Job

```yaml
- name: Start provider application
  run: |
    npm run start:dev &
    sleep 30
    # Wait for application to be ready

- name: Run Pact Provider Verification
  run: |
    pact-broker verify \
      --provider-base-url=http://localhost:3000 \
      --provider-app-version=${{ needs.build-and-test.outputs.version }} \
      --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
      --broker-token=${{ secrets.PACT_BROKER_TOKEN }} \
      --publish-verification-results \
      --provider-version-branch=${{ github.ref_name }}
```

### Pre-Deployment Check

```yaml
- name: Check Pact Compatibility
  run: |
    pact-broker can-i-deploy \
      --pacticipant StrellerMinds-Backend \
      --version ${{ needs.build-and-test.outputs.version }} \
      --to-environment production \
      --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
      --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

## Running Contract Tests

### Local Development

```bash
# Run all contract tests
npm run test:contract

# Run with watch mode
npm run test:contract:watch

# Run with coverage
npm run test:contract:coverage

# Run specific contract test
npm test apps/backend/tests/contract/stellar.consumer.pact.test.ts

# Run provider verification tests
npm run test:contract:provider
```

### Setup and Management

```bash
# Initialize Pact testing environment
npm run pact:setup

# Clean up Pact artifacts
npm run pact:cleanup

# Validate contracts against broker
npm run pact:validate
```

### CI/CD Pipeline Commands

```bash
# Run consumer tests and publish contracts
npm run pact:consumer

# Run provider verification
npm run pact:provider

# Check deployment safety
npm run pact:verify-deployment

# Run complete contract testing pipeline
npm run pact:full
```

## Contract Test Files

### 1. Stellar API Contracts

**File**: `apps/backend/tests/contract/stellar.consumer.pact.test.ts`

**Coverage**:

- Account details fetching
- Transaction monitoring
- Error handling scenarios

**Key Interactions**:

- `GET /accounts/{accountId}` - Fetch account details
- `GET /transactions/{txHash}` - Monitor transaction status
- Error responses for invalid accounts/transactions

### 2. Email Service Contracts

**File**: `apps/backend/tests/contract/email.consumer.pact.test.ts`

**Coverage**:

- Single email sending
- Bulk email sending
- Email delivery failures

**Key Interactions**:

- `POST /send` - Send email with `to`, `from`, `subject`, `html`
- Response includes `messageId`, `accepted`, `rejected` arrays
- Error handling for invalid recipients

### 3. Cloud Storage Contracts

**File**: `apps/backend/tests/contract/storage.consumer.pact.test.ts`

**Coverage**:

- File uploads (images, videos)
- File deletion
- AWS S3 integration
- Cloudinary transformations

**Key Interactions**:

- `PUT /uploads/{filename}` - Upload files
- `DELETE /delete/{publicId}` - Delete files
- Response includes `fileUrl`, `publicId`, `secureUrl`

### 4. Payment Gateway Contracts

**File**: `apps/backend/tests/contract/payment.consumer.pact.test.ts`

**Coverage**:

- Customer creation
- Payment intent creation and confirmation
- Webhook signature verification
- Error handling for invalid payments

**Key Interactions**:

- `POST /v1/customers` - Create Stripe customer
- `POST /v1/payment_intents` - Create payment intent
- `POST /v1/payment_intents/{id}/confirm` - Confirm payment
- `POST /v1/webhooks` - Webhook signature verification

### 5. Notification Service Contracts

**File**: `apps/backend/tests/contract/notification.consumer.pact.test.ts`

**Coverage**:

- Firebase Cloud Messaging (FCM) push notifications
- SMS notifications via Twilio
- Batch notification sending
- Error handling for invalid tokens/numbers

**Key Interactions**:

- `POST /v1/projects/{project}/messages:send` - Send FCM notification
- `POST /2010-04-01/Accounts/{account}/Messages.json` - Send SMS
- Error responses for invalid tokens and service unavailability

### 6. Provider Verification

**File**: `apps/backend/tests/contract/provider-verification.test.ts`

**Purpose**: Verifies that the StrellerMinds-Backend provider implements all expected contracts correctly.

## Configuration Files

### Jest Configuration

- `jest.contract.config.js` - Dedicated Jest configuration for contract tests
- `apps/backend/tests/contract/setup.ts` - Test setup and teardown
- `apps/backend/tests/contract/global-setup.ts` - Global test setup
- `apps/backend/tests/contract/global-teardown.ts` - Global test cleanup

### Pact Configuration

- `.pactrc` - Pact CLI configuration file
- Environment variables for Pact Broker integration

## Best Practices

### 1. Contract Design

- **Use Matchers**: Use `Matchers.like()`, `Matchers.integer()`, etc. for flexible matching
- **Include Error Cases**: Test both success and failure scenarios
- **Version Contracts**: Use semantic versioning for contract changes
- **Meaningful States**: Use descriptive provider states for test setup

### 2. Test Organization

- **One Test Per Interaction**: Each test should focus on a single interaction
- **Descriptive Names**: Use clear, descriptive test names and interaction descriptions
- **State Management**: Use provider states to set up test conditions
- **Mock Services Properly**: Ensure service mocks match actual API behavior

### 3. CI/CD Integration

- **Fail Fast**: Run contract tests early in the pipeline
- **Parallel Execution**: Run consumer and provider tests in parallel when possible
- **Automated Verification**: Use webhooks for automatic provider verification
- **Deployment Gates**: Use `can-i-deploy` checks before production deployments
- **Environment Gates**: Use compatibility checks before deployment
- **Notification**: Set up alerts for contract failures

### 4. Maintenance

- **Regular Updates**: Keep contracts up to date with API changes
- **Documentation**: Document contract changes and breaking changes
- **Monitoring**: Monitor contract verification results

## Troubleshooting

### Common Issues

1. **Contract Mismatch**: Provider doesn't match consumer expectations
   - Check provider implementation
   - Update contracts if API has changed

2. **Broker Connection**: Cannot connect to Pact Broker
   - Verify `PACT_BROKER_URL` and `PACT_BROKER_TOKEN`
   - Check network connectivity

3. **Test Failures**: Contract tests failing
   - Check mock service setup
   - Verify service method implementations
   - Review pact logs in `logs/` directory

### Debug Commands

```bash
# Check pact files
ls -la pacts/

# View pact logs
tail -f logs/stellar-pact.log

# Test specific interaction
npm test -- --testNamePattern="should fetch account details"

# Verbose output
npm test -- --verbose
```

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Pact Broker](https://github.com/pact-foundation/pact_broker)
- [Pact CLI](https://github.com/pact-foundation/pact-ruby-standalone)
- [Contract Testing Best Practices](https://pactflow.io/blog/contract-testing-best-practices/)

## Support

For issues with contract testing:

1. Check the logs in `logs/` directory
2. Review the generated pact files in `pacts/`
3. Consult the Pact documentation
4. Contact the development team
