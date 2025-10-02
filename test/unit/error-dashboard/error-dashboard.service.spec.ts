import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorDashboardService } from '../../../src/error-dashboard/error-dashboard.service';
import { LoggerService } from '../../../src/common/logging/logger.service';
import { AlertingService } from '../../../src/common/alerting/alerting.service';
import { ErrorLog } from '../../../src/common/entities/error-log.entity';

describe('ErrorDashboardService', () => {
  let service: ErrorDashboardService;
  let errorLogRepository: Repository<ErrorLog>;
  let loggerService: LoggerService;
  let alertingService: AlertingService;

  const mockErrorLog = {
    id: '1',
    correlationId: 'corr-123',
    errorCode: 'INTERNAL_ERROR',
    errorMessage: 'Internal server error',
    statusCode: 500,
    endpoint: '/api/test',
    method: 'GET',
    userId: 'user-1',
    userAgent: 'test-agent',
    ip: '127.0.0.1',
    stackTrace: 'Error: Test error',
    context: { test: 'context' },
    severity: 'critical',
    category: 'SYSTEM',
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorDashboardService,
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            info: jest.fn(),
            setContext: jest.fn(),
          },
        },
        {
          provide: AlertingService,
          useValue: {
            // Mock alerting service methods if needed
          },
        },
        {
          provide: getRepositoryToken(ErrorLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
              getCount: jest.fn().mockResolvedValue(0),
              getOne: jest.fn().mockResolvedValue(null),
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<ErrorDashboardService>(ErrorDashboardService);
    errorLogRepository = module.get<Repository<ErrorLog>>(getRepositoryToken(ErrorLog));
    loggerService = module.get<LoggerService>(LoggerService);
    alertingService = module.get<AlertingService>(AlertingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addErrorLog', () => {
    it('should create and save an error log', async () => {
      const errorLogData = {
        correlationId: 'corr-123',
        errorCode: 'INTERNAL_ERROR',
        message: 'Test error message',
        statusCode: 500,
        endpoint: '/api/test',
        method: 'GET',
        userId: 'user-1',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        stackTrace: 'Error stack trace',
        context: { test: 'context' },
        severity: 'critical',
        category: 'SYSTEM',
        timestamp: new Date().toISOString(),
      };

      const mockErrorLogEntity = { ...mockErrorLog };
      jest.spyOn(errorLogRepository, 'create').mockReturnValue(mockErrorLogEntity as any);
      jest.spyOn(errorLogRepository, 'save').mockResolvedValue(mockErrorLogEntity as any);

      await service.addErrorLog(errorLogData);

      expect(errorLogRepository.create).toHaveBeenCalledWith({
        correlationId: errorLogData.correlationId,
        errorCode: errorLogData.errorCode,
        errorMessage: errorLogData.message,
        statusCode: errorLogData.statusCode,
        endpoint: errorLogData.endpoint,
        method: errorLogData.method,
        userId: errorLogData.userId,
        userAgent: errorLogData.userAgent,
        ip: errorLogData.ip,
        stackTrace: errorLogData.stackTrace,
        context: errorLogData.context,
        severity: errorLogData.severity,
        category: errorLogData.category,
        timestamp: expect.any(Date),
      });
      expect(errorLogRepository.save).toHaveBeenCalledWith(mockErrorLogEntity);
    });

    it('should log error if saving fails', async () => {
      const errorLogData = {
        correlationId: 'corr-123',
        errorCode: 'INTERNAL_ERROR',
        message: 'Test error message',
        statusCode: 500,
        endpoint: '/api/test',
        method: 'GET',
        userId: 'user-1',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        stackTrace: 'Error stack trace',
        context: { test: 'context' },
        severity: 'critical',
        category: 'SYSTEM',
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(errorLogRepository, 'create').mockReturnValue(mockErrorLog as any);
      jest.spyOn(errorLogRepository, 'save').mockRejectedValue(new Error('Database error'));

      await service.addErrorLog(errorLogData);

      expect(loggerService.error).toHaveBeenCalledWith('Failed to save error log to database', {
        error: 'Database error',
        correlationId: errorLogData.correlationId,
      });
    });
  });

  describe('getErrorSummary', () => {
    it('should return error summary', async () => {
      const mockErrorLogs = [
        { ...mockErrorLog, severity: 'critical' },
        { ...mockErrorLog, severity: 'high' },
        { ...mockErrorLog, severity: 'medium', errorCode: 'INVALID_INPUT' },
      ];

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockErrorLogs),
      };

      jest.spyOn(errorLogRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getErrorSummary(24, 'INTERNAL_ERROR');

      expect(result).toEqual({
        totalErrors: 3,
        errorRate: 3 / 24,
        criticalErrors: 2,
        topErrorTypes: [
          {
            errorCode: 'INTERNAL_ERROR',
            count: 2,
            percentage: (2 / 3) * 100,
          },
        ],
        timeRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      });
    });
  });

  describe('getErrorDetails', () => {
    it('should return error details when found', async () => {
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockErrorLog),
      };

      jest.spyOn(errorLogRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getErrorDetails('corr-123');

      expect(result).toEqual({
        correlationId: mockErrorLog.correlationId,
        errorCode: mockErrorLog.errorCode,
        errorMessage: mockErrorLog.errorMessage,
        statusCode: mockErrorLog.statusCode,
        timestamp: mockErrorLog.timestamp,
        endpoint: mockErrorLog.endpoint,
        method: mockErrorLog.method,
        userId: mockErrorLog.userId,
        userAgent: mockErrorLog.userAgent,
        ip: mockErrorLog.ip,
        stackTrace: mockErrorLog.stackTrace,
        context: mockErrorLog.context,
      });
    });

    it('should return null when error not found', async () => {
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(errorLogRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getErrorDetails('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getTopErrors', () => {
    it('should return top errors', async () => {
      const mockRawResults = [
        {
          errorCode: 'INTERNAL_ERROR',
          errorMessage: 'Internal server error',
          count: '5',
          firstOccurrence: new Date().toISOString(),
          lastOccurrence: new Date().toISOString(),
          affectedEndpoints: ['endpoint1', 'endpoint2'],
        },
      ];

      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRawResults),
      };

      jest.spyOn(errorLogRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getTopErrors(10, 24);

      expect(result).toEqual([
        {
          errorCode: 'INTERNAL_ERROR',
          errorMessage: 'Internal server error',
          count: 5,
          firstOccurrence: expect.any(Date),
          lastOccurrence: expect.any(Date),
          affectedEndpoints: ['endpoint1', 'endpoint2'],
        },
      ]);
    });
  });

  describe('getErrorTrends', () => {
    it('should return error trends', async () => {
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      jest.spyOn(errorLogRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getErrorTrends(24, 1);

      expect(result).toHaveLength(24);
      expect(result[0]).toEqual({
        timestamp: expect.any(Date),
        totalCount: 5,
        criticalCount: 5,
        errorRate: 5,
      });
    });
  });

  describe('addAlertHistory', () => {
    it('should log alert history item', async () => {
      const alertItem = {
        id: 'alert-1',
        type: 'test-alert',
        severity: 'critical' as const,
        title: 'Test Alert',
        description: 'Test alert description',
        timestamp: new Date(),
        resolved: false,
      };

      await service.addAlertHistory(alertItem);

      expect(loggerService.info).toHaveBeenCalledWith('Alert history item received', {
        alertId: alertItem.id,
        type: alertItem.type,
        severity: alertItem.severity,
      });
    });
  });
});
