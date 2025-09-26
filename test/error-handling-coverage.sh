#!/bin/bash

# Script to generate test coverage for error handling components
echo "Generating Error Handling Test Coverage Report"

# Create coverage directory if it doesn't exist
mkdir -p coverage/error-handling

# Run tests with coverage for error handling components
echo "Running tests with coverage..."

# Coverage for error dashboard service
npm run test:cov -- test/unit/error-dashboard/error-dashboard.service.spec.ts

# Coverage for global exception filter
npm run test:cov -- test/unit/common/filters/global-exception.filter.spec.ts

# Coverage for correlation ID middleware
npm run test:cov -- test/unit/common/middleware/correlation-id.middleware.spec.ts

# Coverage for alerting service
npm run test:cov -- test/unit/common/alerting/alerting.service.spec.ts

# Coverage for error log entity
npm run test:cov -- test/unit/common/entities/error-log.entity.spec.ts

# Coverage for integration tests
npm run test:e2e:cov -- test/integration/error-handling/error-handling.e2e-spec.ts

echo "Coverage reports generated in coverage/error-handling/"
echo "Open coverage/error-handling/index.html to view detailed coverage report"