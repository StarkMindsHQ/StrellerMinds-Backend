export interface RateLimitConfig {
  /** Number of requests allowed */
  limit: number;
  /** Time window in seconds */
  ttl: number;
  /** Optional key prefix for rate limiting storage */
  keyPrefix?: string;
  /** Optional description for documentation */
  description?: string;
}

export interface EndpointRateLimit {
  /** Route pattern or controller method name */
  route: string;
  /** Rate limit configuration */
  config: RateLimitConfig;
}

/**
 * Environment-specific rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  development: {
    // Auth endpoints - stricter limits for security
    auth: {
      login: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'auth_login',
        description: 'Login attempts per minute',
      },
      register: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'auth_register',
        description: 'Registration attempts per minute',
      },
      passwordReset: {
        limit: 3,
        ttl: 60,
        keyPrefix: 'auth_reset',
        description: 'Password reset attempts per minute',
      },
      refreshToken: {
        limit: 20,
        ttl: 60,
        keyPrefix: 'auth_refresh',
        description: 'Token refresh attempts per minute',
      },
      verifyEmail: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'auth_verify',
        description: 'Email verification attempts per minute',
      },
    },

    // File upload/download endpoints
    files: {
      upload: {
        limit: 20,
        ttl: 60,
        keyPrefix: 'files_upload',
        description: 'File uploads per minute',
      },
      download: {
        limit: 50,
        ttl: 60,
        keyPrefix: 'files_download',
        description: 'File downloads per minute',
      },
      chunkUpload: {
        limit: 100,
        ttl: 60,
        keyPrefix: 'files_chunk',
        description: 'File chunk uploads per minute',
      },
      videoUpload: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'video_upload',
        description: 'Video uploads per minute',
      },
    },

    // Blockchain and wallet operations
    blockchain: {
      walletConnect: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'wallet_connect',
        description: 'Wallet connections per minute',
      },
      credentialShare: {
        limit: 15,
        ttl: 60,
        keyPrefix: 'cred_share',
        description: 'Credential sharing per minute',
      },
      certificateIssue: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'cert_issue',
        description: 'Certificate issuance per minute',
      },
      verification: {
        limit: 20,
        ttl: 60,
        keyPrefix: 'verification',
        description: 'Credential verifications per minute',
      },
      transaction: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'blockchain_tx',
        description: 'Blockchain transactions per minute',
      },
    },

    // General API endpoints
    general: {
      default: {
        limit: 100,
        ttl: 60,
        keyPrefix: 'general',
        description: 'General API requests per minute',
      },
      analytics: {
        limit: 50,
        ttl: 60,
        keyPrefix: 'analytics',
        description: 'Analytics requests per minute',
      },
      webhook: {
        limit: 30,
        ttl: 60,
        keyPrefix: 'webhook',
        description: 'Webhook operations per minute',
      },
    },
  },

  staging: {
    // Staging environment - more restrictive than development
    auth: {
      login: {
        limit: 8,
        ttl: 60,
        keyPrefix: 'auth_login',
        description: 'Login attempts per minute',
      },
      register: {
        limit: 3,
        ttl: 60,
        keyPrefix: 'auth_register',
        description: 'Registration attempts per minute',
      },
      passwordReset: {
        limit: 2,
        ttl: 60,
        keyPrefix: 'auth_reset',
        description: 'Password reset attempts per minute',
      },
      refreshToken: {
        limit: 15,
        ttl: 60,
        keyPrefix: 'auth_refresh',
        description: 'Token refresh attempts per minute',
      },
      verifyEmail: {
        limit: 3,
        ttl: 60,
        keyPrefix: 'auth_verify',
        description: 'Email verification attempts per minute',
      },
    },

    files: {
      upload: {
        limit: 15,
        ttl: 60,
        keyPrefix: 'files_upload',
        description: 'File uploads per minute',
      },
      download: {
        limit: 40,
        ttl: 60,
        keyPrefix: 'files_download',
        description: 'File downloads per minute',
      },
      chunkUpload: {
        limit: 80,
        ttl: 60,
        keyPrefix: 'files_chunk',
        description: 'File chunk uploads per minute',
      },
      videoUpload: {
        limit: 8,
        ttl: 60,
        keyPrefix: 'video_upload',
        description: 'Video uploads per minute',
      },
    },

    blockchain: {
      walletConnect: {
        limit: 8,
        ttl: 60,
        keyPrefix: 'wallet_connect',
        description: 'Wallet connections per minute',
      },
      credentialShare: {
        limit: 12,
        ttl: 60,
        keyPrefix: 'cred_share',
        description: 'Credential sharing per minute',
      },
      certificateIssue: {
        limit: 3,
        ttl: 60,
        keyPrefix: 'cert_issue',
        description: 'Certificate issuance per minute',
      },
      verification: {
        limit: 15,
        ttl: 60,
        keyPrefix: 'verification',
        description: 'Credential verifications per minute',
      },
      transaction: {
        limit: 8,
        ttl: 60,
        keyPrefix: 'blockchain_tx',
        description: 'Blockchain transactions per minute',
      },
    },

    general: {
      default: {
        limit: 80,
        ttl: 60,
        keyPrefix: 'general',
        description: 'General API requests per minute',
      },
      analytics: {
        limit: 40,
        ttl: 60,
        keyPrefix: 'analytics',
        description: 'Analytics requests per minute',
      },
      webhook: {
        limit: 25,
        ttl: 60,
        keyPrefix: 'webhook',
        description: 'Webhook operations per minute',
      },
    },
  },

  production: {
    // Production environment - most restrictive
    auth: {
      login: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'auth_login',
        description: 'Login attempts per minute',
      },
      register: {
        limit: 2,
        ttl: 60,
        keyPrefix: 'auth_register',
        description: 'Registration attempts per minute',
      },
      passwordReset: {
        limit: 2,
        ttl: 60,
        keyPrefix: 'auth_reset',
        description: 'Password reset attempts per minute',
      },
      refreshToken: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'auth_refresh',
        description: 'Token refresh attempts per minute',
      },
      verifyEmail: {
        limit: 3,
        ttl: 60,
        keyPrefix: 'auth_verify',
        description: 'Email verification attempts per minute',
      },
    },

    files: {
      upload: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'files_upload',
        description: 'File uploads per minute',
      },
      download: {
        limit: 30,
        ttl: 60,
        keyPrefix: 'files_download',
        description: 'File downloads per minute',
      },
      chunkUpload: {
        limit: 60,
        ttl: 60,
        keyPrefix: 'files_chunk',
        description: 'File chunk uploads per minute',
      },
      videoUpload: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'video_upload',
        description: 'Video uploads per minute',
      },
    },

    blockchain: {
      walletConnect: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'wallet_connect',
        description: 'Wallet connections per minute',
      },
      credentialShare: {
        limit: 10,
        ttl: 60,
        keyPrefix: 'cred_share',
        description: 'Credential sharing per minute',
      },
      certificateIssue: {
        limit: 2,
        ttl: 60,
        keyPrefix: 'cert_issue',
        description: 'Certificate issuance per minute',
      },
      verification: {
        limit: 15,
        ttl: 60,
        keyPrefix: 'verification',
        description: 'Credential verifications per minute',
      },
      transaction: {
        limit: 5,
        ttl: 60,
        keyPrefix: 'blockchain_tx',
        description: 'Blockchain transactions per minute',
      },
    },

    general: {
      default: {
        limit: 60,
        ttl: 60,
        keyPrefix: 'general',
        description: 'General API requests per minute',
      },
      analytics: {
        limit: 30,
        ttl: 60,
        keyPrefix: 'analytics',
        description: 'Analytics requests per minute',
      },
      webhook: {
        limit: 20,
        ttl: 60,
        keyPrefix: 'webhook',
        description: 'Webhook operations per minute',
      },
    },
  },
} as const;

/**
 * Get rate limit configuration for current environment
 */
export function getRateLimitConfig(): typeof RATE_LIMIT_CONFIGS.development {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return RATE_LIMIT_CONFIGS.production;
    case 'staging':
      return RATE_LIMIT_CONFIGS.staging;
    case 'development':
    default:
      return RATE_LIMIT_CONFIGS.development;
  }
}

/**
 * Get specific rate limit configuration for an endpoint
 */
export function getEndpointRateLimit(
  category: keyof ReturnType<typeof getRateLimitConfig>,
  endpoint: string,
): RateLimitConfig | null {
  const config = getRateLimitConfig();
  const categoryConfig = config[category] as Record<string, RateLimitConfig>;

  return categoryConfig[endpoint] || null;
}

/**
 * Environment variable overrides for rate limits
 * These allow runtime configuration without code changes
 */
export function getEnvironmentOverrides(): Partial<Record<string, RateLimitConfig>> {
  const overrides: Partial<Record<string, RateLimitConfig>> = {};

  // Auth overrides
  if (process.env.RATE_LIMIT_AUTH_LOGIN) {
    const [limit, ttl] = process.env.RATE_LIMIT_AUTH_LOGIN.split(',').map(Number);
    overrides['auth_login'] = { limit, ttl, keyPrefix: 'auth_login' };
  }

  if (process.env.RATE_LIMIT_AUTH_REGISTER) {
    const [limit, ttl] = process.env.RATE_LIMIT_AUTH_REGISTER.split(',').map(Number);
    overrides['auth_register'] = { limit, ttl, keyPrefix: 'auth_register' };
  }

  if (process.env.RATE_LIMIT_AUTH_RESET) {
    const [limit, ttl] = process.env.RATE_LIMIT_AUTH_RESET.split(',').map(Number);
    overrides['auth_reset'] = { limit, ttl, keyPrefix: 'auth_reset' };
  }

  // File upload overrides
  if (process.env.RATE_LIMIT_FILES_UPLOAD) {
    const [limit, ttl] = process.env.RATE_LIMIT_FILES_UPLOAD.split(',').map(Number);
    overrides['files_upload'] = { limit, ttl, keyPrefix: 'files_upload' };
  }

  if (process.env.RATE_LIMIT_FILES_DOWNLOAD) {
    const [limit, ttl] = process.env.RATE_LIMIT_FILES_DOWNLOAD.split(',').map(Number);
    overrides['files_download'] = { limit, ttl, keyPrefix: 'files_download' };
  }

  // Blockchain overrides
  if (process.env.RATE_LIMIT_BLOCKCHAIN_TX) {
    const [limit, ttl] = process.env.RATE_LIMIT_BLOCKCHAIN_TX.split(',').map(Number);
    overrides['blockchain_tx'] = { limit, ttl, keyPrefix: 'blockchain_tx' };
  }

  if (process.env.RATE_LIMIT_WALLET_CONNECT) {
    const [limit, ttl] = process.env.RATE_LIMIT_WALLET_CONNECT.split(',').map(Number);
    overrides['wallet_connect'] = { limit, ttl, keyPrefix: 'wallet_connect' };
  }

  return overrides;
}

/**
 * Apply environment overrides to base configuration
 */
export function getFinalRateLimitConfig(): typeof RATE_LIMIT_CONFIGS.development {
  const baseConfig = getRateLimitConfig();
  const overrides = getEnvironmentOverrides();

  // Deep clone the base config to avoid mutations
  const finalConfig = JSON.parse(JSON.stringify(baseConfig));

  // Apply overrides
  Object.entries(overrides).forEach(([key, config]) => {
    const [category, endpoint] = key.split('_');
    if (finalConfig[category] && finalConfig[category][endpoint]) {
      finalConfig[category][endpoint] = config;
    }
  });

  return finalConfig;
}
