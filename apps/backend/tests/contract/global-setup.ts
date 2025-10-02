import { Config } from '@jest/types';

/**
 * Global setup for Pact contract tests
 * This runs once before all tests
 */

export default async function globalSetup(globalConfig: Config.GlobalConfig) {
  console.log('🌍 Global setup for Pact contract tests...');

  // Set environment variables for contract tests
  process.env.NODE_ENV = 'test';
  process.env.PACT_LOG_LEVEL = 'info';
  process.env.PACT_PUBLISH_RESULTS = 'false'; // Don't publish during tests

  // Create necessary directories
  const fs = require('fs');
  const path = require('path');

  const dirs = [
    path.resolve(process.cwd(), 'pacts'),
    path.resolve(process.cwd(), 'logs'),
    path.resolve(process.cwd(), 'coverage/contract'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Validate Pact Broker configuration (if provided)
  if (
    process.env.PACT_BROKER_URL &&
    process.env.PACT_BROKER_URL !== 'https://your-pact-broker.com'
  ) {
    console.log(`🔗 Pact Broker URL: ${process.env.PACT_BROKER_URL}`);
  } else {
    console.log('⚠️  Pact Broker URL not configured - contracts will not be published');
  }

  console.log('✅ Global setup completed');
}
