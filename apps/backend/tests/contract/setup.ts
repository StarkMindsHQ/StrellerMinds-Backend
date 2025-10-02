import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

/**
 * Global setup for Pact contract tests
 */

// Global test timeout
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  console.log('🚀 Setting up Pact contract testing environment...');

  // Create necessary directories
  const fs = require('fs');
  const path = require('path');

  const pactsDir = path.resolve(process.cwd(), 'pacts');
  const logsDir = path.resolve(process.cwd(), 'logs');

  if (!fs.existsSync(pactsDir)) {
    fs.mkdirSync(pactsDir, { recursive: true });
  }

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  console.log('✅ Pact contract testing environment ready');
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up Pact contract testing environment...');

  // Add any global cleanup logic here
  console.log('✅ Pact contract testing environment cleaned up');
});

// Setup before each test
beforeEach(() => {
  // Clear any global state before each test
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Add any per-test cleanup logic here
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});
