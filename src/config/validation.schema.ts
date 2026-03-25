import * as Joi from 'joi';

// Custom validation for Stellar secret keys
const stellarSecretKeyValidator = (value: string, helpers: any) => {
  // Check for placeholder patterns
  if (value.includes('<') || value.includes('>')) {
    return helpers.message('Stellar secret key must be replaced with an actual key from a secure secrets manager');
  }

  // Basic format validation (S + 55 alphanumeric characters)
  const stellarKeyPattern = /^S[A-Z0-9]{55}$/;
  if (!stellarKeyPattern.test(value)) {
    return helpers.message('Stellar secret key must start with "S" followed by 55 uppercase alphanumeric characters');
  }

  // Check minimum length
  if (value.length !== 56) {
    return helpers.message('Stellar secret key must be exactly 56 characters long');
  }

  // Check for common insecure patterns
  const insecurePatterns = [
    /^(.)\1+$/, // Repeated characters
    /password|secret|test|example|placeholder/i,
  ];

  for (const pattern of insecurePatterns) {
    if (pattern.test(value)) {
      return helpers.message('Stellar secret key contains insecure patterns. Use a securely generated random key');
    }
  }

  return value;
};

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  // Authentication
  JWT_SECRET: Joi.string().required(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // Stellar - Enhanced with custom validation for security
  STELLAR_SECRET_KEY: Joi.string().custom(stellarSecretKeyValidator).required(),

  // Email
  EMAIL_ENABLED: Joi.boolean().required(),
  EMAIL_TRACKING_ENABLED: Joi.boolean().required(),
  EMAIL_TRACKING_SECRET: Joi.string().min(32).required(),
  EMAIL_TRACKING_BASE_URL: Joi.string().uri().required(),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
});
