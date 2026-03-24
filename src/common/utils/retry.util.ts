import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

export class RetryUtil {
  private static logger = new Logger('RetryUtil');

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2,
      maxDelay = 10000,
      shouldRetry = (error: any, attempt: number) => {
        // Retry on network errors, timeouts, and 5xx server errors
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          return true;
        }
        if (error.response?.status >= 500 && error.response?.status < 600) {
          return true;
        }
        return attempt < 2; // Always retry at least once for first attempt
      },
    } = options;

    let lastError: any;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${maxAttempts}`, 'RetryUtil');
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.log(`Operation succeeded on attempt ${attempt}`, 'RetryUtil');
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`, 'RetryUtil');
        
        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          this.logger.error(`All ${attempt} attempts failed. Giving up.`, 'RetryUtil');
          throw error;
        }
        
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.1 * currentDelay;
        const waitTime = Math.min(currentDelay + jitter, maxDelay);
        
        this.logger.debug(`Waiting ${waitTime.toFixed(0)}ms before retry`, 'RetryUtil');
        await this.sleep(waitTime);
        
        currentDelay *= backoffMultiplier;
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly logger = new Logger('CircuitBreaker');

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      monitoringPeriod: options.monitoringPeriod || 10000, // 10 seconds
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Check if we should attempt to reset the circuit
    if (this.state === 'OPEN' && now >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
      this.logger.log('Circuit breaker entering HALF_OPEN state', 'CircuitBreaker');
    }

    // Reject calls if circuit is open
    if (this.state === 'OPEN') {
      const error = new Error('Circuit breaker is OPEN');
      (error as any).code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (this.state === 'HALF_OPEN') {
        this.reset();
        this.logger.log('Circuit breaker reset to CLOSED state', 'CircuitBreaker');
      }
      
      return result;
    } catch (error) {
      this.handleFailure(now);
      throw error;
    }
  }

  private handleFailure(now: number): void {
    this.failures++;
    this.lastFailureTime = now;

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = now + this.options.resetTimeout;
      this.logger.error(`Circuit breaker OPENED. ${this.failures} failures detected.`, 'CircuitBreaker');
    }
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }

  getState(): string {
    return this.state;
  }

  getStats(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export class ErrorMonitor {
  private static logger = new Logger('ErrorMonitor');
  private static errorCounts: Map<string, number> = new Map();
  private static errorCounts24h: Map<string, number> = new Map();
  private static lastCleanup = Date.now();

  static recordError(error: any, context?: string): void {
    const errorKey = `${error.code || error.name || 'UNKNOWN'}_${context || 'NO_CONTEXT'}`;
    const timestamp = Date.now();
    
    // Increment total error count
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    
    // Increment 24-hour error count
    this.errorCounts24h.set(errorKey, (this.errorCounts24h.get(errorKey) || 0) + 1);
    
    // Log error details
    this.logger.error(
      `Error recorded: ${errorKey} - ${error.message}`,
      {
        error: error.stack,
        context,
        count: this.errorCounts.get(errorKey),
        count24h: this.errorCounts24h.get(errorKey),
      }
    );
    
    // Check for alerting thresholds
    this.checkAlertThresholds(errorKey);
    
    // Cleanup old entries periodically
    if (timestamp - this.lastCleanup > 3600000) { // 1 hour
      this.cleanup();
      this.lastCleanup = timestamp;
    }
  }

  private static checkAlertThresholds(errorKey: string): void {
    const count24h = this.errorCounts24h.get(errorKey) || 0;
    
    // Alert if error occurs more than 10 times in 24 hours
    if (count24h >= 10) {
      this.logger.warn(
        `🚨 High error rate alert: ${errorKey} occurred ${count24h} times in 24h`,
        'ErrorMonitor'
      );
      
      // In production, this would send alerts to monitoring systems
      // await this.alertingService.sendAlert({
      //   type: 'HIGH_ERROR_RATE',
      //   errorKey,
      //   count: count24h,
      //   threshold: 10,
      // });
    }
  }

  private static cleanup(): void {
    // This would normally clean up entries older than 24 hours
    // For simplicity, we'll just log the cleanup
    const totalErrors = Array.from(this.errorCounts24h.values()).reduce((a, b) => a + b, 0);
    this.logger.log(`Error monitor cleanup: ${totalErrors} errors in last 24h`, 'ErrorMonitor');
  }

  static getErrorStats(): { [key: string]: { total: number; last24h: number } } {
    const stats: { [key: string]: { total: number; last24h: number } } = {};
    
    for (const [key, total] of this.errorCounts) {
      stats[key] = {
        total,
        last24h: this.errorCounts24h.get(key) || 0,
      };
    }
    
    return stats;
  }
}
