import * as Joi from 'joi';

export const configuration = () => ({
  port: parseInt(process.env.APP_PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  awsRegion: process.env.AWS_REGION,
  awsSecretName: process.env.AWS_SECRET_NAME,
  featureFlags: {
    newDashboard: process.env.FEATURE_NEW_DASHBOARD === 'true',
  },
});

export const validationSchema = Joi.object({
  APP_PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  DATABASE_URL: Joi.string().uri().optional(), // optional when using DATABASE_HOST/PORT/USER/PASSWORD/NAME
  AWS_REGION: Joi.string().optional().default('us-east-1'),
  AWS_SECRET_NAME: Joi.string().optional().default(''),
  FEATURE_NEW_DASHBOARD: Joi.boolean().default(false),
});
