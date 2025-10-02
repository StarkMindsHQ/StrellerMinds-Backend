#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntegrationTestRunner {
  constructor() {
    this.testSuites = {
      'user-registration': ['test/integration/user-registration.integration.spec.ts'],
      'course-enrollment': ['test/integration/course-enrollment.integration.spec.ts'],
      'certificate-generation': ['test/integration/certificate-generation.integration.spec.ts'],
      'payment-processing': ['test/integration/payment-processing.integration.spec.ts'],
      'blockchain-interaction': ['test/integration/blockchain-interaction.integration.spec.ts'],
      auth: ['test/integration/auth/auth.integration.spec.ts'],
      all: ['test/integration/**/*.spec.ts'],
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '✗' : type === 'success' ? '✓' : '•';
    console.log(`${prefix} ${message}`);
  }

  async checkEnvironment() {
    this.log('=== Environment Check ===');

    // Check if .env.test exists
    const envTestPath = path.join(process.cwd(), '.env.test');
    if (fs.existsSync(envTestPath)) {
      this.log('.env.test file found', 'success');
    } else {
      this.log('.env.test file not found, creating a minimal one...', 'error');
      this.createTestEnvFile();
    }

    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`);

    // Check if dependencies are installed
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      this.log('Dependencies are installed', 'success');
    } else {
      this.log('Dependencies not found, please run: npm install', 'error');
      return false;
    }

    return true;
  }

  createTestEnvFile() {
    const envContent = `# Test Environment Configuration
NODE_ENV=test

# Database Configuration for Testing (using in-memory or docker)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=strellerminds_test

# JWT Configuration
JWT_SECRET=test-jwt-secret-key-for-integration-tests
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration (for testing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Email Configuration (mock for testing)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=test
EMAIL_PASS=test
EMAIL_FROM=test@strellerminds.com

# Payment Configuration (test/sandbox)
STRIPE_SECRET_KEY=sk_test_dummy_key_for_testing
STRIPE_WEBHOOK_SECRET=whsec_test_dummy

# Cloudinary Configuration (test)
CLOUDINARY_CLOUD_NAME=test_cloud
CLOUDINARY_API_KEY=test_key
CLOUDINARY_API_SECRET=test_secret

# Stellar Configuration (testnet)
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Other test configurations
LOG_LEVEL=error
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=1000
`;

    fs.writeFileSync('.env.test', envContent);
    this.log('.env.test file created', 'success');
  }

  async checkDatabaseConnectivity() {
    this.log('=== Database Connectivity Check ===');

    try {
      // Try to connect using node pg client instead of pg_isready
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: 'postgres', // Connect to default postgres database first
        connectTimeoutMillis: 5000,
      });

      await client.connect();
      await client.query('SELECT NOW()');
      await client.end();

      this.log('Database connectivity verified', 'success');
      return true;
    } catch (error) {
      this.log('Database connectivity check failed', 'error');
      this.log('Error: ' + error.message, 'error');
      this.log('', 'info');
      this.log('Database connection options:', 'info');
      this.log('1. Start PostgreSQL locally:', 'info');
      this.log('   - macOS: brew services start postgresql', 'info');
      this.log('   - Ubuntu: sudo service postgresql start', 'info');
      this.log('   - Windows: net start postgresql-x64-13', 'info');
      this.log('', 'info');
      this.log('2. Use Docker:', 'info');
      this.log(
        '   docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:13',
        'info',
      );
      this.log('', 'info');
      this.log('3. Use in-memory database (SQLite) for testing:', 'info');
      this.log('   Set DB_TYPE=sqlite in .env.test', 'info');

      return false;
    }
  }

  async setupTestDatabase() {
    this.log('=== Test Database Setup ===');

    try {
      // Check if test database exists, create if not
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: 'postgres',
      });

      await client.connect();

      // Check if test database exists
      const dbName = process.env.DB_DATABASE || 'strellerminds_test';
      const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

      if (result.rows.length === 0) {
        this.log(`Creating test database: ${dbName}`, 'info');
        await client.query(`CREATE DATABASE ${dbName}`);
        this.log('Test database created successfully', 'success');
      } else {
        this.log('Test database already exists', 'success');
      }

      await client.end();
      return true;
    } catch (error) {
      this.log('Failed to setup test database: ' + error.message, 'error');
      return false;
    }
  }

  async runTests(suiteNames = ['all']) {
    this.log('=== Running Integration Tests ===');

    try {
      // Set NODE_ENV to test
      process.env.NODE_ENV = 'test';

      // Determine which tests to run
      let testFiles = [];
      for (const suiteName of suiteNames) {
        if (this.testSuites[suiteName]) {
          testFiles = testFiles.concat(this.testSuites[suiteName]);
        } else {
          this.log(`Unknown test suite: ${suiteName}`, 'error');
          this.log(`Available suites: ${Object.keys(this.testSuites).join(', ')}`, 'info');
          return false;
        }
      }

      // Remove duplicates
      testFiles = [...new Set(testFiles)];

      this.log(`Running tests: ${testFiles.join(', ')}`, 'info');

      // Build Jest command
      const jestArgs = [
        '--config',
        'test/jest-integration.json',
        '--testPathPattern=' + testFiles.join('|').replace(/\//g, '\\/'),
        '--runInBand', // Run tests serially for integration tests
        '--forceExit', // Exit after tests complete
        '--detectOpenHandles', // Detect handles that prevent Jest from exiting
        '--verbose',
        '--maxWorkers=1', // Ensure tests run sequentially
      ];

      if (process.env.CI) {
        jestArgs.push('--ci');
      }

      // Run tests
      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      return new Promise((resolve) => {
        jestProcess.on('close', (code) => {
          if (code === 0) {
            this.log('All integration tests passed!', 'success');
            resolve(true);
          } else {
            this.log('Some integration tests failed', 'error');
            resolve(false);
          }
        });
      });
    } catch (error) {
      this.log('Failed to run tests: ' + error.message, 'error');
      return false;
    }
  }

  async run() {
    console.log('StrellerMinds Integration Test Runner');
    console.log('====================================');

    const suiteNames = process.argv.slice(2);
    if (suiteNames.length === 0) {
      suiteNames.push('all');
    }

    try {
      // Check environment
      const envOk = await this.checkEnvironment();
      if (!envOk) {
        process.exit(1);
      }

      // Check database connectivity
      const dbOk = await this.checkDatabaseConnectivity();
      if (dbOk) {
        // Setup test database
        const setupOk = await this.setupTestDatabase();
        if (!setupOk) {
          process.exit(1);
        }
      } else {
        this.log('Proceeding with tests (database may be mocked)', 'info');
      }

      // Run tests
      const testsOk = await this.runTests(suiteNames);

      if (testsOk) {
        this.log('Integration test run completed successfully', 'success');
        process.exit(0);
      } else {
        this.log('Integration test run completed with failures', 'error');
        process.exit(1);
      }
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Handle CLI execution
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run().catch(console.error);
}

module.exports = IntegrationTestRunner;
