import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Circuit Breaker Service
 *
 * Implements the Circuit Breaker pattern for external service integrations.
 * Prevents cascading failures and provides fallback mechanisms.
 *
 * Business Rules:
 * 1. Services are monitored for failure rates
 * 2. Circuit opens when failure threshold is exceeded
 * 3. Services in half-open state test recovery
 * 4. Fallback responses provided during outages
 * 5. Automatic recovery attempts after timeout
 *
 * Circuit States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: All requests fail fast with fallback
 * - HALF_OPEN: Limited requests test service recovery
 *
 * Configuration:
 * - failureThreshold: Number of failures before opening circuit
 * - recoveryTimeout: Time before attempting recovery
 * - monitoringPeriod: Time window for failure rate calculation
 * - halfOpenMaxCalls: Max requests in half-open state
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  fallbackEnabled: boolean;
  metricsEnabled: boolean;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number;
  nextAttempt: number;
  halfOpenCalls: number;
}

export interface CircuitBreakerMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  failureRate: number;
  state: string;
  lastStateChange: number;
}

export interface CircuitBreakerOptions {
  name: string;
  timeout?: number;
  fallback?: () => any;
  onStateChange?: (state: CircuitBreakerState) => void;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerState>();
  private readonly metrics = new Map<string, CircuitBreakerMetrics>();
  private readonly config: CircuitBreakerConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      failureThreshold: this.configService.get('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
      recoveryTimeout: this.configService.get('CIRCUIT_BREAKER_RECOVERY_TIMEOUT', 60000),
      monitoringPeriod: this.configService.get('CIRCUIT_BREAKER_MONITORING_PERIOD', 60000),
      halfOpenMaxCalls: this.configService.get('CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS', 3),
      fallbackEnabled: this.configService.get('CIRCUIT_BREAKER_FALLBACK_ENABLED', true),
      metricsEnabled: this.configService.get('CIRCUIT_BREAKER_METRICS_ENABLED', true),
    };
  }

  /**
   * Execute function with circuit breaker protection
   *
   * Algorithm:
   * 1. Check circuit state
   * 2. Execute if circuit is closed or half-open
   * 3. Track success/failure metrics
   * 4. Update circuit state based on results
   * 5. Return fallback if circuit is open
   *
   * @param serviceName - Name of the service being called
   * @param fn - Function to execute
   * @param options - Circuit breaker options
   * @returns Result of function execution or fallback
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options: CircuitBreakerOptions = { name: serviceName },
  ): Promise<T> {
    const circuit = this.getCircuit(serviceName);
    const metrics = this.getOrCreateMetrics(serviceName);

    // Record call attempt
    metrics.totalCalls++;
    const startTime = Date.now();

    try {
      // Check if circuit allows execution
      if (!this.canExecute(serviceName)) {
        throw new Error(`Circuit breaker is OPEN for service: ${serviceName}`);
      }

      // Execute the function
      const result = await fn();

      // Record success
      this.recordSuccess(serviceName);

      // Update response time metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(serviceName, responseTime);

      this.logger.debug(`Circuit breaker call succeeded for ${serviceName}`);
      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(serviceName);

      // Update response time metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(serviceName, responseTime);

      this.logger.warn(`Circuit breaker call failed for ${serviceName}: ${error.message}`);

      // Return fallback if available and enabled
      if (this.config.fallbackEnabled && options.fallback) {
        try {
          const fallbackResult = await options.fallback();
          this.logger.log(`Fallback executed for ${serviceName}`);
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error(`Fallback failed for ${serviceName}: ${fallbackError.message}`);
          throw error; // Throw original error if fallback fails
        }
      }

      throw error;
    }
  }

  /**
   * Check if execution is allowed for a service
   *
   * Logic:
   * - CLOSED: Always allow execution
   * - OPEN: Allow only if recovery timeout has passed
   * - HALF_OPEN: Allow if under max calls limit
   *
   * @param serviceName - Service name to check
   * @returns True if execution is allowed
   */
  private canExecute(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);
    const now = Date.now();

    switch (circuit.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if recovery timeout has passed
        if (now >= circuit.nextAttempt) {
          this.transitionToHalfOpen(serviceName);
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return circuit.halfOpenCalls < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record successful execution
   *
   * Actions:
   * - Reset failure count
   * - Close circuit if in half-open state
   * - Update success metrics
   *
   * @param serviceName - Service name
   */
  private recordSuccess(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const metrics = this.getOrCreateMetrics(serviceName);

    metrics.successfulCalls++;

    if (circuit.state === 'HALF_OPEN') {
      // Successful call in half-open state, close the circuit
      this.transitionToClosed(serviceName);
    } else {
      // Reset failure count on success
      circuit.failures = 0;
    }
  }

  /**
   * Record failed execution
   *
   * Actions:
   * - Increment failure count
   * - Open circuit if threshold exceeded
   * - Update failure metrics
   *
   * @param serviceName - Service name
   */
  private recordFailure(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const metrics = this.getOrCreateMetrics(serviceName);

    metrics.failedCalls++;
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (circuit.state === 'CLOSED' && circuit.failures >= this.config.failureThreshold) {
      this.transitionToOpen(serviceName);
    } else if (circuit.state === 'HALF_OPEN') {
      // Failure in half-open state, open circuit immediately
      this.transitionToOpen(serviceName);
    }
  }

  /**
   * Transition circuit to CLOSED state
   *
   * Actions:
   * - Reset failure count
   * - Reset half-open calls
   * - Update state timestamp
   * - Log state change
   *
   * @param serviceName - Service name
   */
  private transitionToClosed(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const metrics = this.getOrCreateMetrics(serviceName);

    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.halfOpenCalls = 0;
    metrics.lastStateChange = Date.now();

    this.logger.log(`Circuit breaker CLOSED for ${serviceName}`);
  }

  /**
   * Transition circuit to OPEN state
   *
   * Actions:
   * - Set next attempt time
   * - Reset half-open calls
   * - Update state timestamp
   * - Log state change
   *
   * @param serviceName - Service name
   */
  private transitionToOpen(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const metrics = this.getOrCreateMetrics(serviceName);

    circuit.state = 'OPEN';
    circuit.nextAttempt = Date.now() + this.config.recoveryTimeout;
    circuit.halfOpenCalls = 0;
    metrics.lastStateChange = Date.now();

    this.logger.warn(
      `Circuit breaker OPEN for ${serviceName}, next attempt in ${this.config.recoveryTimeout}ms`,
    );
  }

  /**
   * Transition circuit to HALF_OPEN state
   *
   * Actions:
   * - Reset failure count
   * - Reset half-open calls
   * - Update state timestamp
   * - Log state change
   *
   * @param serviceName - Service name
   */
  private transitionToHalfOpen(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const metrics = this.getOrCreateMetrics(serviceName);

    circuit.state = 'HALF_OPEN';
    circuit.failures = 0;
    circuit.halfOpenCalls = 0;
    metrics.lastStateChange = Date.now();

    this.logger.log(`Circuit breaker HALF_OPEN for ${serviceName}`);
  }

  /**
   * Get or create circuit state for service
   *
   * @param serviceName - Service name
   * @returns Circuit state
   */
  private getCircuit(serviceName: string): CircuitBreakerState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: 'CLOSED',
        failures: 0,
        lastFailureTime: 0,
        nextAttempt: 0,
        halfOpenCalls: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  /**
   * Get or create metrics for service
   *
   * @param serviceName - Service name
   * @returns Circuit metrics
   */
  private getOrCreateMetrics(serviceName: string): CircuitBreakerMetrics {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        failureRate: 0,
        state: 'CLOSED',
        lastStateChange: Date.now(),
      });
    }
    return this.metrics.get(serviceName)!;
  }

  /**
   * Update response time metrics
   *
   * @param serviceName - Service name
   * @param responseTime - Response time in milliseconds
   */
  private updateResponseTime(serviceName: string, responseTime: number): void {
    if (!this.config.metricsEnabled) return;

    const metrics = this.getOrCreateMetrics(serviceName);

    // Calculate rolling average
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.totalCalls - 1) + responseTime) / metrics.totalCalls;

    // Update failure rate
    metrics.failureRate =
      metrics.totalCalls > 0 ? (metrics.failedCalls / metrics.totalCalls) * 100 : 0;
  }

  /**
   * Get circuit state for a service
   *
   * @param serviceName - Service name
   * @returns Current circuit state
   */
  getCircuitState(serviceName: string): CircuitBreakerState {
    return this.getCircuit(serviceName);
  }

  /**
   * Get metrics for a service
   *
   * @param serviceName - Service name
   * @returns Circuit metrics
   */
  getMetrics(serviceName: string): CircuitBreakerMetrics {
    const metrics = this.getOrCreateMetrics(serviceName);
    const circuit = this.getCircuit(serviceName);

    return {
      ...metrics,
      state: circuit.state,
    };
  }

  /**
   * Get all circuit states
   *
   * @returns Map of all circuit states
   */
  getAllCircuitStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuits);
  }

  /**
   * Get all metrics
   *
   * @returns Map of all metrics
   */
  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    const allMetrics = new Map<string, CircuitBreakerMetrics>();

    for (const [serviceName] of this.circuits.keys()) {
      allMetrics.set(serviceName, this.getMetrics(serviceName));
    }

    return allMetrics;
  }

  /**
   * Reset circuit for a service
   *
   * @param serviceName - Service name
   */
  resetCircuit(serviceName: string): void {
    this.transitionToClosed(serviceName);
    this.logger.log(`Circuit breaker reset for ${serviceName}`);
  }

  /**
   * Reset all circuits
   */
  resetAllCircuits(): void {
    for (const serviceName of this.circuits.keys()) {
      this.resetCircuit(serviceName);
    }
  }

  /**
   * Get health status of all circuits
   *
   * @returns Health status object
   */
  getHealthStatus(): {
    healthy: boolean;
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
    services: Array<{
      name: string;
      state: string;
      failureRate: number;
      lastStateChange: number;
    }>;
  } {
    const services = [];
    let openCircuits = 0;
    let halfOpenCircuits = 0;
    let closedCircuits = 0;

    for (const [serviceName] of this.circuits.keys()) {
      const circuit = this.getCircuit(serviceName);
      const metrics = this.getOrCreateMetrics(serviceName);

      services.push({
        name: serviceName,
        state: circuit.state,
        failureRate: metrics.failureRate,
        lastStateChange: metrics.lastStateChange,
      });

      switch (circuit.state) {
        case 'OPEN':
          openCircuits++;
          break;
        case 'HALF_OPEN':
          halfOpenCircuits++;
          break;
        case 'CLOSED':
          closedCircuits++;
          break;
      }
    }

    const healthy = openCircuits === 0;

    return {
      healthy,
      totalCircuits: this.circuits.size,
      openCircuits,
      halfOpenCircuits,
      closedCircuits,
      services,
    };
  }
}
