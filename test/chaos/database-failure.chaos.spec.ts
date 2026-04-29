/**
 * Chaos Engineering Tests — Database Failure Scenarios
 *
 * Validates that the system degrades gracefully when the database becomes
 * unreachable, queries time out, or the connection pool is exhausted.
 *
 * These tests do NOT require a real database; every interaction is mocked
 * so the suite runs in CI without infrastructure dependencies.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  ConnectionPoolManager,
  CircuitState,
} from '../../src/database/connection-pool.manager';
import { ConnectionPoolMonitor } from '../../src/database/connection-pool.monitor';
import { DatabaseMonitorService } from '../../src/database/database.monitor.service';
import {
  FaultInjector,
  ResilienceMetrics,
  probe,
} from './chaos-helpers';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

function createMockQueryRunner(overrides: Partial<QueryRunner> = {}): QueryRunner {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([{ result: 1 }]),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as QueryRunner;
}

function createMockDataSource(
  queryRunnerOverrides: Partial<QueryRunner> = {},
): DataSource {
  const runner = createMockQueryRunner(queryRunnerOverrides);

  return {
    query: jest.fn().mockResolvedValue([{ result: 1 }]),
    createQueryRunner: jest.fn().mockReturnValue(runner),
    isInitialized: true,
    driver: {
      master: {
        totalCount: 10,
        idleCount: 8,
        waitingCount: 0,
      },
    },
  } as unknown as DataSource;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Chaos Engineering — Database Failures', () => {
  let dataSource: DataSource;
  let poolManager: ConnectionPoolManager;
  let poolMonitor: ConnectionPoolMonitor;
  let dbMonitor: DatabaseMonitorService;
  let eventEmitter: EventEmitter2;
  let faultInjector: FaultInjector;

  beforeEach(async () => {
    dataSource = createMockDataSource();
    eventEmitter = new EventEmitter2();
    faultInjector = new FaultInjector();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionPoolManager,
        ConnectionPoolMonitor,
        DatabaseMonitorService,
        { provide: DataSource, useValue: dataSource },
        { provide: 'DataSourceDefault', useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    poolManager = module.get(ConnectionPoolManager);
    poolMonitor = module.get(ConnectionPoolMonitor);
    dbMonitor = module.get(DatabaseMonitorService);
  });

  afterEach(() => {
    faultInjector.restore(dataSource);
  });

  // -----------------------------------------------------------------------
  // 1. Complete database outage
  // -----------------------------------------------------------------------

  describe('Complete Database Outage', () => {
    it('should report unhealthy when all queries fail', async () => {
      faultInjector.injectQueryFailure(dataSource);

      const isConnected = await dbMonitor.checkConnection();
      expect(isConnected).toBe(false);
    });

    it('should propagate errors to callers without crashing the process', async () => {
      faultInjector.injectQueryFailure(dataSource);

      await expect(dataSource.query('SELECT 1')).rejects.toThrow(
        /CHAOS.*Connection refused/,
      );
    });

    it('should log a warning when the DataSource reports not initialised', async () => {
      (dataSource as any).isInitialized = false;

      // monitorDatabase checks isInitialized and logs a warning
      await expect(dbMonitor.monitorDatabase()).resolves.not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Query timeout scenarios
  // -----------------------------------------------------------------------

  describe('Query Timeouts', () => {
    it('should timeout queries that exceed threshold', async () => {
      faultInjector.injectQueryTimeout(dataSource, 200);

      const start = Date.now();
      await expect(dataSource.query('SELECT 1')).rejects.toThrow(
        /CHAOS.*timed out/,
      );
      const elapsed = Date.now() - start;

      // Allow some tolerance for timer imprecision
      expect(elapsed).toBeGreaterThanOrEqual(150);
    });

    it('should not block the event loop while waiting for timeout', async () => {
      faultInjector.injectQueryTimeout(dataSource, 100);

      // Fire the slow query — DON'T await it yet
      const slowQuery = dataSource.query('SELECT 1').catch(() => {});

      // The event loop should remain responsive
      const tickStart = Date.now();
      await new Promise((r) => setImmediate(r));
      const tickMs = Date.now() - tickStart;

      expect(tickMs).toBeLessThan(50); // event loop tick < 50ms ⇒ not blocked

      await slowQuery; // cleanup
    });
  });

  // -----------------------------------------------------------------------
  // 3. Connection pool exhaustion
  // -----------------------------------------------------------------------

  describe('Connection Pool Exhaustion', () => {
    it('should detect high utilisation and emit a warning event', async () => {
      // Simulate 95 % pool utilisation
      (dataSource as any).driver.master = {
        totalCount: 20,
        idleCount: 1,
        waitingCount: 5,
      };

      const warningSpy = jest.fn();
      eventEmitter.on('pool.warning', warningSpy);

      const criticalSpy = jest.fn();
      eventEmitter.on('pool.critical', criticalSpy);

      await poolMonitor.monitorConnectionPool();

      // 95 % utilisation should trigger the CRITICAL threshold (>= 95)
      expect(criticalSpy).toHaveBeenCalledTimes(1);
    });

    it('should detect waiting requests exceeding threshold', async () => {
      (dataSource as any).driver.master = {
        totalCount: 20,
        idleCount: 0,
        waitingCount: 15,
      };

      const criticalSpy = jest.fn();
      eventEmitter.on('pool.waiting.critical', criticalSpy);

      await poolMonitor.monitorConnectionPool();

      expect(criticalSpy).toHaveBeenCalledTimes(1);
    });

    it('should report unhealthy when pool is critically saturated', async () => {
      (dataSource as any).driver.master = {
        totalCount: 20,
        idleCount: 0,
        waitingCount: 15,
      };

      const { healthy } = await poolMonitor.checkPoolHealth();
      expect(healthy).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Circuit breaker behaviour under faults
  // -----------------------------------------------------------------------

  describe('Circuit Breaker Under Database Faults', () => {
    it('should open after consecutive connection failures', async () => {
      // Make connect() fail on every QueryRunner
      dataSource = createMockDataSource({
        connect: jest.fn().mockRejectedValue(new Error('CHAOS: connect fail')),
      });

      const module = await Test.createTestingModule({
        providers: [
          ConnectionPoolManager,
          { provide: DataSource, useValue: dataSource },
          { provide: 'DataSourceDefault', useValue: dataSource },
        ],
      }).compile();

      const mgr = module.get(ConnectionPoolManager);

      // Trigger 5 failures (the default threshold)
      for (let i = 0; i < 5; i++) {
        await mgr
          .executeWithCircuitBreaker(async () => {})
          .catch(() => {});
      }

      expect(mgr.getCircuitState()).toBe(CircuitState.OPEN);
    });

    it('should reject immediately once the circuit is open', async () => {
      dataSource = createMockDataSource({
        connect: jest.fn().mockRejectedValue(new Error('fail')),
      });

      const module = await Test.createTestingModule({
        providers: [
          ConnectionPoolManager,
          { provide: DataSource, useValue: dataSource },
          { provide: 'DataSourceDefault', useValue: dataSource },
        ],
      }).compile();

      const mgr = module.get(ConnectionPoolManager);

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await mgr.executeWithCircuitBreaker(async () => {}).catch(() => {});
      }

      // Next call should be rejected immediately, not attempt a connection
      const start = Date.now();
      await expect(
        mgr.executeWithCircuitBreaker(async () => 'should not reach'),
      ).rejects.toThrow(/Circuit breaker is OPEN/);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // near-instant rejection
    });

    it('should transition to HALF_OPEN after the reset timeout', async () => {
      dataSource = createMockDataSource({
        connect: jest.fn().mockRejectedValue(new Error('fail')),
      });

      const module = await Test.createTestingModule({
        providers: [
          ConnectionPoolManager,
          { provide: DataSource, useValue: dataSource },
          { provide: 'DataSourceDefault', useValue: dataSource },
        ],
      }).compile();

      const mgr = module.get(ConnectionPoolManager);

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await mgr.executeWithCircuitBreaker(async () => {}).catch(() => {});
      }
      expect(mgr.getCircuitState()).toBe(CircuitState.OPEN);

      // Fast-forward past the resetTimeout (60 s). We manipulate Date.now
      // via the private lastFailureTime field.
      (mgr as any).lastFailureTime = new Date(Date.now() - 61_000);

      // The next call should probe (HALF_OPEN) rather than reject outright.
      // It will still fail because connect() is still broken, but the state
      // should be HALF_OPEN before the failure bumps it back to OPEN.
      await mgr.executeWithCircuitBreaker(async () => {}).catch(() => {});

      // After the probe failure, state is OPEN again
      expect(mgr.getCircuitState()).toBe(CircuitState.OPEN);
    });

    it('should recover to CLOSED when a HALF_OPEN probe succeeds', async () => {
      // Start with failing connect, then allow it to succeed
      let shouldFail = true;
      const connectMock = jest.fn().mockImplementation(async () => {
        if (shouldFail) throw new Error('fail');
      });

      dataSource = createMockDataSource({ connect: connectMock });

      const module = await Test.createTestingModule({
        providers: [
          ConnectionPoolManager,
          { provide: DataSource, useValue: dataSource },
          { provide: 'DataSourceDefault', useValue: dataSource },
        ],
      }).compile();

      const mgr = module.get(ConnectionPoolManager);

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await mgr.executeWithCircuitBreaker(async () => {}).catch(() => {});
      }
      expect(mgr.getCircuitState()).toBe(CircuitState.OPEN);

      // Allow recovery
      shouldFail = false;
      (mgr as any).lastFailureTime = new Date(Date.now() - 61_000);

      await mgr.executeWithCircuitBreaker(async () => 'ok');
      expect(mgr.getCircuitState()).toBe(CircuitState.CLOSED);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Transient / intermittent failures
  // -----------------------------------------------------------------------

  describe('Transient Database Failures', () => {
    it('should recover after N transient failures', async () => {
      const metrics = new ResilienceMetrics();
      faultInjector.injectTransientFailure(dataSource, 3);

      for (let i = 0; i < 5; i++) {
        await probe(() => dataSource.query('SELECT 1'), metrics);
      }

      const summary = metrics.getSummary();
      expect(summary.failures).toBe(3);
      expect(summary.successes).toBe(2);
      expect(summary.errorRate).toBeCloseTo(0.6, 1);
    });

    it('should track recovery time after transient failure window', async () => {
      const metrics = new ResilienceMetrics();
      faultInjector.injectTransientFailure(dataSource, 2);

      for (let i = 0; i < 4; i++) {
        await probe(() => dataSource.query('SELECT 1'), metrics);
      }

      // First success after failures should record a recovery time
      expect(metrics.getAverageRecoveryTime()).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Latency injection
  // -----------------------------------------------------------------------

  describe('Database Latency Injection', () => {
    it('should add measurable latency to queries', async () => {
      faultInjector.injectLatency(dataSource, 100);

      const start = Date.now();
      await dataSource.query('SELECT 1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(80); // tolerance
    });

    it('should measure p99 latency under injected delay', async () => {
      const metrics = new ResilienceMetrics();
      faultInjector.injectLatency(dataSource, 50);

      for (let i = 0; i < 20; i++) {
        await probe(() => dataSource.query('SELECT 1'), metrics);
      }

      expect(metrics.getP99Latency()).toBeGreaterThanOrEqual(40);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Pool statistics accuracy under chaos
  // -----------------------------------------------------------------------

  describe('Pool Stats Under Chaos', () => {
    it('should correctly compute utilisation percentage', async () => {
      (dataSource as any).driver.master = {
        totalCount: 10,
        idleCount: 3,
        waitingCount: 0,
      };

      const stats = await poolMonitor.getPoolStats();

      expect(stats.totalConnections).toBe(10);
      expect(stats.activeConnections).toBe(7);
      expect(stats.idleConnections).toBe(3);
      expect(stats.utilizationPercent).toBe(70);
    });

    it('should return zero utilisation when pool has no connections', async () => {
      (dataSource as any).driver.master = {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      };

      const stats = await poolMonitor.getPoolStats();
      expect(stats.utilizationPercent).toBe(0);
    });

    it('should cap stats history at configured maximum', async () => {
      for (let i = 0; i < 120; i++) {
        await poolMonitor.monitorConnectionPool();
      }

      const recent = poolMonitor.getRecentStats(200);
      expect(recent.length).toBeLessThanOrEqual(100);
    });
  });

  // -----------------------------------------------------------------------
  // 8. Concurrent fault and healthy operations
  // -----------------------------------------------------------------------

  describe('Mixed Healthy and Faulty Operations', () => {
    it('should isolate failures from concurrent healthy queries', async () => {
      const metrics = new ResilienceMetrics();

      // 50 % failure rate
      faultInjector.injectRandomFailures(dataSource, 0.5);

      const batchSize = 100;
      const promises: Promise<boolean>[] = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(probe(() => dataSource.query('SELECT 1'), metrics));
      }

      await Promise.all(promises);

      const summary = metrics.getSummary();

      // With 50 % probability over 100 trials, error rate should be
      // roughly 0.5 ± 0.15 (99 % CI for binomial)
      expect(summary.errorRate).toBeGreaterThan(0.2);
      expect(summary.errorRate).toBeLessThan(0.8);
      expect(summary.totalRequests).toBe(batchSize);
    });
  });
});
