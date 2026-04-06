import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  ErrorReport, 
  RecoveryAction, 
  ErrorRecoveryLog,
  ErrorStatus 
} from '../models/ErrorReport';
import { ErrorClassifier } from './ErrorClassifier';

export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  fallbackEnabled?: boolean;
  escalationEnabled?: boolean;
}

export interface RecoveryResult {
  action: RecoveryAction;
  successful: boolean;
  message: string;
  executionTime: number;
  details?: Record<string, any>;
  nextAction?: RecoveryAction;
}

export interface RecoveryStrategy {
  action: RecoveryAction;
  condition: (error: ErrorReport) => boolean;
  execute: (error: ErrorReport, options: RecoveryOptions) => Promise<RecoveryResult>;
  priority: number;
}

@Injectable()
export class RecoveryManager {
  private readonly logger = new Logger(RecoveryManager.name);
  private strategies: Map<RecoveryAction, RecoveryStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(
    @InjectRepository(ErrorReport)
    private errorRepository: Repository<ErrorReport>,
    @InjectRepository(ErrorRecoveryLog)
    private recoveryLogRepository: Repository<ErrorRecoveryLog>,
    private errorClassifier: ErrorClassifier,
  ) {
    this.initializeStrategies();
  }

  async attemptRecovery(
    errorId: string,
    options: RecoveryOptions = {},
    userId?: string,
  ): Promise<RecoveryResult[]> {
    const error = await this.errorRepository.findOne({
      where: { id: errorId },
      relations: ['recoveryActions'],
    });

    if (!error) {
      throw new Error(`Error report not found: ${errorId}`);
    }

    const results: RecoveryResult[] = [];
    const recoveryActions = error.recoveryActions || [];

    // Sort actions by priority
    const sortedActions = this.sortActionsByPriority(recoveryActions);

    for (const action of sortedActions) {
      const result = await this.executeRecoveryAction(action, error, options, userId);
      results.push(result);

      // Log the recovery attempt
      await this.logRecoveryAttempt(error, action, result, userId);

      // If action was successful and resolves the error, stop
      if (result.successful && this.resolvesError(action, error)) {
        await this.markErrorAsResolved(error, userId);
        break;
      }

      // If action failed and suggests next action, continue with it
      if (result.nextAction && !recoveryActions.includes(result.nextAction)) {
        recoveryActions.push(result.nextAction);
      }
    }

    return results;
  }

  async attemptAutomaticRecovery(error: ErrorReport): Promise<RecoveryResult> {
    const classification = await this.errorClassifier.classifyError(
      error.message,
      error.stackTrace,
      {
        service: error.service,
        endpoint: error.endpoint,
        method: error.method,
        userId: error.userId,
      },
    );

    const suggestedActions = classification.suggestedActions || [];
    const options: RecoveryOptions = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      fallbackEnabled: true,
      escalationEnabled: true,
    };

    // Try the first suggested action
    if (suggestedActions.length > 0) {
      const action = suggestedActions[0] as RecoveryAction;
      return this.executeRecoveryAction(action, error, options);
    }

    return {
      action: RecoveryAction.IGNORE,
      successful: true,
      message: 'No automatic recovery action available',
      executionTime: 0,
    };
  }

  private async executeRecoveryAction(
    action: RecoveryAction,
    error: ErrorReport,
    options: RecoveryOptions,
    userId?: string,
  ): Promise<RecoveryResult> {
    const strategy = this.strategies.get(action);
    
    if (!strategy) {
      return {
        action,
        successful: false,
        message: `No recovery strategy found for action: ${action}`,
        executionTime: 0,
      };
    }

    // Check if action condition is met
    if (!strategy.condition(error)) {
      return {
        action,
        successful: false,
        message: `Recovery action conditions not met: ${action}`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();
    
    try {
      const result = await strategy.execute(error, options);
      result.executionTime = Date.now() - startTime;
      
      this.logger.log(`Recovery action ${action} ${result.successful ? 'succeeded' : 'failed'} for error ${error.id}`);
      
      return result;
    } catch (executionError) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Recovery action ${action} failed for error ${error.id}`, executionError);
      
      return {
        action,
        successful: false,
        message: `Execution failed: ${executionError.message}`,
        executionTime,
        details: { error: executionError.message },
      };
    }
  }

  private initializeStrategies(): void {
    // Retry strategy
    this.strategies.set(RecoveryAction.RETRY, {
      action: RecoveryAction.RETRY,
      condition: (error) => this.isRetryableError(error),
      execute: async (error, options) => this.executeRetry(error, options),
      priority: 1,
    });

    // Circuit breaker strategy
    this.strategies.set(RecoveryAction.CIRCUIT_BREAKER, {
      action: RecoveryAction.CIRCUIT_BREAKER,
      condition: (error) => this.shouldUseCircuitBreaker(error),
      execute: async (error, options) => this.executeCircuitBreaker(error, options),
      priority: 2,
    });

    // Fallback strategy
    this.strategies.set(RecoveryAction.FALLBACK, {
      action: RecoveryAction.FALLBACK,
      condition: (error) => this.hasFallbackAvailable(error),
      execute: async (error, options) => this.executeFallback(error, options),
      priority: 3,
    });

    // Cache invalidation strategy
    this.strategies.set(RecoveryAction.CACHE_INVALIDATION, {
      action: RecoveryAction.CACHE_INVALIDATION,
      condition: (error) => this.isCacheRelatedError(error),
      execute: async (error, options) => this.executeCacheInvalidation(error, options),
      priority: 4,
    });

    // Service restart strategy
    this.strategies.set(RecoveryAction.SERVICE_RESTART, {
      action: RecoveryAction.SERVICE_RESTART,
      condition: (error) => this.requiresServiceRestart(error),
      execute: async (error, options) => this.executeServiceRestart(error, options),
      priority: 5,
    });

    // Escalate strategy
    this.strategies.set(RecoveryAction.ESCALATE, {
      action: RecoveryAction.ESCALATE,
      condition: (error) => this.shouldEscalate(error),
      execute: async (error, options) => this.executeEscalation(error, options),
      priority: 6,
    });

    // Manual intervention strategy
    this.strategies.set(RecoveryAction.MANUAL_INTERVENTION, {
      action: RecoveryAction.MANUAL_INTERVENTION,
      condition: (error) => this.requiresManualIntervention(error),
      execute: async (error, options) => this.executeManualIntervention(error, options),
      priority: 7,
    });

    // Ignore strategy
    this.strategies.set(RecoveryAction.IGNORE, {
      action: RecoveryAction.IGNORE,
      condition: (error) => this.canIgnoreError(error),
      execute: async (error, options) => this.executeIgnore(error, options),
      priority: 8,
    });
  }

  private async executeRetry(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Simulate retry logic - in real implementation, this would retry the original operation
        await this.delay(retryDelay * attempt);
        
        // Check if the error condition still exists
        const errorStillExists = await this.checkErrorCondition(error);
        
        if (!errorStillExists) {
          return {
            action: RecoveryAction.RETRY,
            successful: true,
            message: `Error resolved after ${attempt} retries`,
            executionTime: 0,
            details: { attempts: attempt },
          };
        }
      } catch (retryError) {
        if (attempt === maxRetries) {
          return {
            action: RecoveryAction.RETRY,
            successful: false,
            message: `Retry failed after ${maxRetries} attempts`,
            executionTime: 0,
            details: { attempts: attempt, error: retryError.message },
            nextAction: RecoveryAction.CIRCUIT_BREAKER,
          };
        }
      }
    }

    return {
      action: RecoveryAction.RETRY,
      successful: false,
      message: 'Retry attempts exhausted',
      executionTime: 0,
      nextAction: RecoveryAction.CIRCUIT_BREAKER,
    };
  }

  private async executeCircuitBreaker(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    const key = this.getCircuitBreakerKey(error);
    const threshold = options.circuitBreakerThreshold || 5;
    
    let circuitBreaker = this.circuitBreakers.get(key);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        failures: 0,
        lastFailureTime: new Date(),
        state: 'CLOSED',
      };
      this.circuitBreakers.set(key, circuitBreaker);
    }

    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = new Date();

    if (circuitBreaker.failures >= threshold) {
      circuitBreaker.state = 'OPEN';
      
      return {
        action: RecoveryAction.CIRCUIT_BREAKER,
        successful: true,
        message: `Circuit breaker opened for ${key} after ${circuitBreaker.failures} failures`,
        executionTime: 0,
        details: { 
          key, 
          failures: circuitBreaker.failures,
          state: circuitBreaker.state,
        },
        nextAction: RecoveryAction.FALLBACK,
      };
    }

    return {
      action: RecoveryAction.CIRCUIT_BREAKER,
      successful: false,
      message: `Circuit breaker threshold not yet reached (${circuitBreaker.failures}/${threshold})`,
      executionTime: 0,
      details: { 
        key, 
        failures: circuitBreaker.failures,
        threshold,
      },
    };
  }

  private async executeFallback(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    if (!options.fallbackEnabled) {
      return {
        action: RecoveryAction.FALLBACK,
        successful: false,
        message: 'Fallback is not enabled',
        executionTime: 0,
      };
    }

    try {
      // Simulate fallback execution
      await this.delay(100);
      
      return {
        action: RecoveryAction.FALLBACK,
        successful: true,
        message: 'Fallback executed successfully',
        executionTime: 0,
        details: { 
          fallbackType: this.getFallbackType(error),
          service: error.service,
        },
      };
    } catch (fallbackError) {
      return {
        action: RecoveryAction.FALLBACK,
        successful: false,
        message: `Fallback execution failed: ${fallbackError.message}`,
        executionTime: 0,
        nextAction: RecoveryAction.ESCALATE,
      };
    }
  }

  private async executeCacheInvalidation(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    try {
      // Simulate cache invalidation
      const cacheKeys = this.getCacheKeysToInvalidate(error);
      
      for (const key of cacheKeys) {
        // In real implementation, this would invalidate actual cache entries
        await this.delay(10);
      }

      return {
        action: RecoveryAction.CACHE_INVALIDATION,
        successful: true,
        message: `Invalidated ${cacheKeys.length} cache entries`,
        executionTime: 0,
        details: { 
          invalidatedKeys: cacheKeys,
          service: error.service,
        },
      };
    } catch (cacheError) {
      return {
        action: RecoveryAction.CACHE_INVALIDATION,
        successful: false,
        message: `Cache invalidation failed: ${cacheError.message}`,
        executionTime: 0,
      };
    }
  }

  private async executeServiceRestart(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    try {
      // Simulate service restart - in real implementation, this would restart the actual service
      await this.delay(1000);
      
      return {
        action: RecoveryAction.SERVICE_RESTART,
        successful: true,
        message: `Service ${error.service} restarted successfully`,
        executionTime: 0,
        details: { 
          service: error.service,
          restartTime: new Date(),
        },
      };
    } catch (restartError) {
      return {
        action: RecoveryAction.SERVICE_RESTART,
        successful: false,
        message: `Service restart failed: ${restartError.message}`,
        executionTime: 0,
        nextAction: RecoveryAction.ESCALATE,
      };
    }
  }

  private async executeEscalation(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    if (!options.escalationEnabled) {
      return {
        action: RecoveryAction.ESCALATE,
        successful: false,
        message: 'Escalation is not enabled',
        executionTime: 0,
      };
    }

    try {
      // Simulate escalation process
      const escalationLevel = this.calculateEscalationLevel(error);
      const assignee = this.getEscalationAssignee(escalationLevel);
      
      // Update error with escalation information
      error.escalationLevel = escalationLevel;
      error.assignedTo = assignee;
      await this.errorRepository.save(error);

      return {
        action: RecoveryAction.ESCALATE,
        successful: true,
        message: `Error escalated to level ${escalationLevel} and assigned to ${assignee}`,
        executionTime: 0,
        details: { 
          escalationLevel,
          assignee,
          escalatedAt: new Date(),
        },
      };
    } catch (escalationError) {
      return {
        action: RecoveryAction.ESCALATE,
        successful: false,
        message: `Escalation failed: ${escalationError.message}`,
        executionTime: 0,
      };
    }
  }

  private async executeManualIntervention(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    // Mark error as requiring manual intervention
    error.status = ErrorStatus.INVESTIGATING;
    await this.errorRepository.save(error);

    return {
      action: RecoveryAction.MANUAL_INTERVENTION,
      successful: true,
      message: 'Error marked for manual intervention',
      executionTime: 0,
      details: { 
        assignedTo: error.assignedTo || 'unassigned',
        requiresManualAction: true,
      },
    };
  }

  private async executeIgnore(error: ErrorReport, options: RecoveryOptions): Promise<RecoveryResult> {
    // Mark error as ignored
    error.isSilenced = true;
    error.silencedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.errorRepository.save(error);

    return {
      action: RecoveryAction.IGNORE,
      successful: true,
      message: 'Error silenced for 24 hours',
      executionTime: 0,
      details: { 
        silencedUntil: error.silencedUntil,
        reason: 'Low priority or known issue',
      },
    };
  }

  // Helper methods for strategy conditions
  private isRetryableError(error: ErrorReport): boolean {
    const retryableCategories = ['network', 'external_service', 'database'];
    const retryableMessages = ['timeout', 'connection', 'temporary'];
    
    return retryableCategories.includes(error.category) ||
           retryableMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  private shouldUseCircuitBreaker(error: ErrorReport): boolean {
    return error.occurrenceCount > 3 || 
           error.category === 'external_service' ||
           error.category === 'database';
  }

  private hasFallbackAvailable(error: ErrorReport): boolean {
    // Check if fallback is available for the service
    const fallbackServices = ['payment', 'notification', 'analytics'];
    return fallbackServices.includes(error.service || '');
  }

  private isCacheRelatedError(error: ErrorReport): boolean {
    const cacheKeywords = ['cache', 'stale', 'expired', 'invalid'];
    return cacheKeywords.some(keyword => error.message.toLowerCase().includes(keyword));
  }

  private requiresServiceRestart(error: ErrorReport): boolean {
    return error.category === 'system' && 
           error.message.toLowerCase().includes('memory');
  }

  private shouldEscalate(error: ErrorReport): boolean {
    return error.severity === 'critical' || 
           error.escalationLevel > 0 ||
           error.occurrenceCount > 10;
  }

  private requiresManualIntervention(error: ErrorReport): boolean {
    return error.category === 'security' ||
           error.message.toLowerCase().includes('data corruption');
  }

  private canIgnoreError(error: ErrorReport): boolean {
    return error.severity === 'low' && 
           error.occurrenceCount < 5 &&
           !error.message.toLowerCase().includes('critical');
  }

  // Utility methods
  private sortActionsByPriority(actions: RecoveryAction[]): RecoveryAction[] {
    const actionPriorities = new Map<RecoveryAction, number>();
    
    for (const [action, strategy] of this.strategies) {
      actionPriorities.set(action, strategy.priority);
    }

    return actions.sort((a, b) => 
      (actionPriorities.get(a) || 999) - (actionPriorities.get(b) || 999)
    );
  }

  private resolvesError(action: RecoveryAction, error: ErrorReport): boolean {
    const resolvingActions = [
      RecoveryAction.FALLBACK,
      RecoveryAction.SERVICE_RESTART,
      RecoveryAction.IGNORE,
    ];
    
    return resolvingActions.includes(action);
  }

  private async markErrorAsResolved(error: ErrorReport, userId?: string): Promise<void> {
    error.status = ErrorStatus.RESOLVED;
    error.resolvedAt = new Date();
    if (userId) {
      error.resolvedBy = { id: userId } as any;
    }
    
    await this.errorRepository.save(error);
  }

  private async logRecoveryAttempt(
    error: ErrorReport,
    action: RecoveryAction,
    result: RecoveryResult,
    userId?: string,
  ): Promise<void> {
    const log = this.recoveryLogRepository.create({
      errorReport: error,
      action,
      successful: result.successful,
      parameters: { options: {} },
      result: {
        message: result.message,
        details: result.details,
        executionTime: result.executionTime,
      },
      performedBy: userId ? { id: userId } as any : null,
    });

    await this.recoveryLogRepository.save(log);
  }

  private async checkErrorCondition(error: ErrorReport): Promise<boolean> {
    // In real implementation, this would check if the error condition still exists
    // For now, simulate with a random check
    return Math.random() > 0.7;
  }

  private getCircuitBreakerKey(error: ErrorReport): string {
    return `${error.service}:${error.endpoint || 'unknown'}`;
  }

  private getFallbackType(error: ErrorReport): string {
    return `${error.service}_fallback`;
  }

  private getCacheKeysToInvalidate(error: ErrorReport): string[] {
    const keys = [];
    
    if (error.service) {
      keys.push(`service:${error.service}`);
    }
    
    if (error.userId) {
      keys.push(`user:${error.userId}`);
    }
    
    if (error.endpoint) {
      keys.push(`endpoint:${error.endpoint}`);
    }

    return keys;
  }

  private calculateEscalationLevel(error: ErrorReport): number {
    let level = 1;
    
    if (error.severity === 'critical') level += 2;
    if (error.occurrenceCount > 10) level += 1;
    if (error.category === 'security') level += 1;
    
    return Math.min(level, 5);
  }

  private getEscalationAssignee(level: number): string {
    const assignees = {
      1: 'support_team',
      2: 'senior_engineer',
      3: 'team_lead',
      4: 'engineering_manager',
      5: 'vp_engineering',
    };
    
    return assignees[level] || 'support_team';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker state management
  private getCircuitBreakerState(key: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(key);
  }

  private resetCircuitBreaker(key: string): void {
    this.circuitBreakers.delete(key);
  }

  async getCircuitBreakerStats(): Promise<Record<string, any>> {
    const stats = {
      totalCircuitBreakers: this.circuitBreakers.size,
      openCircuitBreakers: 0,
      closedCircuitBreakers: 0,
      circuitBreakers: [] as Array<{
        key: string;
        state: string;
        failures: number;
        lastFailureTime: Date;
      }>,
    };

    for (const [key, state] of this.circuitBreakers) {
      if (state.state === 'OPEN') {
        stats.openCircuitBreakers++;
      } else {
        stats.closedCircuitBreakers++;
      }

      stats.circuitBreakers.push({
        key,
        state: state.state,
        failures: state.failures,
        lastFailureTime: state.lastFailureTime,
      });
    }

    return stats;
  }
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date;
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
}
