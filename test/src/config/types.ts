export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  maxConnections: number;
  timeout: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetries: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  file?: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  logging: LoggingConfig;
  features: {
    [key: string]: boolean;
  };
}
