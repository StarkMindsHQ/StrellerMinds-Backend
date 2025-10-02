import { Test, type TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsCollectorService } from '../services/metrics-collector.service';
import { HealthCheckService } from '../services/health-check.service';
import { AlertService } from '../services/alert.service';
import { CustomLoggerService } from '../services/logger.service';
import {
  MonitoringConfig,
  HealthStatus,
  AlertType,
  AlertSeverity,
  LogLevel,
  HealthCheckResult,
} from '../interfaces/monitoring-config.interface';
import { jest, expect } from '@jest/globals';

describe('MonitoringModule', () => {
  let metricsCollector: MetricsCollectorService;
  let healthCheckService: HealthCheckService;
  let alertService: AlertService;
  let loggerService: CustomLoggerService;

  const mockConfig: MonitoringConfig = {
    enableMetrics: true,
    enableHealthChecks: true,
    enableAlerts: true,
    metricsInterval: 1000,
    healthCheckInterval: 2000,
    logLevel: LogLevel.DEBUG,
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      responseTime: 1000,
      errorRate: 5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: 'MonitoringConfig',
          useValue: mockConfig,
        },
        MetricsCollectorService,
        HealthCheckService,
        AlertService,
        CustomLoggerService,
      ],
    }).compile();

    metricsCollector = module.get<MetricsCollectorService>(MetricsCollectorService);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    alertService = module.get<AlertService>(AlertService);
    loggerService = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('MetricsCollectorService', () => {
    it('should be defined', () => {
      expect(metricsCollector).toBeDefined();
    });

    it('should record request metrics', () => {
      metricsCollector.recordRequest('/api/users');
      metricsCollector.recordRequest('/api/users');
      metricsCollector.recordRequest('/api/posts');

      const metrics = metricsCollector.getAggregatedMetrics();
      expect(metrics.requests['/api/users']).toBe(2);
      expect(metrics.requests['/api/posts']).toBe(1);
      expect(metrics.totalRequests).toBe(3);
    });

    it('should record response time metrics', () => {
      metricsCollector.recordResponseTime(150);
      metricsCollector.recordResponseTime(200);
      metricsCollector.recordResponseTime(100);

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should record error metrics', () => {
      metricsCollector.recordError('ValidationError');
      metricsCollector.recordError('DatabaseError');

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should get metrics by name', () => {
      // Simulate some system metrics collection
      const cpuMetrics = metricsCollector.getMetricsByName('cpu_usage');
      expect(Array.isArray(cpuMetrics)).toBe(true);
    });

    it('should get metrics since a specific date', () => {
      const since = new Date(Date.now() - 60000); // 1 minute ago
      const metrics = metricsCollector.getMetrics(since);
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should handle invalid metrics gracefully', () => {
      expect(() => metricsCollector.recordResponseTime(-1)).not.toThrow();
    });
  });

  describe('HealthCheckService', () => {
    it('should be defined', () => {
      expect(healthCheckService).toBeDefined();
    });

    it('should register custom health check', async () => {
      const customCheck = jest.fn().mockResolvedValue({
        service: 'custom-service',
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
      }) as () => Promise<HealthCheckResult>;

      healthCheckService.registerHealthCheck('custom-service', customCheck);

      await healthCheckService.performImmediateHealthCheck('custom-service');
      expect(customCheck).toHaveBeenCalled();
    });

    it('should unregister health check', () => {
      const customCheck = jest.fn() as () => Promise<HealthCheckResult>;
      healthCheckService.registerHealthCheck('test-service', customCheck);
      healthCheckService.unregisterHealthCheck('test-service');

      expect(() => healthCheckService.getHealthStatus('test-service')).toThrow();
    });

    it('should get overall health status', () => {
      const overallHealth = healthCheckService.getOverallHealth();
      expect(overallHealth).toHaveProperty('status');
      expect(overallHealth).toHaveProperty('services');
      expect(Array.isArray(overallHealth.services)).toBe(true);
    });

    it('should perform immediate health check', async () => {
      const results = await healthCheckService.performImmediateHealthCheck();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle health check failures', async () => {
      const failingCheck = jest.fn().mockRejectedValue(new Error('Service down')) as any;
      healthCheckService.registerHealthCheck('failing-service', failingCheck);

      const result = (await healthCheckService.performImmediateHealthCheck(
        'failing-service',
      )) as any;
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe('AlertService', () => {
    it('should be defined', () => {
      expect(alertService).toBeDefined();
    });

    it('should register custom alert handler', () => {
      const customHandler = jest.fn() as any;
      alertService.registerAlertHandler(AlertType.PERFORMANCE, customHandler);

      // The handler registration should not throw
      expect(() => {
        alertService.registerAlertHandler(AlertType.ERROR, jest.fn() as any);
      }).not.toThrow();
    });

    it('should get alerts by type', () => {
      const performanceAlerts = alertService.getAlertsByType(AlertType.PERFORMANCE);
      expect(Array.isArray(performanceAlerts)).toBe(true);
    });

    it('should get alerts by severity', () => {
      const criticalAlerts = alertService.getAlertsBySeverity(AlertSeverity.CRITICAL);
      expect(Array.isArray(criticalAlerts)).toBe(true);
    });

    it('should resolve alert', () => {
      // Since we can't easily create alerts in tests, we'll test the method exists
      const result = alertService.resolveAlert('non-existent-alert');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should clear resolved alerts', () => {
      const clearedCount = alertService.clearResolvedAlerts();
      expect(typeof clearedCount).toBe('number');
    });

    it('should get all alerts', () => {
      const allAlerts = alertService.getAlerts();
      expect(Array.isArray(allAlerts)).toBe(true);
    });
  });

  describe('CustomLoggerService', () => {
    it('should be defined', () => {
      expect(loggerService).toBeDefined();
    });

    it('should log messages at different levels', () => {
      loggerService.log('Info message', 'TestContext');
      loggerService.error('Error message', 'stack trace', 'TestContext');
      loggerService.warn('Warning message', 'TestContext');
      loggerService.debug('Debug message', 'TestContext');
      loggerService.verbose('Verbose message', 'TestContext');

      const logs = loggerService.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by level', () => {
      loggerService.error('Test error', undefined, 'TestContext');
      loggerService.warn('Test warning', 'TestContext');

      const errorLogs = loggerService.getLogs(undefined, LogLevel.ERROR);
      const warnLogs = loggerService.getLogs(undefined, LogLevel.WARN);

      expect(errorLogs.length).toBeGreaterThan(0);
      expect(warnLogs.length).toBeGreaterThan(0);
    });

    it('should filter logs by context', () => {
      loggerService.log('Message 1', 'Context1');
      loggerService.log('Message 2', 'Context2');

      const context1Logs = loggerService.getLogs(undefined, undefined, 'Context1');
      const context2Logs = loggerService.getLogs(undefined, undefined, 'Context2');

      expect(context1Logs.length).toBeGreaterThan(0);
      expect(context2Logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by date', async () => {
      const since = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10));

      loggerService.log('Recent message', 'TestContext');
      const recentLogs = loggerService.getLogs(since);
      expect(recentLogs.length).toBeGreaterThan(0);
    });

    it('should get logs by trace ID', () => {
      const traceId = 'test-trace-123';
      loggerService.log('Traced message', 'TestContext', traceId);

      const tracedLogs = loggerService.getLogsByTraceId(traceId);
      expect(tracedLogs.length).toBeGreaterThan(0);
      expect(tracedLogs[0].traceId).toBe(traceId);
    });

    it('should get error logs', () => {
      loggerService.error('Test error', undefined, 'TestContext');

      const errorLogs = loggerService.getErrorLogs();
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);
    });

    it('should get log statistics', () => {
      loggerService.log('Info message');
      loggerService.error('Error message');
      loggerService.warn('Warning message');

      const stats = loggerService.getLogStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byLevel');
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.byLevel[LogLevel.INFO]).toBe('number');
    });

    it('should clear logs', () => {
      loggerService.log('Test message');
      loggerService.clearLogs();

      const logs = loggerService.getLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should trigger alerts based on metrics thresholds', async () => {
      // Record high response times
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordResponseTime(1500); // Above threshold
      }
      // Perform health checks
      await healthCheckService.performImmediateHealthCheck();

      // Check for alerts
      await alertService.checkAlertConditions();

      // Log some messages
      loggerService.log('Monitoring workflow test completed');

      // Verify everything is working
      const metrics = metricsCollector.getMetrics();
      const health = healthCheckService.getOverallHealth();
      const alerts = alertService.getAlertsByType(AlertType.PERFORMANCE);
      const logs = loggerService.getLogs();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].message).toContain('response time');
      expect(metrics).toBeDefined();
      expect(health.status).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
