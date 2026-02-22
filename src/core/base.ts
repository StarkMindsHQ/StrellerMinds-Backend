/**
 * Core Integration Abstractions
 * Base classes, interfaces, and utilities for all integrations
 */

export enum IntegrationStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PENDING = 'pending',
  RATE_LIMITED = 'rate_limited',
}

export enum IntegrationType {
  LMS = 'lms',
  SSO = 'sso',
  VIDEO = 'video',
  PRODUCTIVITY = 'productivity',
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, unknown>;
  webhookUrl?: string;
  rateLimits?: RateLimitConfig;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface IntegrationHealth {
  integrationId: string;
  status: IntegrationStatus;
  lastChecked: Date;
  latencyMs?: number;
  errorMessage?: string;
  errorCode?: string;
  uptime?: number; // percentage
  metrics: HealthMetrics;
}

export interface HealthMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  last24hErrors: number;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
  retryCount: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  statusCode: number;
  headers?: Record<string, string>;
  rateLimitRemaining?: number;
}

// ─── Retry & Circuit Breaker ────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryOn?: number[]; // HTTP status codes to retry on
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  backoffMs: 500,
  backoffMultiplier: 2,
  maxBackoffMs: 10000,
  retryOn: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.backoffMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === opts.maxRetries) break;

      // Check if we should retry based on status code
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode && opts.retryOn && !opts.retryOn.includes(statusCode)) {
        throw lastError;
      }

      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxBackoffMs);
    }
  }

  throw lastError;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeoutMs: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime.getTime() > this.timeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState() {
    return this.state;
  }
}

// ─── Base Integration Class ───────────────────────────────────────────────────

export abstract class BaseIntegration {
  protected config: IntegrationConfig;
  protected circuitBreaker: CircuitBreaker;
  protected requestCount = 0;
  protected errorCount = 0;
  protected totalLatency = 0;
  protected startTime = new Date();

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker();
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<IntegrationHealth>;

  protected async makeRequest<T>(
    fn: () => Promise<T>,
    retryOptions?: Partial<RetryOptions>,
  ): Promise<T> {
    const start = Date.now();
    this.requestCount++;

    try {
      const result = await this.circuitBreaker.execute(() => withRetry(fn, retryOptions));
      this.totalLatency += Date.now() - start;
      return result;
    } catch (err) {
      this.errorCount++;
      throw err;
    }
  }

  getMetrics(): HealthMetrics {
    return {
      totalRequests: this.requestCount,
      successfulRequests: this.requestCount - this.errorCount,
      failedRequests: this.errorCount,
      averageLatencyMs: this.requestCount > 0 ? this.totalLatency / this.requestCount : 0,
      last24hErrors: this.errorCount, // simplified; real impl would track time windows
    };
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function maskCredential(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
