import * as winston from 'winston';
import * as path from 'path';
import { ElasticsearchTransport, ElasticsearchTransportOptions } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';

// Environment detection
const nodeEnv = process.env.NODE_ENV || 'development';

// Log directory
const logDir = process.env.LOG_DIR || 'logs';

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for structured logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ level: true, message: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const contextStr = context ? `[${context}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${contextStr}${message}${metaStr}`;
  }),
);

// Console simple format
const simpleConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ level: true }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  }),
);

// Elasticsearch transport configuration
const getElasticsearchOptions = (): ElasticsearchTransportOptions | null => {
  const esNode = process.env.ELASTICSEARCH_NODE;
  const esIndex = process.env.ELASTICSEARCH_LOG_INDEX || 'strellerminds-logs';

  if (!esNode) {
    return null;
  }

  return {
    level: 'info',
    index: esIndex,
    indexPrefix: esIndex,
    indexSuffixPattern: 'YYYY-MM-DD',
    transformer: (logData: any) => {
      return {
        '@timestamp': logData.timestamp,
        severity: logData.level,
        message: logData.message,
        service: 'strellerminds-backend',
        environment: nodeEnv,
        ...logData.meta,
      };
    },
    client: new Client({
      node: esNode,
      auth: process.env.ELASTICSEARCH_AUTH
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD,
          }
        : undefined,
    }) as unknown as ElasticsearchTransportOptions['client'],
  };
};

// Get log level based on environment
const getLogLevel = (): string => {
  switch (nodeEnv) {
    case 'production':
      return 'info';
    case 'staging':
      return 'debug';
    case 'development':
    default:
      return 'debug';
  }
};

// Create transports array
const transports: winston.transport[] = [];

// Console transport - different format for production vs development
if (nodeEnv === 'production') {
  // Production: JSON logs for log aggregation
  transports.push(
    new winston.transports.Console({
      format: jsonFormat,
      handleExceptions: true,
    }),
  );
} else {
  // Development: Human-readable colored logs
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
    }),
  );
}

// File transports for different log levels
// Combined log (all levels)
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    level: 'debug',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    zippedArchive: true,
  }),
);

// Error log
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    zippedArchive: true,
  }),
);

// Warning log
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'warning.log'),
    level: 'warn',
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    zippedArchive: true,
  }),
);

// Security log (for auth, access, etc.)
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'security.log'),
    level: 'warn',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    zippedArchive: true,
  }),
);

// API request log
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'api.log'),
    level: 'info',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    zippedArchive: true,
  }),
);

// Add Elasticsearch transport if configured
const esOptions = getElasticsearchOptions();
if (esOptions) {
  try {
    transports.push(new ElasticsearchTransport(esOptions as ElasticsearchTransportOptions));
  } catch (error) {
    console.warn('Failed to initialize Elasticsearch transport:', error);
  }
}

// Create the logger configuration
export const winstonConfig = {
  level: getLogLevel(),
  format: jsonFormat,
  transports,
  exitOnError: false,
  handleRejections: true,
};

// Create a custom logger for application use
export const createAppLogger = (context?: string): winston.Logger => {
  return winston.createLogger({
    ...winstonConfig,
    defaultMeta: context ? { context } : {},
  });
};

// Export default logger instance
export const logger = createAppLogger();

// Additional specialized loggers
export const apiLogger = createAppLogger('API');
export const securityLogger = createAppLogger('Security');
export const errorLogger = createAppLogger('Error');
