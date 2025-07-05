import { AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  app: {
    name: 'my-app',
    version: '1.0.0',
    environment: 'development',
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['http://localhost:3000'],
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  },
  database: {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'myapp',
    ssl: false,
    maxConnections: 10,
    timeout: 30000,
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    maxRetries: 3,
  },
  logging: {
    level: 'info',
    format: 'json',
    file: {
      enabled: false,
      path: 'logs/app.log',
      maxSize: '10MB',
      maxFiles: 5,
    },
  },
  features: {
    newFeature: false,
    betaFeature: true,
  },
};
