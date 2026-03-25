export interface WebhookEvent {
  id: string;
  type: string;
  provider: string;
  payload: any;
  timestamp: number;
  signature?: string;
  headers?: Record<string, string>;
}

export interface WebhookSignatureConfig {
  secret: string;
  algorithm: string;
  headerName: string;
  timestampHeader?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface WebhookLogEntry {
  id: string;
  provider: string;
  eventType: string;
  status: 'success' | 'failed' | 'retry';
  timestamp: Date;
  duration: number;
  error?: string;
  payload?: any;
  headers?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}

export interface WebhookRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface WebhookReplayProtectionConfig {
  enabled: boolean;
  windowMs: number;
  maxDuplicates: number;
}

export interface WebhookSecurityConfig {
  signature: WebhookSignatureConfig;
  rateLimit: WebhookRateLimitConfig;
  replayProtection: WebhookReplayProtectionConfig;
  logging: {
    enabled: boolean;
    includePayload: boolean;
    includeHeaders: boolean;
    retentionDays: number;
  };
}

export enum WebhookProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ZOOM = 'zoom',
  CUSTOM = 'custom',
}

export interface WebhookProviderConfig {
  provider: WebhookProvider;
  security: WebhookSecurityConfig;
  endpoints: string[];
  enabled: boolean;
}
