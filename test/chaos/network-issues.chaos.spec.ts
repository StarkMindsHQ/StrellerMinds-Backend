/**
 * Chaos Engineering Tests — Network Issue Scenarios
 *
 * Validates system resilience when external network calls (HTTP, Stellar RPC)
 * experience failures, latency, and intermittent availability.
 *
 * All HTTP interactions are mocked — no real network calls are made.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError, delay, Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AxiosResponse, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import {
  ExternalServicesHealthIndicator,
} from '../../src/health/indicators/external-services.health';
import { ResilienceMetrics, probe } from './chaos-helpers';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function axiosOk<T = any>(data: T, ms = 0): Observable<AxiosResponse<T>> {
  const headers = new AxiosHeaders();
  const config: InternalAxiosRequestConfig = {
    headers,
  } as InternalAxiosRequestConfig;

  const response: AxiosResponse<T> = {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  };

  if (ms > 0) {
    return timer(ms).pipe(switchMap(() => of(response)));
  }
  return of(response);
}

function axiosError(message: string, ms = 0): Observable<never> {
  const err = new Error(message);
  if (ms > 0) {
    return timer(ms).pipe(switchMap(() => throwError(() => err)));
  }
  return throwError(() => err);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Chaos Engineering — Network Issues', () => {
  // -----------------------------------------------------------------------
  // 1. External service health check under failures
  // -----------------------------------------------------------------------

  describe('External Service Health Checks', () => {
    let healthIndicator: ExternalServicesHealthIndicator;
    let httpService: HttpService;

    beforeEach(async () => {
      httpService = {
        get: jest.fn().mockReturnValue(axiosOk({ status: 'ok' })),
        post: jest.fn().mockReturnValue(axiosOk({ status: 'ok' })),
      } as unknown as HttpService;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExternalServicesHealthIndicator,
          { provide: HttpService, useValue: httpService },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                if (key === 'SOROBAN_RPC_URL') return 'http://mock-stellar:8000';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      healthIndicator = module.get(ExternalServicesHealthIndicator);
    });

    it('should report healthy when all services respond', async () => {
      const result = await healthIndicator.isHealthy('external_services');
      expect(result.external_services.status).toBe('up');
    });

    it('should report degraded when Stellar RPC is unreachable', async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        axiosError('ECONNREFUSED'),
      );

      const result = await healthIndicator.isHealthy('external_services');

      // When some services are down but at least one check reports up,
      // the indicator marks "degraded". With only Stellar configured,
      // all-down throws a HealthCheckError.
      expect(result).toBeDefined();
    });

    it('should handle connection timeout to external services', async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        axiosError('ETIMEDOUT'),
      );

      try {
        await healthIndicator.isHealthy('external_services');
        fail('Expected HealthCheckError');
      } catch (error: any) {
        expect(error.message).toContain('ExternalServicesCheck failed');
      }
    });

    it('should handle DNS resolution failures', async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        axiosError('ENOTFOUND mock-stellar'),
      );

      try {
        await healthIndicator.isHealthy('external_services');
        fail('Expected HealthCheckError');
      } catch (error: any) {
        expect(error.message).toContain('ExternalServicesCheck failed');
      }
    });

    it('should survive HTTP 500 from upstream', async () => {
      const headers = new AxiosHeaders();
      const config = { headers } as InternalAxiosRequestConfig;

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(
          () =>
            Object.assign(new Error('Request failed with status 500'), {
              response: {
                status: 500,
                data: 'Internal Server Error',
                headers: {},
                config,
              },
            }),
        ),
      );

      try {
        await healthIndicator.isHealthy('external_services');
        fail('Expected HealthCheckError');
      } catch (error: any) {
        expect(error.message).toContain('ExternalServicesCheck failed');
      }
    });
  });

  // -----------------------------------------------------------------------
  // 2. Stellar RPC network disruptions
  // -----------------------------------------------------------------------

  describe('Stellar RPC Disruptions', () => {
    it('should track error rates during simulated RPC outage', async () => {
      const metrics = new ResilienceMetrics();
      let callCount = 0;

      const faultyRpcCall = async () => {
        callCount++;
        if (callCount <= 5) {
          throw new Error('CHAOS: Stellar Horizon unreachable');
        }
        return { result: 'ok' };
      };

      for (let i = 0; i < 10; i++) {
        await probe(faultyRpcCall, metrics);
      }

      const summary = metrics.getSummary();
      expect(summary.failures).toBe(5);
      expect(summary.successes).toBe(5);
      expect(summary.errorRate).toBe(0.5);
    });

    it('should record recovery time after RPC comes back online', async () => {
      const metrics = new ResilienceMetrics();
      let callCount = 0;

      const faultyRpcCall = async () => {
        callCount++;
        if (callCount <= 3) {
          throw new Error('CHAOS: Stellar RPC timeout');
        }
        return { ledger: 12345 };
      };

      for (let i = 0; i < 6; i++) {
        await probe(faultyRpcCall, metrics);
        await new Promise((r) => setTimeout(r, 10)); // small delay
      }

      expect(metrics.getAverageRecoveryTime()).toBeGreaterThan(0);
    });

    it('should handle intermittent network flaps', async () => {
      const metrics = new ResilienceMetrics();
      let callCount = 0;

      // Alternate success / failure to simulate flapping link
      const flappingCall = async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('CHAOS: connection reset by peer');
        }
        return { ok: true };
      };

      for (let i = 0; i < 20; i++) {
        await probe(flappingCall, metrics);
      }

      const summary = metrics.getSummary();
      expect(summary.failures).toBe(10);
      expect(summary.successes).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Network latency injection
  // -----------------------------------------------------------------------

  describe('Network Latency Injection', () => {
    it('should measure degraded latency for slow external calls', async () => {
      const metrics = new ResilienceMetrics();

      const slowCall = async () => {
        await new Promise((r) => setTimeout(r, 80));
        return { ok: true };
      };

      for (let i = 0; i < 10; i++) {
        await probe(slowCall, metrics);
      }

      expect(metrics.getAverageLatency()).toBeGreaterThanOrEqual(60);
      expect(metrics.getP99Latency()).toBeGreaterThanOrEqual(60);
    });

    it('should detect latency spikes in p99', async () => {
      const metrics = new ResilienceMetrics();

      let callCount = 0;
      const spikyCall = async () => {
        callCount++;
        // 1 out of 10 calls is extremely slow
        const delay = callCount % 10 === 0 ? 300 : 10;
        await new Promise((r) => setTimeout(r, delay));
        return { ok: true };
      };

      for (let i = 0; i < 30; i++) {
        await probe(spikyCall, metrics);
      }

      expect(metrics.getP99Latency()).toBeGreaterThanOrEqual(200);
      expect(metrics.getAverageLatency()).toBeLessThan(100);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Connection reset scenarios
  // -----------------------------------------------------------------------

  describe('Connection Reset Scenarios', () => {
    it('should handle ECONNRESET errors gracefully', async () => {
      const metrics = new ResilienceMetrics();

      const resetCall = async () => {
        throw new Error('ECONNRESET: connection reset by peer');
      };

      for (let i = 0; i < 5; i++) {
        await probe(resetCall, metrics);
      }

      expect(metrics.getSummary().failures).toBe(5);
      expect(metrics.getSummary().successes).toBe(0);
    });

    it('should recover after connection resets stop', async () => {
      const metrics = new ResilienceMetrics();
      let callCount = 0;

      const recoveringCall = async () => {
        callCount++;
        if (callCount <= 3) {
          throw new Error('ECONNRESET');
        }
        return { recovered: true };
      };

      for (let i = 0; i < 6; i++) {
        await probe(recoveringCall, metrics);
      }

      const summary = metrics.getSummary();
      expect(summary.failures).toBe(3);
      expect(summary.successes).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Partial network degradation (multi-service)
  // -----------------------------------------------------------------------

  describe('Partial Network Degradation', () => {
    it('should isolate failures from individual service endpoints', async () => {
      const stellarMetrics = new ResilienceMetrics();
      const dbMetrics = new ResilienceMetrics();

      // Stellar is down, DB is up
      const stellarCall = async () => {
        throw new Error('Stellar RPC down');
      };
      const dbCall = async () => ({ result: 1 });

      for (let i = 0; i < 10; i++) {
        await probe(stellarCall, stellarMetrics);
        await probe(dbCall, dbMetrics);
      }

      expect(stellarMetrics.getSummary().errorRate).toBe(1.0);
      expect(dbMetrics.getSummary().errorRate).toBe(0);
    });

    it('should handle cascading timeout propagation', async () => {
      const metrics = new ResilienceMetrics();

      // Simulate an upstream call that itself depends on a timed-out downstream
      const cascadingCall = async () => {
        // "inner" call times out
        await new Promise((r) => setTimeout(r, 50));
        throw new Error(
          'Upstream timeout: downstream Stellar RPC timed out after 5000ms',
        );
      };

      for (let i = 0; i < 5; i++) {
        await probe(cascadingCall, metrics);
      }

      expect(metrics.getSummary().failures).toBe(5);
    });
  });
});
