import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for integration tests
 * This runs once after all test suites complete
 */
export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // Clean up test databases
    await cleanupTestDatabase();

    // Clean up temporary files
    cleanupTempFiles();

    // Generate test summary
    generateTestSummary();

    console.log('✅ Integration test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup integration test environment:', error);
    // Don't throw here as it might mask test failures
  }
}

async function cleanupTestDatabase() {
  try {
    const { Client } = require('pg');

    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: 'postgres',
      connectTimeoutMillis: 5000,
    });

    await client.connect();

    // Optionally drop test database (be careful in CI environments)
    if (process.env.CI || process.env.CLEANUP_TEST_DB === 'true') {
      const dbName = process.env.DB_DATABASE || 'strellerminds_test';

      // Terminate active connections to the test database
      await client.query(
        `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity 
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `,
        [dbName],
      );

      // Drop the test database
      await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
      console.log(`🗑️  Test database ${dbName} dropped`);
    } else {
      console.log('📊 Test database preserved (set CLEANUP_TEST_DB=true to drop)');
    }

    await client.end();
  } catch (error) {
    console.warn('⚠️  Database cleanup skipped:', error.message);
  }
}

function cleanupTempFiles() {
  const tempDirs = [
    'temp/integration',
    'uploads/certificates', // Only if test-generated
    'logs/tests', // Preserve recent logs, clean old ones
  ];

  for (const dir of tempDirs) {
    const fullPath = path.join(process.cwd(), dir);

    try {
      if (fs.existsSync(fullPath)) {
        if (dir === 'logs/tests') {
          // Keep recent logs, clean old ones (older than 7 days)
          cleanupOldLogs(fullPath);
        } else if (dir === 'uploads/certificates') {
          // Only clean test-generated certificates
          cleanupTestCertificates(fullPath);
        } else {
          // Clean entire temp directory
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`🗑️  Cleaned temp directory: ${dir}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to clean ${dir}:`, error.message);
    }
  }
}

function cleanupOldLogs(logDir: string) {
  const files = fs.readdirSync(logDir);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime.getTime() < sevenDaysAgo) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed old log file: ${file}`);
    }
  }
}

function cleanupTestCertificates(certDir: string) {
  if (!fs.existsSync(certDir)) return;

  const files = fs.readdirSync(certDir);

  for (const file of files) {
    // Only remove files that start with "certificate-" (test generated)
    if (file.startsWith('certificate-')) {
      const filePath = path.join(certDir, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed test certificate: ${file}`);
    }
  }
}

function generateTestSummary() {
  const summaryPath = path.join(process.cwd(), 'logs/tests/integration-summary.json');

  const summary = {
    timestamp: new Date().toISOString(),
    testRun: {
      environment: process.env.NODE_ENV,
      duration: Date.now() - (global as any).testStartTime,
      database: {
        connected: process.env.DB_HOST ? true : false,
        type: 'postgresql',
        database: process.env.DB_DATABASE || 'strellerminds_test',
      },
      cleanup: {
        tempFiles: true,
        certificates: true,
        logs: 'old files only',
        database: process.env.CLEANUP_TEST_DB === 'true',
      },
    },
  };

  try {
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📋 Test summary generated:', summaryPath);
  } catch (error) {
    console.warn('⚠️  Failed to generate test summary:', error.message);
  }
}

export {};
