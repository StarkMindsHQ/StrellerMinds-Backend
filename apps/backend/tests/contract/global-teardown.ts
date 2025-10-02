import { Config } from '@jest/types';

/**
 * Global teardown for Pact contract tests
 * This runs once after all tests
 */

export default async function globalTeardown(globalConfig: Config.GlobalConfig) {
  console.log('🧹 Global teardown for Pact contract tests...');

  // Generate contract testing summary
  const fs = require('fs');
  const path = require('path');

  const pactsDir = path.resolve(process.cwd(), 'pacts');
  const logsDir = path.resolve(process.cwd(), 'logs');

  // Count generated contracts
  let contractCount = 0;
  if (fs.existsSync(pactsDir)) {
    const files = fs.readdirSync(pactsDir);
    contractCount = files.filter((file: string) => file.endsWith('.json')).length;
  }

  // Count log files
  let logCount = 0;
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    logCount = files.filter((file: string) => file.endsWith('.log')).length;
  }

  console.log(`📊 Contract Testing Summary:`);
  console.log(`   - Contracts generated: ${contractCount}`);
  console.log(`   - Log files created: ${logCount}`);

  // Create summary file
  const summary = {
    timestamp: new Date().toISOString(),
    contractsGenerated: contractCount,
    logFilesCreated: logCount,
    environment: process.env.NODE_ENV,
    pactBrokerConfigured: !!(
      process.env.PACT_BROKER_URL && process.env.PACT_BROKER_URL !== 'https://your-pact-broker.com'
    ),
  };

  const summaryPath = path.resolve(process.cwd(), 'pact-test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`📄 Summary written to: ${summaryPath}`);
  console.log('✅ Global teardown completed');
}
