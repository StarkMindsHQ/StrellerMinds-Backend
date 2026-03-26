export interface TestDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  logging: boolean;
  synchronize: boolean;
  dropSchema: boolean;
  entities: string[];
  migrations: string[];
  seeds: string[];
}

export const defaultTestDatabaseConfig: TestDatabaseConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
  username: process.env.TEST_DB_USERNAME || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_NAME || 'strellerminds_test',
  ssl: process.env.TEST_DB_SSL === 'true',
  logging: process.env.NODE_ENV === 'test' && process.env.TEST_DB_LOGGING === 'true',
  synchronize: process.env.NODE_ENV === 'test',
  dropSchema: process.env.NODE_ENV === 'test',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*.ts'],
  seeds: [__dirname + '/../seeds/*.ts'],
};

export interface TestDataConfig {
  defaultDataSet: 'minimal' | 'standard' | 'full';
  isolationEnabled: boolean;
  autoCleanup: boolean;
  versioningEnabled: boolean;
  cleanupAfterTest: boolean;
  maxTestDuration: number; // in minutes
  seedTimeout: number; // in seconds
  cleanupTimeout: number; // in seconds
}

export const defaultTestDataConfig: TestDataConfig = {
  defaultDataSet: 'standard',
  isolationEnabled: true,
  autoCleanup: true,
  versioningEnabled: true,
  cleanupAfterTest: true,
  maxTestDuration: 30,
  seedTimeout: 60,
  cleanupTimeout: 30,
};

export interface TestEnvironmentConfig {
  database: TestDatabaseConfig;
  testData: TestDataConfig;
}

export const defaultTestConfig: TestEnvironmentConfig = {
  database: defaultTestDatabaseConfig,
  testData: defaultTestDataConfig,
};

/**
 * Load test configuration from environment variables
 */
export function loadTestConfig(): TestEnvironmentConfig {
  return {
    database: {
      ...defaultTestDatabaseConfig,
      host: process.env.TEST_DB_HOST || defaultTestDatabaseConfig.host,
      port: parseInt(process.env.TEST_DB_PORT || defaultTestDatabaseConfig.port.toString(), 10),
      username: process.env.TEST_DB_USERNAME || defaultTestDatabaseConfig.username,
      password: process.env.TEST_DB_PASSWORD || defaultTestDatabaseConfig.password,
      database: process.env.TEST_DB_NAME || defaultTestDatabaseConfig.database,
      ssl: process.env.TEST_DB_SSL === 'true',
      logging: process.env.TEST_DB_LOGGING === 'true',
    },
    testData: {
      ...defaultTestDataConfig,
      defaultDataSet: (process.env.TEST_DEFAULT_DATA_SET as any) || defaultTestDataConfig.defaultDataSet,
      isolationEnabled: process.env.TEST_ISOLATION_ENABLED !== 'false',
      autoCleanup: process.env.TEST_AUTO_CLEANUP !== 'false',
      versioningEnabled: process.env.TEST_VERSIONING_ENABLED !== 'false',
      cleanupAfterTest: process.env.TEST_CLEANUP_AFTER_TEST !== 'false',
      maxTestDuration: parseInt(process.env.TEST_MAX_DURATION || defaultTestDataConfig.maxTestDuration.toString(), 10),
      seedTimeout: parseInt(process.env.TEST_SEED_TIMEOUT || defaultTestDataConfig.seedTimeout.toString(), 10),
      cleanupTimeout: parseInt(process.env.TEST_CLEANUP_TIMEOUT || defaultTestDataConfig.cleanupTimeout.toString(), 10),
    },
  };
}

/**
 * Validate test configuration
 */
export function validateTestConfig(config: TestEnvironmentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate database config
  if (!config.database.host) {
    errors.push('Database host is required');
  }

  if (!config.database.username) {
    errors.push('Database username is required');
  }

  if (!config.database.database) {
    errors.push('Database name is required');
  }

  if (config.database.port < 1 || config.database.port > 65535) {
    errors.push('Database port must be between 1 and 65535');
  }

  // Validate test data config
  if (!['minimal', 'standard', 'full'].includes(config.testData.defaultDataSet)) {
    errors.push('Default data set must be one of: minimal, standard, full');
  }

  if (config.testData.maxTestDuration < 1) {
    errors.push('Max test duration must be at least 1 minute');
  }

  if (config.testData.seedTimeout < 1) {
    errors.push('Seed timeout must be at least 1 second');
  }

  if (config.testData.cleanupTimeout < 1) {
    errors.push('Cleanup timeout must be at least 1 second');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get test configuration for specific environment
 */
export function getTestConfigForEnvironment(env: string = 'test'): TestEnvironmentConfig {
  const baseConfig = loadTestConfig();

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          logging: true,
          synchronize: true,
        },
        testData: {
          ...baseConfig.testData,
          isolationEnabled: false,
          autoCleanup: false,
        },
      };

    case 'ci':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          logging: false,
          synchronize: true,
          dropSchema: true,
        },
        testData: {
          ...baseConfig.testData,
          defaultDataSet: 'minimal',
          isolationEnabled: true,
          autoCleanup: true,
          maxTestDuration: 10,
        },
      };

    case 'e2e':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          logging: false,
          synchronize: false,
          dropSchema: false,
        },
        testData: {
          ...baseConfig.testData,
          defaultDataSet: 'standard',
          isolationEnabled: false,
          autoCleanup: false,
        },
      };

    default:
      return baseConfig;
  }
}
