import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { DistributedTracingService } from '../services/distributed-tracing.service';
import { PerformanceProfilerService } from '../services/performance-profiler.service';
import { AlertingService, AlertType, AlertSeverity } from '../services/alerting.service';

/**
 * Decorator for tracing method execution
 */
export function Trace(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracingService = this.tracingService || (this as any).constructor.tracingService;
      if (!tracingService) {
        return originalMethod.apply(this, args);
      }

      const traceId = tracingService.createTrace(operation, target.constructor.name);
      const spanId = tracingService.startSpan(traceId, operation);

      try {
        const result = await originalMethod.apply(this, args);
        tracingService.endSpan(spanId, 'completed');
        return result;
      } catch (error) {
        tracingService.endSpan(spanId, 'error', error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for measuring performance
 */
export function Performance(thresholdMs?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const profilerService = (this as any).profilerService || (this as any).constructor.profilerService;
      const alertingService = (this as any).alertingService || (this as any).constructor.alertingService;

      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        if (profilerService) {
          profilerService.recordOperation(operation, duration);
        }

        // Alert if operation exceeds threshold
        if (thresholdMs && duration > thresholdMs && alertingService) {
          await alertingService.createAlert(
            AlertType.SLOW_RESPONSE,
            duration,
            AlertSeverity.WARNING,
            `Operation ${operation} exceeded threshold: ${duration}ms > ${thresholdMs}ms`,
            { operation, duration, threshold: thresholdMs },
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        if (profilerService) {
          profilerService.recordOperation(operation, duration);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for profiling method execution
 */
export function Profile() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const profilerService = (this as any).profilerService || (this as any).constructor.profilerService;

      if (!profilerService) {
        return originalMethod.apply(this, args);
      }

      const startTime = Date.now();
      const memBefore = process.memoryUsage();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        const memAfter = process.memoryUsage();

        profilerService.recordOperation(operation, duration);

        const memDiff = memAfter.heapUsed - memBefore.heapUsed;
        if (Math.abs(memDiff) > 1000000) { // > 1MB difference
          const logger = (this as any).logger || console;
          logger.debug(
            `Operation ${operation} consumed ${(memDiff / 1024 / 1024).toFixed(2)}MB memory`,
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        profilerService.recordOperation(operation, duration);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to track cache performance
 */
export function CacheProfile(cacheName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = cacheName || propertyKey;

    descriptor.value = async function (...args: any[]) {
      const profilerService = (this as any).profilerService || (this as any).constructor.profilerService;
      const alertingService = (this as any).alertingService || (this as any).constructor.alertingService;

      const startTime = Date.now();
      const cacheHitKey = `cache_hit_${cache}`;
      const cacheMissKey = `cache_miss_${cache}`;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Determine if it was a cache hit or miss (inferred from result)
        const isCacheHit = result && result['fromCache'] === true;

        if (profilerService) {
          if (isCacheHit) {
            profilerService.recordOperation(cacheHitKey, duration);
          } else {
            profilerService.recordOperation(cacheMissKey, duration);
          }
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        if (profilerService) {
          profilerService.recordOperation(cacheMissKey, duration);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for database query profiling
 */
export function ProfileQuery(queryName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const query = queryName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const profilerService = (this as any).profilerService || (this as any).constructor.profilerService;
      const alertingService = (this as any).alertingService || (this as any).constructor.alertingService;

      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        if (profilerService) {
          profilerService.recordOperation(query, duration);
        }

        // Alert if query is too slow
        const dbThreshold = 1000; // 1 second
        if (duration > dbThreshold && alertingService) {
          await alertingService.createAlert(
            AlertType.DATABASE_LATENCY,
            duration,
            AlertSeverity.WARNING,
            `Slow database query: ${query} took ${duration}ms`,
            { query, duration },
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        if (profilerService) {
          profilerService.recordOperation(query, duration);
        }
        throw error;
      }
    };

    return descriptor;
  };
}
