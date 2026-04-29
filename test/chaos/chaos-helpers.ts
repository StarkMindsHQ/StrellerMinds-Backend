/**
 * Chaos Engineering Test Helpers
 *
 * Shared utilities used across all chaos test suites to inject faults,
 * schedule disruptions, and collect resilience metrics.
 */

import { DataSource, QueryRunner } from 'typeorm';

// ---------------------------------------------------------------------------
// Fault Injector — low-level primitives for breaking things on purpose
// ---------------------------------------------------------------------------

export class FaultInjector {
  private originalMethods: Map<string, Function> = new Map();

  /**
   * Replace DataSource.query with a version that throws after `delayMs`.
   * Simulates a database that accepts the connection but never returns.
   */
  injectQueryTimeout(dataSource: DataSource, delayMs: number): void {
    const original = dataSource.query.bind(dataSource);
    this.originalMethods.set('query', original);

    (dataSource as any).query = async (...args: any[]) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      throw new Error(
        `CHAOS: Query timed out after ${delayMs}ms (simulated)`,
      );
    };
  }

  /**
   * Replace DataSource.query so it throws immediately.
   * Simulates a database that refuses all queries (e.g. server crash).
   */
  injectQueryFailure(
    dataSource: DataSource,
    errorMessage = 'CHAOS: Connection refused (simulated)',
  ): void {
    const original = dataSource.query.bind(dataSource);
    this.originalMethods.set('query', original);

    (dataSource as any).query = async () => {
      throw new Error(errorMessage);
    };
  }

  /**
   * Fail only the first `n` queries, then let subsequent ones through.
   * Simulates a transient database blip that self-heals.
   */
  injectTransientFailure(dataSource: DataSource, failCount: number): void {
    const original = dataSource.query.bind(dataSource);
    this.originalMethods.set('query', original);
    let callIndex = 0;

    (dataSource as any).query = async (...args: any[]) => {
      callIndex++;
      if (callIndex <= failCount) {
        throw new Error(
          `CHAOS: Transient failure ${callIndex}/${failCount} (simulated)`,
        );
      }
      return original(...args);
    };
  }

  /**
   * Add artificial latency to every query.
   * Simulates a "slow" database (disk I/O saturation, lock contention, etc.).
   */
  injectLatency(dataSource: DataSource, latencyMs: number): void {
    const original = dataSource.query.bind(dataSource);
    this.originalMethods.set('query', original);

    (dataSource as any).query = async (...args: any[]) => {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
      return original(...args);
    };
  }

  /**
   * Replace createQueryRunner so that `connect()` always fails.
   * Simulates pool exhaustion or a listener that cannot hand out connections.
   */
  injectConnectionFailure(dataSource: DataSource): void {
    const original = dataSource.createQueryRunner.bind(dataSource);
    this.originalMethods.set('createQueryRunner', original);

    (dataSource as any).createQueryRunner = () => {
      const fakeRunner: Partial<QueryRunner> = {
        connect: async () => {
          throw new Error('CHAOS: Unable to acquire connection (simulated)');
        },
        release: async () => {},
        query: async () => {
          throw new Error('CHAOS: Runner not connected (simulated)');
        },
      };
      return fakeRunner as QueryRunner;
    };
  }

  /**
   * Randomly fail queries with configurable probability.
   * Simulates intermittent network packet loss.
   */
  injectRandomFailures(
    dataSource: DataSource,
    failureProbability: number,
  ): void {
    const original = dataSource.query.bind(dataSource);
    this.originalMethods.set('query', original);

    (dataSource as any).query = async (...args: any[]) => {
      if (Math.random() < failureProbability) {
        throw new Error('CHAOS: Random failure (simulated packet loss)');
      }
      return original(...args);
    };
  }

  /**
   * Restore every patched method back to its original implementation.
   */
  restore(dataSource: DataSource): void {
    for (const [method, original] of this.originalMethods.entries()) {
      (dataSource as any)[method] = original;
    }
    this.originalMethods.clear();
  }
}

// ---------------------------------------------------------------------------
// Chaos Scheduler — time-based fault orchestration
// ---------------------------------------------------------------------------

export interface ScheduledFault {
  name: string;
  delayMs: number;
  durationMs: number;
  inject: () => void;
  restore: () => void;
}

export class ChaosScheduler {
  private timers: NodeJS.Timeout[] = [];

  /**
   * Schedule a fault to fire at `fault.delayMs` and auto-restore after
   * `fault.durationMs`.
   */
  schedule(fault: ScheduledFault): void {
    const injectTimer = setTimeout(() => {
      fault.inject();

      const restoreTimer = setTimeout(() => {
        fault.restore();
      }, fault.durationMs);

      this.timers.push(restoreTimer);
    }, fault.delayMs);

    this.timers.push(injectTimer);
  }

  /** Cancel all pending faults and clear timers. */
  cancelAll(): void {
    for (const t of this.timers) {
      clearTimeout(t);
    }
    this.timers = [];
  }
}

// ---------------------------------------------------------------------------
// Resilience Metrics — lightweight counters for chaos experiments
// ---------------------------------------------------------------------------

export class ResilienceMetrics {
  private successes = 0;
  private failures = 0;
  private latencies: number[] = [];
  private recoveryStart: number | null = null;
  private recoveryTimes: number[] = [];

  recordSuccess(latencyMs: number): void {
    this.successes++;
    this.latencies.push(latencyMs);

    // If we were in a failure window, the first success marks recovery
    if (this.recoveryStart !== null) {
      this.recoveryTimes.push(Date.now() - this.recoveryStart);
      this.recoveryStart = null;
    }
  }

  recordFailure(): void {
    this.failures++;

    // Mark the start of a failure window (only once per window)
    if (this.recoveryStart === null) {
      this.recoveryStart = Date.now();
    }
  }

  getErrorRate(): number {
    const total = this.successes + this.failures;
    return total === 0 ? 0 : this.failures / total;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  getP99Latency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx];
  }

  getAverageRecoveryTime(): number {
    if (this.recoveryTimes.length === 0) return 0;
    return (
      this.recoveryTimes.reduce((a, b) => a + b, 0) /
      this.recoveryTimes.length
    );
  }

  getSummary() {
    return {
      totalRequests: this.successes + this.failures,
      successes: this.successes,
      failures: this.failures,
      errorRate: this.getErrorRate(),
      avgLatencyMs: this.getAverageLatency(),
      p99LatencyMs: this.getP99Latency(),
      avgRecoveryMs: this.getAverageRecoveryTime(),
    };
  }

  reset(): void {
    this.successes = 0;
    this.failures = 0;
    this.latencies = [];
    this.recoveryStart = null;
    this.recoveryTimes = [];
  }
}

// ---------------------------------------------------------------------------
// Utility: run a probe function and capture success / failure into metrics
// ---------------------------------------------------------------------------

export async function probe(
  fn: () => Promise<any>,
  metrics: ResilienceMetrics,
): Promise<boolean> {
  const start = Date.now();
  try {
    await fn();
    metrics.recordSuccess(Date.now() - start);
    return true;
  } catch {
    metrics.recordFailure();
    return false;
  }
}
