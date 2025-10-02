import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { TestingModule } from '@nestjs/testing';

// Load test environment variables
config({ path: '.env.test' });

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.JEST_VERBOSE === 'true' ? console.log : jest.fn(),
  debug: process.env.JEST_VERBOSE === 'true' ? console.debug : jest.fn(),
  info: process.env.JEST_VERBOSE === 'true' ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Global test timeout
jest.setTimeout(30000);

// Mock external services by default
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-cloudfront', () => ({
  CloudFrontClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  CreateInvalidationCommand: jest.fn(),
  GetDistributionCommand: jest.fn(),
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  })),
}));

// Global test database connection
let testDataSource: DataSource;

// Setup and teardown hooks
beforeAll(async () => {
  // Initialize test database connection if needed
  if (process.env.DATABASE_URL) {
    // Database setup would go here
  }
});

afterAll(async () => {
  // Cleanup test database connection
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup after each test
  jest.restoreAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidDate(): R;
      toHaveValidationError(field: string): R;
      toMatchApiResponse(): R;
    }
  }

  var testUtils: {
    createTestingModule: (metadata: any) => Promise<TestingModule>;
    createMockRepository: () => any;
    createMockService: (methods: string[]) => any;
    generateTestData: (type: string, overrides?: any) => any;
    cleanupDatabase: () => Promise<void>;
  };
}

// Export test utilities
global.testUtils = {
  createTestingModule: async (metadata: any): Promise<TestingModule> => {
    const { Test } = await import('@nestjs/testing');
    return Test.createTestingModule(metadata).compile();
  },

  createMockRepository: () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      execute: jest.fn(),
    })),
  }),

  createMockService: (methods: string[]) => {
    const mockService = {};
    methods.forEach((method) => {
      mockService[method] = jest.fn();
    });
    return mockService;
  },

  generateTestData: (type: string, overrides: any = {}) => {
    // This will be implemented with factories
    return { ...overrides };
  },

  cleanupDatabase: async () => {
    // Database cleanup implementation
    if (testDataSource && testDataSource.isInitialized) {
      // Clean up test data
    }
  },
};

// Environment validation
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must be run with NODE_ENV=test');
}
