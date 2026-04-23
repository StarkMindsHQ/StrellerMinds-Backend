/**
 * Rate limiting configuration for authentication endpoints
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix
}

export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
    keyPrefix: 'rl:login:',
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 attempts
    keyPrefix: 'rl:register:',
  },
  FORGOT_PASSWORD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts
    keyPrefix: 'rl:forgot-password:',
  },
  RESET_PASSWORD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts
    keyPrefix: 'rl:reset-password:',
  },
  VERIFY_EMAIL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 attempts
    keyPrefix: 'rl:verify-email:',
  },
  REFRESH_TOKEN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 attempts
    keyPrefix: 'rl:refresh-token:',
  },
};
