module.exports = {
  displayName: 'Contract Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/backend/tests/contract'],
  testMatch: ['**/*.pact.test.ts', '**/*.contract.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.pact.test.ts',
    '!src/**/*.contract.test.ts',
  ],
  coverageDirectory: 'coverage/contract',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/apps/backend/tests/contract/setup.ts'],
  testTimeout: 30000, // 30 seconds timeout for contract tests
  maxWorkers: 1, // Run contract tests sequentially to avoid port conflicts
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@contract/(.*)$': '<rootDir>/apps/backend/tests/contract/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  // Pact-specific configuration
  testEnvironmentOptions: {
    // Ensure Pact tests have enough time to complete
    timeout: 30000,
  },
  // Ensure Pact files are generated in the correct directory
  globalSetup: '<rootDir>/apps/backend/tests/contract/global-setup.ts',
  globalTeardown: '<rootDir>/apps/backend/tests/contract/global-teardown.ts',
};
