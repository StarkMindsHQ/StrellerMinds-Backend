// Jest setup file for global test configuration
process.env.NODE_ENV = 'test';

// Set test timeouts
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'test_user';
process.env.DATABASE_PASSWORD = 'test_password';
process.env.DATABASE_NAME = 'test_db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock external services
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    search: jest.fn(),
    index: jest.fn(),
    bulk: jest.fn(),
  })),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    charges: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  })),
}));

jest.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromSecret: jest.fn(),
    random: jest.fn(),
  },
  Server: jest.fn().mockImplementation(() => ({
    loadAccount: jest.fn(),
    submitTransaction: jest.fn(),
  })),
  TransactionBuilder: {
    fromXDR: jest.fn(),
  },
}));

// Global test utilities
export const createTestModule = async (entities: any[] = [], providers: any[] = []) => {
  const { Test } = await import('@nestjs/testing');
  const { ConfigModule } = await import('@nestjs/config');
  const { TypeOrmModule } = await import('@nestjs/typeorm');
  const { CacheModule } = await import('@nestjs/cache-manager');
  const { ThrottlerModule } = await import('@nestjs/throttler');

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            NODE_ENV: 'test',
            JWT_SECRET: 'test-secret',
            JWT_EXPIRES_IN: '1h',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
            REDIS_URL: 'redis://localhost:6379/1',
          }),
        ],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
        database: 'test_db',
        entities: entities,
        synchronize: true,
        logging: false,
      }),
      CacheModule.register({
        isGlobal: true,
        ttl: 60,
        max: 100,
      }),
      ThrottlerModule.forRoot([
        {
          ttl: 60,
          limit: 100,
        },
      ]),
    ],
    providers: providers,
  }).compile();

  return moduleRef;
};

export const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  query: jest.fn(),
  createQueryBuilder: jest.fn(),
});

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockCourse = {
  id: 'test-course-id',
  title: 'Test Course',
  description: 'Test Description',
  price: 99.99,
  isActive: true,
  instructorId: 'test-instructor-id',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAuthPayload = {
  sub: mockUser.id,
  email: mockUser.email,
  role: mockUser.role,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

// Mock request/response objects
export const mockRequest = (overrides = {}) => ({
  user: mockUser,
  headers: {},
  query: {},
  params: {},
  body: {},
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashedPassword',
  role: 'USER',
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestCourse = (overrides = {}) => ({
  id: 'test-course-id',
  title: 'Test Course',
  description: 'Test Description',
  price: 99.99,
  duration: 3600,
  level: 'BEGINNER',
  isActive: true,
  instructorId: 'test-instructor-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestAssignment = (overrides = {}) => ({
  id: 'test-assignment-id',
  title: 'Test Assignment',
  description: 'Test Description',
  courseId: 'test-course-id',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  maxScore: 100,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
