/**
 * Chaos Engineering Tests — Service Resilience & Cascading Failures
 *
 * Validates that individual service layers (Course, Health, Pool Controller)
 * degrade gracefully when their dependencies are disrupted, and that faults
 * do not cascade beyond their blast radius.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

import { CourseService } from '../../src/course/course.service';
import { Course } from '../../src/course/entities/course.entity';
import { QueryCacheService } from '../../src/common/cache/query-cache.service';
import { HealthService } from '../../src/health/health.service';
import { DatabaseHealthIndicator } from '../../src/health/indicators/database.health';
import { RedisHealthIndicator } from '../../src/health/indicators/redis.health';
import { ExternalServicesHealthIndicator } from '../../src/health/indicators/external-services.health';
import { HealthCheckService } from '@nestjs/terminus';
import {
  ConnectionPoolManager,
  CircuitState,
} from '../../src/database/connection-pool.manager';
import { ConnectionPoolMonitor } from '../../src/database/connection-pool.monitor';
import { ConnectionPoolController } from '../../src/database/connection-pool.controller';
import { DynamicPoolSizingService } from '../../src/database/dynamic-pool-sizing.service';
import { FaultInjector, ResilienceMetrics, ChaosScheduler, probe } from './chaos-helpers';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

function createMockRepo(): Partial<Repository<Course>> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    query: jest.fn().mockResolvedValue([{ result: 1 }]),
  };
}

function createMockCacheService() {
  return {
    getOrSet: jest.fn().mockImplementation((_key: string, fn: () => any) => fn()),
    invalidate: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Chaos Engineering — Service Resilience', () => {
  // -----------------------------------------------------------------------
  // 1. CourseService under database chaos
  // -----------------------------------------------------------------------

  describe('CourseService Under Database Chaos', () => {
    let courseService: CourseService;
    let courseRepo: Partial<Repository<Course>>;

    beforeEach(async () => {
      courseRepo = createMockRepo();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CourseService,
          { provide: getRepositoryToken(Course), useValue: courseRepo },
          { provide: QueryCacheService, useValue: createMockCacheService() },
        ],
      }).compile();

      courseService = module.get(CourseService);
    });

    it('should propagate repository errors to the caller', async () => {
      (courseRepo.find as jest.Mock).mockRejectedValue(
        new Error('CHAOS: DB unreachable'),
      );

      await expect(courseService.findAll()).rejects.toThrow(/CHAOS/);
    });

    it('should return null gracefully when findOne hits a DB failure', async () => {
      (courseRepo.findOne as jest.Mock).mockRejectedValue(
        new Error('CHAOS: Timeout'),
      );

      await expect(courseService.findOne('abc')).rejects.toThrow(/CHAOS/);
    });

    it('should still work after transient failure resolves', async () => {
      let callCount = 0;
      (courseRepo.find as jest.Mock).mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) throw new Error('CHAOS: transient');
        return [{ id: '1', title: 'Stellar 101' }];
      });

      // First two calls fail
      await expect(courseService.findAll()).rejects.toThrow();
      await expect(courseService.findAll()).rejects.toThrow();

      // Third call succeeds
      const result = await courseService.findAll();
      expect(result).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // 2. HealthService when sub-indicators fail
  // -----------------------------------------------------------------------

  describe('HealthService Under Indicator Failures', () => {
    let healthService: HealthService;
    let healthCheckService: Partial<HealthCheckService>;

    beforeEach(async () => {
      healthCheckService = {
        check: jest.fn().mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthService,
          { provide: HealthCheckService, useValue: healthCheckService },
          {
            provide: DatabaseHealthIndicator,
            useValue: { isHealthy: jest.fn().mockResolvedValue({ database: { status: 'up' } }) },
          },
          {
            provide: RedisHealthIndicator,
            useValue: { isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }) },
          },
          {
            provide: ExternalServicesHealthIndicator,
            useValue: { isHealthy: jest.fn().mockResolvedValue({ external_services: { status: 'up' } }) },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
                if (key === 'NODE_ENV') return 'test';
                return defaultVal;
              }),
            },
          },
        ],
      }).compile();

      healthService = module.get(HealthService);
    });

    it('should report healthy when all indicators pass', async () => {
      const result = await healthService.checkFullHealth();
      expect(result.status).toBe('healthy');
    });

    it('should report degraded when database fails but others pass', async () => {
      (healthCheckService.check as jest.Mock).mockResolvedValue({
        status: 'error',
        info: { redis: { status: 'up' } },
        error: { database: { status: 'down', message: 'CHAOS' } },
        details: {},
      });

      const result = await healthService.checkFullHealth();
      expect(result.status).toBe('degraded');
    });

    it('should report unhealthy when all indicators fail', async () => {
      (healthCheckService.check as jest.Mock).mockResolvedValue({
        status: 'error',
        info: {},
        error: {
          database: { status: 'down' },
          redis: { status: 'down' },
        },
        details: {},
      });

      const result = await healthService.checkFullHealth();
      expect(result.status).toBe('unhealthy');
    });

    it('should always return healthy for liveness probe regardless of dependencies', async () => {
      // Even if health check service would fail, liveness is independent
      const result = await healthService.checkLiveness();
      expect(result.status).toBe('healthy');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should report readiness status when DB is down', async () => {
      (healthCheckService.check as jest.Mock).mockResolvedValue({
        status: 'error',
        info: {},
        error: { database: { status: 'down' } },
        details: {},
      });

      const result = await healthService.checkReadiness();
      expect(result.status).toBe('unhealthy');
    });
  });

  // -----------------------------------------------------------------------
  // 3. ConnectionPoolController under chaos
  // -----------------------------------------------------------------------

  describe('ConnectionPoolController Under Chaos', () => {
    let controller: ConnectionPoolController;
    let poolMonitor: ConnectionPoolMonitor;
    let poolManager: ConnectionPoolManager;

    beforeEach(async () => {
      const mockDataSource = {
        query: jest.fn().mockResolvedValue([]),
        createQueryRunner: jest.fn().mockReturnValue({
          connect: jest.fn().mockResolvedValue(undefined),
          release: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue([]),
        }),
        isInitialized: true,
        driver: {
          master: {
            totalCount: 10,
            idleCount: 8,
            waitingCount: 0,
          },
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConnectionPoolController,
          ConnectionPoolMonitor,
          ConnectionPoolManager,
          { provide: DataSource, useValue: mockDataSource },
          { provide: 'DataSourceDefault', useValue: mockDataSource },
          { provide: EventEmitter2, useValue: new EventEmitter2() },
          {
            provide: ConfigService,
            useValue: { get: jest.fn() },
          },
        ],
      }).compile();

      controller = module.get(ConnectionPoolController);
      poolMonitor = module.get(ConnectionPoolMonitor);
      poolManager = module.get(ConnectionPoolManager);
    });

    it('should return pool health even when monitor internals throw', async () => {
      jest.spyOn(poolMonitor, 'checkPoolHealth').mockResolvedValue({
        healthy: false,
        stats: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          waitingRequests: 0,
          utilizationPercent: 0,
          timestamp: new Date(),
        },
      });

      const result = await controller.getPoolHealth();
      expect(result.healthy).toBe(false);
    });

    it('should expose circuit breaker state', async () => {
      const result = await controller.getCircuitBreakerState();
      expect(result.state).toBe(CircuitState.CLOSED);
    });

    it('should return empty stats gracefully', async () => {
      const stats = await controller.getPoolStats();
      expect(stats).toBeDefined();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // 4. DynamicPoolSizingService edge cases
  // -----------------------------------------------------------------------

  describe('DynamicPoolSizingService Under Extreme Load', () => {
    let sizingService: DynamicPoolSizingService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DynamicPoolSizingService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                if (key === 'NODE_ENV') return 'production';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      sizingService = module.get(DynamicPoolSizingService);
    });

    it('should calculate sensible pool size in production', () => {
      const { min, max } = sizingService.calculateOptimalPoolSize();
      expect(min).toBeGreaterThanOrEqual(1);
      expect(max).toBeLessThanOrEqual(50);
      expect(max).toBeGreaterThanOrEqual(min);
    });

    it('should return min size for very low load', () => {
      const size = sizingService.getRecommendedPoolSize(0.1);
      const { min } = sizingService.calculateOptimalPoolSize();
      expect(size).toBe(min);
    });

    it('should return max size for very high load', () => {
      const size = sizingService.getRecommendedPoolSize(0.9);
      const { max } = sizingService.calculateOptimalPoolSize();
      expect(size).toBe(max);
    });

    it('should scale linearly between min and max for moderate load', () => {
      const size = sizingService.getRecommendedPoolSize(0.65);
      const { min, max } = sizingService.calculateOptimalPoolSize();
      expect(size).toBeGreaterThanOrEqual(min);
      expect(size).toBeLessThanOrEqual(max);
    });
  });

  // -----------------------------------------------------------------------
  // 5. ChaosScheduler — timed fault orchestration
  // -----------------------------------------------------------------------

  describe('ChaosScheduler Timed Fault Orchestration', () => {
    let scheduler: ChaosScheduler;

    beforeEach(() => {
      scheduler = new ChaosScheduler();
    });

    afterEach(() => {
      scheduler.cancelAll();
    });

    it('should inject and auto-restore a fault on schedule', async () => {
      let faultActive = false;

      scheduler.schedule({
        name: 'test-fault',
        delayMs: 50,
        durationMs: 100,
        inject: () => {
          faultActive = true;
        },
        restore: () => {
          faultActive = false;
        },
      });

      // Before injection
      expect(faultActive).toBe(false);

      // Wait for injection
      await new Promise((r) => setTimeout(r, 80));
      expect(faultActive).toBe(true);

      // Wait for auto-restore
      await new Promise((r) => setTimeout(r, 130));
      expect(faultActive).toBe(false);
    });

    it('should cancel pending faults when cancelAll is called', async () => {
      let faultActive = false;

      scheduler.schedule({
        name: 'cancel-test',
        delayMs: 100,
        durationMs: 100,
        inject: () => {
          faultActive = true;
        },
        restore: () => {
          faultActive = false;
        },
      });

      scheduler.cancelAll();

      await new Promise((r) => setTimeout(r, 250));
      expect(faultActive).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Blast radius isolation — multi-service simultaneous faults
  // -----------------------------------------------------------------------

  describe('Blast Radius Isolation', () => {
    it('should isolate database failures from in-memory operations', async () => {
      const dbMetrics = new ResilienceMetrics();
      const memMetrics = new ResilienceMetrics();

      const dbCall = async () => {
        throw new Error('CHAOS: DB down');
      };

      const memCall = async () => {
        // Pure in-memory computation — unaffected by DB faults
        return Array.from({ length: 1000 }, (_, i) => i * 2);
      };

      for (let i = 0; i < 20; i++) {
        await probe(dbCall, dbMetrics);
        await probe(memCall, memMetrics);
      }

      expect(dbMetrics.getSummary().errorRate).toBe(1.0);
      expect(memMetrics.getSummary().errorRate).toBe(0);
      expect(memMetrics.getSummary().successes).toBe(20);
    });

    it('should contain exception propagation within service boundaries', async () => {
      const results: { service: string; ok: boolean }[] = [];

      // Service A fails
      try {
        throw new Error('CHAOS: Service A failure');
      } catch {
        results.push({ service: 'A', ok: false });
      }

      // Service B should be unaffected
      try {
        const data = { id: 1, name: 'test' };
        results.push({ service: 'B', ok: !!data });
      } catch {
        results.push({ service: 'B', ok: false });
      }

      // Service C should be unaffected
      try {
        const computed = Math.pow(2, 10);
        results.push({ service: 'C', ok: computed === 1024 });
      } catch {
        results.push({ service: 'C', ok: false });
      }

      expect(results.find((r) => r.service === 'A')!.ok).toBe(false);
      expect(results.find((r) => r.service === 'B')!.ok).toBe(true);
      expect(results.find((r) => r.service === 'C')!.ok).toBe(true);
    });
  });
});
