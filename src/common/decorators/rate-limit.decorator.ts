import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { getEndpointRateLimit, getEnvironmentOverrides } from '../../config/rate-limit.config';

/**
 * Metadata key for storing rate limit configuration
 */
export const RATE_LIMIT_METADATA_KEY = 'rate_limit_config';

/**
 * Rate limit configuration interface for decorators
 */
export interface RateLimitDecoratorConfig {
  /** Category of endpoint (auth, files, blockchain, etc.) */
  category: 'auth' | 'files' | 'blockchain' | 'general';
  /** Specific endpoint name */
  endpoint: string;
  /** Override limit (optional) */
  limit?: number;
  /** Override TTL in seconds (optional) */
  ttl?: number;
  /** Custom key prefix (optional) */
  keyPrefix?: string;
  /** Skip rate limiting (for testing or special cases) */
  skip?: boolean;
}

/**
 * Custom rate limit decorator that uses centralized configuration
 *
 * @param config - Rate limit configuration
 * @returns Decorator function
 *
 * @example
 * ```typescript
 * @RateLimit({ category: 'auth', endpoint: 'login' })
 * @Post('login')
 * async login(@Body() loginDto: LoginDto) {
 *   // Implementation
 * }
 * ```
 */
export function RateLimit(config: RateLimitDecoratorConfig) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_METADATA_KEY, config),
    // Apply the actual throttle decorator with calculated values
    Throttle(
      config.limit || getEndpointRateLimit(config.category, config.endpoint)?.limit || 100,
      config.ttl || getEndpointRateLimit(config.category, config.endpoint)?.ttl || 60,
    ),
  );
}

/**
 * Authentication-specific rate limiting decorators
 */
export const AuthRateLimit = {
  /**
   * Login endpoint rate limiting
   * Default: 5 requests per minute (production), 10 (development)
   */
  login: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'auth',
      endpoint: 'login',
      keyPrefix: 'auth_login',
      ...overrides,
    }),

  /**
   * Registration endpoint rate limiting
   * Default: 2 requests per minute (production), 5 (development)
   */
  register: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'auth',
      endpoint: 'register',
      keyPrefix: 'auth_register',
      ...overrides,
    }),

  /**
   * Password reset endpoint rate limiting
   * Default: 2 requests per minute (production), 3 (development)
   */
  passwordReset: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'auth',
      endpoint: 'passwordReset',
      keyPrefix: 'auth_reset',
      ...overrides,
    }),

  /**
   * Token refresh endpoint rate limiting
   * Default: 10 requests per minute (production), 20 (development)
   */
  refreshToken: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'auth',
      endpoint: 'refreshToken',
      keyPrefix: 'auth_refresh',
      ...overrides,
    }),

  /**
   * Email verification endpoint rate limiting
   * Default: 3 requests per minute (production), 5 (development)
   */
  verifyEmail: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'auth',
      endpoint: 'verifyEmail',
      keyPrefix: 'auth_verify',
      ...overrides,
    }),
};

/**
 * File operation rate limiting decorators
 */
export const FileRateLimit = {
  /**
   * File upload endpoint rate limiting
   * Default: 10 requests per minute (production), 20 (development)
   */
  upload: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'files',
      endpoint: 'upload',
      keyPrefix: 'files_upload',
      ...overrides,
    }),

  /**
   * File download endpoint rate limiting
   * Default: 30 requests per minute (production), 50 (development)
   */
  download: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'files',
      endpoint: 'download',
      keyPrefix: 'files_download',
      ...overrides,
    }),

  /**
   * Chunk upload endpoint rate limiting
   * Default: 60 requests per minute (production), 100 (development)
   */
  chunkUpload: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'files',
      endpoint: 'chunkUpload',
      keyPrefix: 'files_chunk',
      ...overrides,
    }),

  /**
   * Video upload endpoint rate limiting
   * Default: 5 requests per minute (production), 10 (development)
   */
  videoUpload: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'files',
      endpoint: 'videoUpload',
      keyPrefix: 'video_upload',
      ...overrides,
    }),
};

/**
 * Blockchain operation rate limiting decorators
 */
export const BlockchainRateLimit = {
  /**
   * Wallet connection endpoint rate limiting
   * Default: 5 requests per minute (production), 10 (development)
   */
  walletConnect: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'blockchain',
      endpoint: 'walletConnect',
      keyPrefix: 'wallet_connect',
      ...overrides,
    }),

  /**
   * Credential sharing endpoint rate limiting
   * Default: 10 requests per minute (production), 15 (development)
   */
  credentialShare: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'blockchain',
      endpoint: 'credentialShare',
      keyPrefix: 'cred_share',
      ...overrides,
    }),

  /**
   * Certificate issuance endpoint rate limiting
   * Default: 2 requests per minute (production), 5 (development)
   */
  certificateIssue: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'blockchain',
      endpoint: 'certificateIssue',
      keyPrefix: 'cert_issue',
      ...overrides,
    }),

  /**
   * Credential verification endpoint rate limiting
   * Default: 15 requests per minute (production), 20 (development)
   */
  verification: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'blockchain',
      endpoint: 'verification',
      keyPrefix: 'verification',
      ...overrides,
    }),

  /**
   * Blockchain transaction endpoint rate limiting
   * Default: 5 requests per minute (production), 10 (development)
   */
  transaction: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'blockchain',
      endpoint: 'transaction',
      keyPrefix: 'blockchain_tx',
      ...overrides,
    }),
};

/**
 * General API rate limiting decorators
 */
export const GeneralRateLimit = {
  /**
   * Default API endpoint rate limiting
   * Default: 60 requests per minute (production), 100 (development)
   */
  default: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'general',
      endpoint: 'default',
      keyPrefix: 'general',
      ...overrides,
    }),

  /**
   * Analytics endpoint rate limiting
   * Default: 30 requests per minute (production), 50 (development)
   */
  analytics: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'general',
      endpoint: 'analytics',
      keyPrefix: 'analytics',
      ...overrides,
    }),

  /**
   * Webhook endpoint rate limiting
   * Default: 20 requests per minute (production), 30 (development)
   */
  webhook: (overrides?: Partial<RateLimitDecoratorConfig>) =>
    RateLimit({
      category: 'general',
      endpoint: 'webhook',
      keyPrefix: 'webhook',
      ...overrides,
    }),
};

/**
 * Skip rate limiting decorator (for testing or special cases)
 */
export function SkipRateLimit() {
  return RateLimit({
    category: 'general',
    endpoint: 'default',
    skip: true,
  });
}

/**
 * Custom rate limit with specific values
 *
 * @param limit - Number of requests allowed
 * @param ttl - Time window in seconds
 * @param keyPrefix - Optional key prefix
 *
 * @example
 * ```typescript
 * @CustomRateLimit(5, 60, 'custom_endpoint')
 * @Post('custom')
 * async customEndpoint() {
 *   // Implementation
 * }
 * ```
 */
export function CustomRateLimit(limit: number, ttl: number, keyPrefix?: string) {
  return RateLimit({
    category: 'general',
    endpoint: 'custom',
    limit,
    ttl,
    keyPrefix,
  });
}
