import * as Joi from 'joi';
import * as crypto from 'crypto';

// Custom validators for enhanced security
const securePasswordValidator = (value: string, helpers: any) => {
  if (value.length < 32) {
    return helpers.message('Secret must be at least 32 characters long');
  }
  
  if (value.includes('placeholder') || value.includes('change_this')) {
    return helpers.message('Secret contains placeholder text that must be replaced');
  }
  
  return value;
};

const urlWithProtocolValidator = (value: string, helpers: any) => {
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return helpers.message('URL must include protocol (http:// or https://)');
  }
  return value;
};

const emailValidator = (value: string, helpers: any) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return helpers.message('Invalid email format');
  }
  return value;
};

const portValidator = (value: string, helpers: any) => {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return helpers.message('Port must be between 1 and 65535');
  }
  return value;
};

const stellarSecretKeyValidator = (value: string, helpers: any) => {
  if (value.includes('<') || value.includes('>')) {
    return helpers.message(
      'Stellar secret key must be replaced with an actual key from a secure secrets manager',
    );
  }

  const stellarKeyPattern = /^S[A-Z0-9]{55}$/;
  if (!stellarKeyPattern.test(value)) {
    return helpers.message(
      'Stellar secret key must start with "S" followed by 55 uppercase alphanumeric characters',
    );
  }

  if (value.length !== 56) {
    return helpers.message('Stellar secret key must be exactly 56 characters long');
  }

  const insecurePatterns = [
    /^(.)\1+$/,
    /password|secret|test|example|placeholder/i,
  ];

  for (const pattern of insecurePatterns) {
    if (pattern.test(value)) {
      return helpers.message(
        'Stellar secret key contains insecure patterns. Use a securely generated random key',
      );
    }
  }

  return value;
};

const awsKeyValidator = (value: string, helpers: any) => {
  // AWS Access Key ID validation (starts with AKIA/ASIA, 16-20 chars)
  const accessKeyPattern = /^(AKIA|ASIA)[A-Z0-9]{16}$/;
  if (!accessKeyPattern.test(value)) {
    return helpers.message('Invalid AWS Access Key ID format');
  }
  return value;
};

const webhookSecretValidator = (value: string, helpers: any) => {
  if (value.length < 32) {
    return helpers.message('Webhook secret must be at least 32 characters long');
  }
  
  if (value.includes('placeholder') || value.includes('your_')) {
    return helpers.message('Webhook secret contains placeholder text that must be replaced');
  }
  
  return value;
};

// Environment-specific configurations
const developmentConfig = {
  NODE_ENV: 'development',
  LOG_LEVEL: 'debug',
  DATABASE_HOST: 'localhost',
  REDIS_HOST: 'localhost',
  SENTRY_ENABLED: false,
  ALERTING_ENABLED: false,
};

const stagingConfig = {
  NODE_ENV: 'staging',
  LOG_LEVEL: 'info',
  SENTRY_ENABLED: true,
  ALERTING_ENABLED: true,
};

const productionConfig = {
  NODE_ENV: 'production',
  LOG_LEVEL: 'warn',
  SENTRY_ENABLED: true,
  ALERTING_ENABLED: true,
};

// Base validation schema
const baseValidationSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000).custom(portValidator),

  // Database Configuration
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432).custom(portValidator),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required().custom(securePasswordValidator),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().optional(),
  DATABASE_POOL_MAX: Joi.number().default(10).min(1).max(100),
  DATABASE_POOL_MIN: Joi.number().default(1).min(0),
  DATABASE_IDLE_TIMEOUT: Joi.number().default(30000).min(1000),
  DATABASE_RETRY_ATTEMPTS: Joi.number().default(5).min(1).max(10),
  DATABASE_RETRY_DELAY: Joi.number().default(3000).min(100),

  // JWT Configuration
  JWT_SECRET: Joi.string().required().custom(securePasswordValidator),
  JWT_REFRESH_SECRET: Joi.string().required().custom(securePasswordValidator),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_EMAIL_EXPIRES_IN: Joi.string().default('24h'),
  JWT_PASSWORD_RESET_EXPIRES_IN: Joi.string().default('1h'),

  // Email Configuration
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587).custom(portValidator),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required().custom(emailValidator),
  SMTP_PASS: Joi.string().required().custom(securePasswordValidator),
  SMTP_FROM: Joi.string().required().custom(emailValidator),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60000).min(1000),
  RATE_LIMIT_MAX: Joi.number().default(10).min(1),

  // File Uploads
  UPLOAD_DIR: Joi.string().default('./uploads'),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required().custom(securePasswordValidator),

  // Stellar Configuration
  SOROBAN_RPC_URL: Joi.string().uri().required().custom(urlWithProtocolValidator),
  STELLAR_NETWORK: Joi.string().valid('TESTNET', 'MAINNET').default('TESTNET'),
  CREDENTIAL_CONTRACT_ID: Joi.string().required(),
  SIGNER_SECRET_KEY: Joi.string().required().custom(stellarSecretKeyValidator),

  // AWS Configuration
  AWS_ACCESS_KEY_ID: Joi.string().required().custom(awsKeyValidator),
  AWS_SECRET_ACCESS_KEY: Joi.string().required().custom(securePasswordValidator),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_BACKUP_BUCKET: Joi.string().required(),
  AWS_BACKUP_REPLICA_BUCKET: Joi.string().optional(),
  AWS_BACKUP_REPLICA_REGION: Joi.string().optional(),
  AWS_CLOUDFRONT_DISTRIBUTION_ID: Joi.string().optional(),
  AWS_CLOUDFRONT_DOMAIN: Joi.string().optional(),
  AWS_S3_BUCKET: Joi.string().optional(),
  AWS_CLOUDFRONT_PRIVATE_KEY_ID: Joi.string().optional(),
  AWS_CLOUDFRONT_PRIVATE_KEY: Joi.string().optional(),
  AWS_SIGNED_URL_EXPIRY: Joi.number().default(3600).min(60),

  // Backup Configuration
  BACKUP_DIR: Joi.string().default('./backups'),
  BACKUP_RETENTION_DAYS: Joi.number().default(30).min(1),
  BACKUP_MONTHLY_RETENTION_MONTHS: Joi.number().default(12).min(1),
  BACKUP_VERIFICATION_ENABLED: Joi.boolean().default(true),
  BACKUP_ENCRYPTION_ENABLED: Joi.boolean().default(true),
  BACKUP_ENCRYPTION_KEY: Joi.string().when('BACKUP_ENCRYPTION_ENABLED', {
    is: true,
    then: Joi.required().custom(securePasswordValidator),
    otherwise: Joi.optional(),
  }),
  BACKUP_CLOUD_UPLOAD_ENABLED: Joi.boolean().default(true),
  BACKUP_CROSS_REGION_REPLICATION: Joi.boolean().default(true),
  BACKUP_DAILY_RETENTION_DAYS: Joi.number().default(30).min(1),
  BACKUP_WEEKLY_RETENTION_WEEKS: Joi.number().default(12).min(1),
  BACKUP_MONTHLY_RETENTION_MONTHS: Joi.number().default(12).min(1),
  BACKUP_YEARLY_RETENTION_YEARS: Joi.number().default(7).min(1),
  BACKUP_SCHEDULING_ENABLED: Joi.boolean().default(true),
  BACKUP_RECOVERY_TEST_ENABLED: Joi.boolean().default(true),
  BACKUP_RECOVERY_TEST_DATABASE: Joi.string().optional(),
  BACKUP_ALERT_ON_SUCCESS: Joi.boolean().default(false),
  BACKUP_ALERT_ON_FAILURE: Joi.boolean().default(true),
  BACKUP_ALERT_ON_RECOVERY_TEST: Joi.boolean().default(true),
  BACKUP_STORAGE_WARNING_THRESHOLD_GB: Joi.number().default(500).min(1),

  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
  LOG_FILE_ENABLED: Joi.boolean().default(true),
  LOG_FILE_PATH: Joi.string().default('logs/app-%DATE%.log'),
  LOG_FILE_MAX_SIZE: Joi.string().default('20m'),
  LOG_FILE_MAX_FILES: Joi.number().default(14).min(1),
  LOG_CONSOLE_ENABLED: Joi.boolean().default(true),
  LOG_CONSOLE_COLORIZE: Joi.boolean().default(true),
  LOG_ERROR_FILE_ENABLED: Joi.boolean().default(true),
  LOG_ERROR_FILE_PATH: Joi.string().default('logs/error-%DATE%.log'),
  LOG_ERROR_FILE_MAX_SIZE: Joi.string().default('20m'),
  LOG_ERROR_FILE_MAX_FILES: Joi.number().default(30).min(1),

  // Sentry Configuration
  SENTRY_ENABLED: Joi.boolean().default(false),
  SENTRY_DSN: Joi.string().when('SENTRY_ENABLED', {
    is: true,
    then: Joi.required().uri(),
    otherwise: Joi.optional(),
  }),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().default(0.1).min(0).max(1),
  SENTRY_DEBUG: Joi.boolean().default(false),
  SENTRY_HTTP_INTEGRATION: Joi.boolean().default(true),
  SENTRY_EXPRESS_INTEGRATION: Joi.boolean().default(true),
  SENTRY_CONSOLE_INTEGRATION: Joi.boolean().default(true),

  // Alerting Configuration
  ALERTING_ENABLED: Joi.boolean().default(false),
  EMAIL_ALERTS_ENABLED: Joi.boolean().default(false),
  EMAIL_ALERT_RECIPIENTS: Joi.string().when('EMAIL_ALERTS_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SLACK_ALERTS_ENABLED: Joi.boolean().default(false),
  SLACK_WEBHOOK_URL: Joi.string().when('SLACK_ALERTS_ENABLED', {
    is: true,
    then: Joi.required().uri(),
    otherwise: Joi.optional(),
  }),
  SLACK_ALERT_CHANNEL: Joi.string().default('#alerts'),
  WEBHOOK_ALERTS_ENABLED: Joi.boolean().default(false),
  WEBHOOK_ALERT_URL: Joi.string().when('WEBHOOK_ALERTS_ENABLED', {
    is: true,
    then: Joi.required().uri(),
    otherwise: Joi.optional(),
  }),
  WEBHOOK_ALERT_HEADERS: Joi.string().optional(),
  ERROR_RATE_THRESHOLD: Joi.number().default(0.05).min(0).max(1),
  RESPONSE_TIME_THRESHOLD: Joi.number().default(5000).min(100),
  CRITICAL_ERROR_CODES: Joi.string().default('INTERNAL_ERROR,DATABASE_ERROR,EXTERNAL_SERVICE_ERROR'),
  ALERT_RATE_LIMITING_ENABLED: Joi.boolean().default(true),
  MAX_ALERTS_PER_HOUR: Joi.number().default(10).min(1),
  ALERT_COOLDOWN_MINUTES: Joi.number().default(5).min(1),

  // Video Configuration
  VIDEO_PROCESSING_ENABLED: Joi.boolean().default(true),
  VIDEO_PROCESSING_CONCURRENT_JOBS: Joi.number().default(2).min(1).max(10),
  VIDEO_PROCESSING_TEMP_DIR: Joi.string().default('./temp/video-processing'),
  FFMPEG_PATH: Joi.string().default('/usr/bin/ffmpeg'),
  FFPROBE_PATH: Joi.string().default('/usr/bin/ffprobe'),
  VIDEO_TOKEN_EXPIRY: Joi.number().default(3600).min(60),
  VIDEO_DRM_ENABLED: Joi.boolean().default(false),
  DRM_WIDEVINE_LICENSE_URL: Joi.string().optional().uri(),
  DRM_WIDEVINE_CERT_URL: Joi.string().optional().uri(),
  DRM_FAIRPLAY_LICENSE_URL: Joi.string().optional().uri(),
  DRM_FAIRPLAY_CERT_URL: Joi.string().optional().uri(),
  VIDEO_ANALYTICS_ENABLED: Joi.boolean().default(true),
  VIDEO_ANALYTICS_BATCH_SIZE: Joi.number().default(100).min(1),
  VIDEO_ANALYTICS_RETENTION_DAYS: Joi.number().default(365).min(1),
  VIDEO_DEFAULT_QUALITIES: Joi.string().default('240p,360p,480p,720p,1080p'),
  VIDEO_ADAPTIVE_STREAMING_ENABLED: Joi.boolean().default(true),
  VIDEO_HLS_ENABLED: Joi.boolean().default(true),
  VIDEO_DASH_ENABLED: Joi.boolean().default(true),
  VIDEO_THUMBNAIL_COUNT: Joi.number().default(5).min(1),
  VIDEO_PREVIEW_ENABLED: Joi.boolean().default(true),
  VIDEO_MAX_FILE_SIZE: Joi.number().default(5368709120).min(1),
  VIDEO_ALLOWED_FORMATS: Joi.string().default('mp4,webm,mov,avi,mkv'),
  VIDEO_MAX_DURATION: Joi.number().default(7200).min(1),
  VIDEO_MIN_DURATION: Joi.number().default(1).min(1),

  // OpenTelemetry Configuration
  OTEL_SERVICE_NAME: Joi.string().default('streller-minds-backend'),
  OTEL_COLLECTOR_URL: Joi.string().uri().default('http://localhost:4318/v1/traces'),
  OTEL_EXPORTER: Joi.string().valid('otlp', 'jaeger', 'zipkin').default('jaeger'),
  OTEL_SAMPLER_PROBABILITY: Joi.number().default(1.0).min(0).max(1),
  OTEL_RESOURCE_ATTRIBUTES: Joi.string().default('service.version=1.0'),

  // Elasticsearch Configuration
  ELASTICSEARCH_NODE: Joi.string().uri().required(),
  ELASTICSEARCH_USERNAME: Joi.string().required(),
  ELASTICSEARCH_PASSWORD: Joi.string().required().custom(securePasswordValidator),

  // Webhook Security Configuration
  STRIPE_WEBHOOK_SECRET: Joi.string().required().custom(webhookSecretValidator),
  PAYPAL_WEBHOOK_SECRET: Joi.string().required().custom(webhookSecretValidator),
  ZOOM_WEBHOOK_SECRET: Joi.string().required().custom(webhookSecretValidator),
  CUSTOM_WEBHOOK_SECRET: Joi.string().required().custom(webhookSecretValidator),
  WEBHOOK_RATE_LIMIT_STRIPE: Joi.number().default(100).min(1),
  WEBHOOK_RATE_LIMIT_PAYPAL: Joi.number().default(50).min(1),
  WEBHOOK_RATE_LIMIT_ZOOM: Joi.number().default(200).min(1),
  WEBHOOK_RATE_LIMIT_CUSTOM: Joi.number().default(100).min(1),
  WEBHOOK_REPLAY_WINDOW: Joi.number().default(300000).min(60000),
  WEBHOOK_LOG_RETENTION_DAYS: Joi.number().default(30).min(1),
  WEBHOOK_LOG_INCLUDE_PAYLOAD: Joi.boolean().default(false),
  WEBHOOK_LOG_INCLUDE_HEADERS: Joi.boolean().default(true),

  // Redis Configuration
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379).custom(portValidator),

  // Feature Flags
  FEATURE_NEW_DASHBOARD: Joi.boolean().default(false),
});

// Environment-specific validation schemas
export const getValidationSchema = (env: string) => {
  let envDefaults = {};
  
  switch (env) {
    case 'development':
      envDefaults = developmentConfig;
      break;
    case 'staging':
      envDefaults = stagingConfig;
      break;
    case 'production':
      envDefaults = productionConfig;
      break;
    default:
      envDefaults = developmentConfig;
  }

  return baseValidationSchema.keys(
    Object.keys(envDefaults).reduce((acc, key) => {
      acc[key] = Joi.any().default(envDefaults[key]);
      return acc;
    }, {})
  );
};

export const validationSchema = baseValidationSchema;
