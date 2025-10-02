import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for integration tests
 * This runs once before all test suites
 */
export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  try {
    // Ensure test environment variables are set
    process.env.NODE_ENV = 'test';

    // Create test directories if they don't exist
    const testDirs = ['uploads/certificates', 'logs/tests', 'temp/integration'];

    for (const dir of testDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created test directory: ${dir}`);
      }
    }

    // Setup test database if PostgreSQL is available
    try {
      await setupTestDatabase();
    } catch (error) {
      console.warn('⚠️  Database setup skipped - PostgreSQL not available');
      console.warn('Tests will run with mocked database operations');
    }

    // Initialize test utilities
    setupTestUtils();

    // Setup test logging
    setupTestLogging();

    console.log('✅ Integration test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  const { Client } = require('pg');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres', // Connect to default database first
    connectTimeoutMillis: 5000,
  });

  try {
    await client.connect();

    // Check if test database exists
    const dbName = process.env.DB_DATABASE || 'strellerminds_test';
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

    if (result.rows.length === 0) {
      console.log(`📊 Creating test database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
    }

    await client.end();
    console.log('✅ Test database setup complete');
  } catch (error) {
    await client.end();
    throw error;
  }
}

function setupTestUtils() {
  // Add global test utilities
  global.testUtils = {
    // Database cleanup utility (will be overridden by DatabaseTestModule)
    cleanupDatabase: async () => {
      console.log('🧹 Database cleanup (mock)');
    },

    // Seeding utility (will be overridden by DatabaseTestModule)
    seedDatabase: async (seedData: any) => {
      console.log('🌱 Database seeding (mock)', Object.keys(seedData));
    },

    // Transaction utility (will be overridden by DatabaseTestModule)
    runInTransaction: async (callback: Function) => {
      console.log('🔄 Running in transaction (mock)');
      await callback();
    },

    // Test data generators
    generateTestEmail: (prefix = 'test') =>
      `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,

    generateTestData: (type: string, overrides = {}) => {
      const baseData = {
        user: {
          email: global.testUtils.generateTestEmail(),
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          name: 'Test User',
        },
        course: {
          title: 'Test Course',
          description: 'A comprehensive test course',
          price: 99.99,
          currency: 'USD',
          level: 'beginner',
          category: 'programming',
          tags: ['test'],
          isPublished: true,
        },
        payment: {
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        },
      };

      return { ...baseData[type], ...overrides };
    },

    // Async utilities
    delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

    waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 5000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await condition()) {
          return true;
        }
        await global.testUtils.delay(100);
      }
      throw new Error(`Condition not met within ${timeout}ms`);
    },
  };

  console.log('🛠️  Test utilities initialized');
}

function setupTestLogging() {
  // Create test log directory
  const logDir = path.join(process.cwd(), 'logs/tests');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Setup test-specific logging
  const testLogFile = path.join(
    logDir,
    `integration-${new Date().toISOString().split('T')[0]}.log`,
  );

  // Override console methods to include file logging
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] LOG: ${args.join(' ')}\n`;
    fs.appendFileSync(testLogFile, message);
    originalConsoleLog(...args);
  };

  console.error = (...args) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ERROR: ${args.join(' ')}\n`;
    fs.appendFileSync(testLogFile, message);
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] WARN: ${args.join(' ')}\n`;
    fs.appendFileSync(testLogFile, message);
    originalConsoleWarn(...args);
  };

  console.log('📝 Test logging initialized');
}

// Global type declarations
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        cleanupDatabase: () => Promise<void>;
        seedDatabase: (seedData: any) => Promise<void>;
        runInTransaction: (callback: Function) => Promise<void>;
        generateTestEmail: (prefix?: string) => string;
        generateTestData: (type: string, overrides?: any) => any;
        delay: (ms: number) => Promise<void>;
        waitFor: (
          condition: () => boolean | Promise<boolean>,
          timeout?: number,
        ) => Promise<boolean>;
      };
    }
  }
}

export {};
