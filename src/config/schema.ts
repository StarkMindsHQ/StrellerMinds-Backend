import Joi from 'joi';

export const configSchema = Joi.object({
  app: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
    environment: Joi.string().valid('development', 'staging', 'production').required(),
  }).required(),

  server: Joi.object({
    port: Joi.number().port().required(),
    host: Joi.string().required(),
    cors: Joi.object({
      enabled: Joi.boolean().required(),
      origins: Joi.array().items(Joi.string()).required(),
    }).required(),
    rateLimit: Joi.object({
      windowMs: Joi.number().positive().required(),
      maxRequests: Joi.number().positive().required(),
    }).required(),
  }).required(),

  database: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    database: Joi.string().required(),
    ssl: Joi.boolean().required(),
    maxConnections: Joi.number().positive().required(),
    timeout: Joi.number().positive().required(),
  }).required(),

  redis: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    password: Joi.string().optional(),
    db: Joi.number().min(0).required(),
    maxRetries: Joi.number().min(0).required(),
  }).required(),

  logging: Joi.object({
    level: Joi.string().valid('debug', 'info', 'warn', 'error').required(),
    format: Joi.string().valid('json', 'text').required(),
    file: Joi.object({
      enabled: Joi.boolean().required(),
      path: Joi.string().required(),
      maxSize: Joi.string().required(),
      maxFiles: Joi.number().positive().required(),
    }).optional(),
  }).required(),

  features: Joi.object().pattern(Joi.string(), Joi.boolean()).required(),
});

// Environment-specific validation schemas
export const environmentSchemas = {
  development: configSchema.keys({
    database: configSchema.extract('database').keys({
      ssl: Joi.boolean().valid(false), // SSL typically disabled in dev
    }),
  }),

  staging: configSchema.keys({
    logging: configSchema.extract('logging').keys({
      level: Joi.string().valid('debug', 'info', 'warn').required(),
    }),
  }),

  production: configSchema.keys({
    database: configSchema.extract('database').keys({
      ssl: Joi.boolean().valid(true).required(), // SSL required in production
    }),
    logging: configSchema.extract('logging').keys({
      level: Joi.string().valid('warn', 'error').required(),
      file: Joi.object({
        enabled: Joi.boolean().valid(true).required(), // File logging required in prod
      }).required(),
    }),
  }),
};
