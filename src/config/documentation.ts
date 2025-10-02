export const CONFIG_DOCUMENTATION = {
  app: {
    name: 'Application name identifier',
    version: 'Application version (semver format)',
    environment: 'Runtime environment (development|staging|production)',
  },
  server: {
    port: 'HTTP server port (1-65535)',
    host: 'Server bind address',
    cors: {
      enabled: 'Enable CORS middleware',
      origins: 'Allowed CORS origins array',
    },
    rateLimit: {
      windowMs: 'Rate limit window in milliseconds',
      maxRequests: 'Maximum requests per window',
    },
  },
  database: {
    host: 'Database server hostname',
    port: 'Database server port',
    username: 'Database username',
    password: 'Database password',
    database: 'Database name',
    ssl: 'Enable SSL connection',
    maxConnections: 'Maximum connection pool size',
    timeout: 'Query timeout in milliseconds',
  },
  redis: {
    host: 'Redis server hostname',
    port: 'Redis server port',
    password: 'Redis password (optional)',
    db: 'Redis database number',
    maxRetries: 'Maximum retry attempts',
  },
  logging: {
    level: 'Log level (debug|info|warn|error)',
    format: 'Log format (json|text)',
    file: {
      enabled: 'Enable file logging',
      path: 'Log file path',
      maxSize: 'Maximum log file size',
      maxFiles: 'Maximum number of log files',
    },
  },
  features: 'Feature flags object (key-value pairs)',
};

// Example usage file
export const USAGE_EXAMPLES = `
  // Basic usage
  import { getConfigManager } from './config';
  
  const config = getConfigManager();
  const dbHost = config.get('database.host');
  const serverPort = config.get('server.port', 3000);
  
  // With hot reload
  config.enableHotReload();
  config.on('configReloaded', (newConfig) => {
    console.log('Config reloaded:', newConfig.app.version);
  });
  
  // Environment validation
  const validation = config.validateEnvironment();
  if (!validation.isValid) {
    console.error('Environment validation failed:', validation.errors);
  }
  `;
