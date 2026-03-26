import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential',
  FIXED_DELAY = 'fixed',
  LINEAR_BACKOFF = 'linear',
  ADAPTIVE = 'adaptive',
  CUSTOM = 'custom',
}

export interface RetryConfig {
  strategy: RetryStrategy;
  maxAttempts: number;
  baseDelay: number;
  maxDelay?: number;
  multiplier?: number;
  jitter?: boolean;
  customDelay?: (attempt: number, error: Error) => number;
}

export interface RetryRule {
  name: string;
  condition: (error: Error, attempt: number) => boolean;
  config: RetryConfig;
  description: string;
}

@Injectable()
export class JobRetryStrategiesService {
  private readonly logger = new Logger(JobRetryStrategiesService.name);
  private readonly retryRules: Map<string, RetryRule[]> = new Map();
  private readonly defaultConfigs: Map<string, RetryConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDefaultConfigs();
    this.initializeRetryRules();
  }

  private initializeDefaultConfigs() {
    // Default configurations for different queue types
    this.defaultConfigs.set('analytics', {
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
    });

    this.defaultConfigs.set('file-processing', {
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 60000,
      multiplier: 2,
      jitter: true,
    });

    this.defaultConfigs.set('email', {
      strategy: RetryStrategy.LINEAR_BACKOFF,
      maxAttempts: 7,
      baseDelay: 5000,
      maxDelay: 300000,
      multiplier: 1.5,
      jitter: true,
    });
  }

  private initializeRetryRules() {
    // Analytics queue retry rules
    this.retryRules.set('analytics', [
      {
        name: 'network-timeout',
        condition: (error, attempt) => 
          error.message.includes('timeout') || 
          error.message.includes('ETIMEDOUT'),
        config: {
          strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
          maxAttempts: 7,
          baseDelay: 2000,
          maxDelay: 60000,
          multiplier: 2,
          jitter: true,
        },
        description: 'Network timeout errors with extended retry',
      },
      {
        name: 'rate-limit',
        condition: (error, attempt) => 
          error.message.includes('rate limit') || 
          error.message.includes('429'),
        config: {
          strategy: RetryStrategy.LINEAR_BACKOFF,
          maxAttempts: 10,
          baseDelay: 10000,
          maxDelay: 300000,
          multiplier: 1.2,
          jitter: true,
        },
        description: 'Rate limit errors with linear backoff',
      },
      {
        name: 'validation-error',
        condition: (error, attempt) => 
          error.message.includes('validation') || 
          error.message.includes('invalid'),
        config: {
          strategy: RetryStrategy.FIXED_DELAY,
          maxAttempts: 1, // Don't retry validation errors
          baseDelay: 0,
        },
        description: 'Validation errors - no retry',
      },
    ]);

    // File processing queue retry rules
    this.retryRules.set('file-processing', [
      {
        name: 'file-corruption',
        condition: (error, attempt) => 
          error.message.includes('corrupt') || 
          error.message.includes('invalid format'),
        config: {
          strategy: RetryStrategy.FIXED_DELAY,
          maxAttempts: 2,
          baseDelay: 5000,
        },
        description: 'File corruption errors with limited retry',
      },
      {
        name: 'storage-temporary',
        condition: (error, attempt) => 
          error.message.includes('storage') && 
          (error.message.includes('temporary') || error.message.includes('unavailable')),
        config: {
          strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
          maxAttempts: 6,
          baseDelay: 5000,
          maxDelay: 120000,
          multiplier: 2,
          jitter: true,
        },
        description: 'Temporary storage issues with exponential backoff',
      },
    ]);
  }

  /**
   * Get retry configuration for a specific error and attempt
   */
  getRetryConfig(queueName: string, error: Error, attempt: number): RetryConfig {
    const rules = this.retryRules.get(queueName);
    if (!rules) {
      return this.defaultConfigs.get(queueName) || this.getDefaultConfig();
    }

    // Find matching rule
    for (const rule of rules) {
      try {
        if (rule.condition(error, attempt)) {
          this.logger.debug(
            `Applied retry rule "${rule.name}" for ${queueName} on attempt ${attempt}`,
          );
          return rule.config;
        }
      } catch (conditionError) {
        this.logger.error(`Error evaluating retry rule "${rule.name}":`, conditionError);
      }
    }

    // Fall back to default config
    return this.defaultConfigs.get(queueName) || this.getDefaultConfig();
  }

  /**
   * Calculate delay for next retry attempt
   */
  calculateRetryDelay(config: RetryConfig, attempt: number, error?: Error): number {
    let delay: number;

    switch (config.strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = config.baseDelay * Math.pow(config.multiplier || 2, attempt - 1);
        break;

      case RetryStrategy.LINEAR_BACKOFF:
        delay = config.baseDelay + (attempt - 1) * (config.baseDelay * ((config.multiplier || 1) - 1));
        break;

      case RetryStrategy.FIXED_DELAY:
        delay = config.baseDelay;
        break;

      case RetryStrategy.ADAPTIVE:
        delay = this.calculateAdaptiveDelay(config, attempt, error);
        break;

      case RetryStrategy.CUSTOM:
        if (config.customDelay) {
          delay = config.customDelay(attempt, error || new Error('Unknown error'));
        } else {
          delay = config.baseDelay;
        }
        break;

      default:
        delay = config.baseDelay;
    }

    // Apply maximum delay limit
    if (config.maxDelay && delay > config.maxDelay) {
      delay = config.maxDelay;
    }

    // Apply jitter if enabled
    if (config.jitter) {
      delay = this.applyJitter(delay);
    }

    return Math.max(0, delay);
  }

  /**
   * Calculate adaptive delay based on error type and system load
   */
  private calculateAdaptiveDelay(config: RetryConfig, attempt: number, error?: Error): number {
    let baseDelay = config.baseDelay;

    // Adjust delay based on error type
    if (error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('timeout')) {
        baseDelay *= 2; // Longer delay for timeouts
      } else if (errorMessage.includes('rate limit')) {
        baseDelay *= 3; // Much longer delay for rate limits
      } else if (errorMessage.includes('connection')) {
        baseDelay *= 1.5; // Moderate delay for connection issues
      }
    }

    // Exponential component
    const exponentialComponent = baseDelay * Math.pow(config.multiplier || 1.5, attempt - 1);
    
    // Linear component for very high attempt counts
    const linearComponent = attempt > 5 ? (attempt - 5) * 10000 : 0;

    return exponentialComponent + linearComponent;
  }

  /**
   * Apply jitter to delay to prevent thundering herd
   */
  private applyJitter(delay: number): number {
    // Add random jitter of ±25%
    const jitterAmount = delay * 0.25;
    const randomJitter = (Math.random() * 2 - 1) * jitterAmount;
    return delay + randomJitter;
  }

  /**
   * Check if job should be retried
   */
  shouldRetry(queueName: string, error: Error, attempt: number, maxAttempts?: number): boolean {
    const config = this.getRetryConfig(queueName, error, attempt);
    const effectiveMaxAttempts = maxAttempts || config.maxAttempts;

    if (attempt >= effectiveMaxAttempts) {
      return false;
    }

    // Check if error is recoverable
    return this.isRecoverableError(error);
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    // Recoverable error patterns
    const recoverablePatterns = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'rate limit',
      'service unavailable',
      'econnrefused',
      'enotfound',
      'econnreset',
      'etimedout',
    ];

    // Non-recoverable error patterns
    const nonRecoverablePatterns = [
      'validation',
      'invalid',
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
      'authentication failed',
      'permission denied',
      'access denied',
    ];

    const isRecoverable = recoverablePatterns.some(pattern => errorMessage.includes(pattern));
    const isNonRecoverable = nonRecoverablePatterns.some(pattern => errorMessage.includes(pattern));

    return isRecoverable && !isNonRecoverable;
  }

  /**
   * Get default retry configuration
   */
  private getDefaultConfig(): RetryConfig {
    return {
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
    };
  }

  /**
   * Add custom retry rule for a queue
   */
  addRetryRule(queueName: string, rule: RetryRule): void {
    const existingRules = this.retryRules.get(queueName) || [];
    existingRules.push(rule);
    this.retryRules.set(queueName, existingRules);
    this.logger.log(`Added retry rule "${rule.name}" to ${queueName} queue`);
  }

  /**
   * Remove retry rule from a queue
   */
  removeRetryRule(queueName: string, ruleName: string): boolean {
    const rules = this.retryRules.get(queueName);
    if (!rules) return false;

    const index = rules.findIndex(rule => rule.name === ruleName);
    if (index === -1) return false;

    rules.splice(index, 1);
    this.retryRules.set(queueName, rules);
    this.logger.log(`Removed retry rule "${ruleName}" from ${queueName} queue`);
    return true;
  }

  /**
   * Get all retry rules for a queue
   */
  getRetryRules(queueName: string): RetryRule[] {
    return this.retryRules.get(queueName) || [];
  }

  /**
   * Update default configuration for a queue
   */
  updateDefaultConfig(queueName: string, config: Partial<RetryConfig>): void {
    const existingConfig = this.defaultConfigs.get(queueName) || this.getDefaultConfig();
    this.defaultConfigs.set(queueName, { ...existingConfig, ...config });
    this.logger.log(`Updated default retry configuration for ${queueName}`);
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStats(queueName?: string): Array<{
    queueName: string;
    totalRules: number;
    defaultStrategy: RetryStrategy;
    defaultMaxAttempts: number;
  }> {
    const stats = [];
    const queues = queueName ? [queueName] : Array.from(this.defaultConfigs.keys());

    for (const qName of queues) {
      const config = this.defaultConfigs.get(qName);
      const rules = this.retryRules.get(qName) || [];

      if (config) {
        stats.push({
          queueName: qName,
          totalRules: rules.length,
          defaultStrategy: config.strategy,
          defaultMaxAttempts: config.maxAttempts,
        });
      }
    }

    return stats;
  }

  /**
   * Create custom retry strategy
   */
  static createCustomStrategy(
    delayCalculator: (attempt: number, error: Error) => number,
    maxAttempts: number,
  ): RetryConfig {
    return {
      strategy: RetryStrategy.CUSTOM,
      maxAttempts,
      baseDelay: 0,
      customDelay: delayCalculator,
    };
  }

  /**
   * Circuit breaker pattern for repeated failures
   */
  createCircuitBreakerRule(
    queueName: string,
    failureThreshold: number = 5,
    resetTimeout: number = 60000,
  ): RetryRule {
    let failureCount = 0;
    let lastFailureTime = 0;

    return {
      name: 'circuit-breaker',
      condition: (error, attempt) => {
        const now = Date.now();
        
        // Reset circuit breaker if timeout has passed
        if (now - lastFailureTime > resetTimeout) {
          failureCount = 0;
        }

        failureCount++;
        lastFailureTime = now;

        // Open circuit if threshold exceeded
        if (failureCount >= failureThreshold) {
          this.logger.warn(`Circuit breaker opened for ${queueName} after ${failureCount} failures`);
          return false; // Don't retry
        }

        return true;
      },
      config: {
        strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        maxAttempts: 3,
        baseDelay: 10000,
        maxDelay: 60000,
        multiplier: 2,
        jitter: true,
      },
      description: `Circuit breaker: opens after ${failureThreshold} failures, resets after ${resetTimeout}ms`,
    };
  }
}
