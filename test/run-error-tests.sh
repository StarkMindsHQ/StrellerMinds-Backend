#!/bin/bash

# Script to run error handling tests
echo "Running Error Handling Tests"

# Run unit tests for error dashboard service
echo "Running unit tests for error dashboard service..."
npm run test -- test/unit/error-dashboard/error-dashboard.service.spec.ts

# Run unit tests for global exception filter
echo "Running unit tests for global exception filter..."
npm run test -- test/unit/common/filters/global-exception.filter.spec.ts

# Run unit tests for correlation ID middleware
echo "Running unit tests for correlation ID middleware..."
npm run test -- test/unit/common/middleware/correlation-id.middleware.spec.ts

# Run unit tests for error log entity
echo "Running unit tests for error log entity..."
npm run test -- test/unit/common/entities/error-log.entity.spec.ts

# Run integration tests for error handling
echo "Running integration tests for error handling..."
npm run test:e2e -- test/integration/error-handling/error-handling.e2e-spec.ts

echo "All error handling tests completed!"