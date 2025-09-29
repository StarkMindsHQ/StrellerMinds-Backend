const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  displayName: 'StrellerMinds Backend',
  preset: 'ts-jest',
  testEnvironment: 'node',

  rootDir: '.',

  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/test/unit/**/*.spec.ts',
    '<rootDir>/test/integration/**/*.spec.ts',
  ],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/test/e2e/',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.ts'],

  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
      },
    ],
  },

  collectCoverage: false, // still enable with --coverage
  collectCoverageFrom: [
    'src/auth/auth.service.ts',
    'src/payment/payment.service.ts',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'cobertura',
  ],

  // ✅ enforce thresholds only for AuthService + PaymentService
  coverageThreshold: {
    'src/auth/auth.service.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    'src/payment/payment.service.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },

  testTimeout: 30000,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  verbose: false,
  bail: false,
  errorOnDeprecated: true,

  moduleFileExtensions: ['js', 'json', 'ts'],

  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'StrellerMinds Test Report',
        inlineSource: false,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],
};
