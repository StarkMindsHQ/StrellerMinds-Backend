import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  name: process.env.DATABASE_NAME,
  synchronize: process.env.DATABASE_SYNC === 'true' ? 'true' : 'false',
  autoload: process.env.DATABASE_LOAD === 'true' ? 'true' : 'false',

  // Connection Pool Settings - Optimized for production
  maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  minPoolSize: parseInt(process.env.DATABASE_POOL_MIN) || 5,
  poolIdleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,

  // Retry Mechanism
  retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS) || 5,
  retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY) || 3000,

  // Query Logging and Performance
  logging: true,
  logger: 'advanced-console',
  maxQueryExecutionTime: 100, // Changed from 1000 to 100ms

  // Cache Settings - 1 minute cache duration
  cache: {
    duration: 60000,
  },

  // SSL Configuration
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,

  metrics: {
    totalQueries: 0,
    slowQueries: 0,
    averageExecutionTime: 0,
    // Add more metrics as needed
  },

  // Connection Pool Monitoring
  enablePoolMonitoring: process.env.DATABASE_POOL_MONITORING === 'true' ? true : false,
  poolMetricsInterval: parseInt(process.env.DATABASE_POOL_METRICS_INTERVAL) || 30000, // 30 seconds
}));
