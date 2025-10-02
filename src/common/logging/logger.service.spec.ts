import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                LOG_LEVEL: 'info',
                LOG_FORMAT: 'json',
                LOG_FILE_ENABLED: true,
                LOG_CONSOLE_ENABLED: true,
                NODE_ENV: 'test',
                APP_NAME: 'test-app',
                APP_VERSION: '1.0.0',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set context', () => {
    service.setContext('TestContext');
    expect(service['context']).toBe('TestContext');
  });

  it('should log debug message', () => {
    const logSpy = jest.spyOn(service['logger'], 'log');
    service.debug('Test debug message', { correlationId: 'test-123' });

    expect(logSpy).toHaveBeenCalledWith(
      'debug',
      'Test debug message',
      expect.objectContaining({
        correlationId: 'test-123',
        context: 'Application',
        environment: 'test',
        service: 'test-app',
      }),
    );
  });

  it('should log error with context', () => {
    const logSpy = jest.spyOn(service['logger'], 'log');
    const error = new Error('Test error');

    service.logError(error, {
      correlationId: 'test-123',
      userId: 'user-456',
    });

    expect(logSpy).toHaveBeenCalledWith(
      'error',
      'Test error',
      expect.objectContaining({
        correlationId: 'test-123',
        userId: 'user-456',
        type: 'error',
        errorType: 'Error',
        stack: expect.any(String),
      }),
    );
  });

  it('should create child logger with additional context', () => {
    const childLogger = service.child({ userId: 'user-123' });
    expect(childLogger).toBeInstanceOf(LoggerService);
  });

  it('should sanitize database queries', () => {
    const query = "SELECT * FROM users WHERE password='secret123' AND token='abc123'";
    const sanitized = service['sanitizeQuery'](query);

    expect(sanitized).toContain("password='***'");
    expect(sanitized).toContain("token='***'");
    expect(sanitized).not.toContain('secret123');
    expect(sanitized).not.toContain('abc123');
  });

  it('should log performance with appropriate level', () => {
    const logSpy = jest.spyOn(service['logger'], 'log');

    // Fast request
    service.logPerformance('Fast request', {
      correlationId: 'test-123',
      duration: 100,
    });

    expect(logSpy).toHaveBeenCalledWith(
      'info',
      'Fast request',
      expect.objectContaining({
        duration: 100,
        type: 'performance',
      }),
    );

    // Slow request
    service.logPerformance('Slow request', {
      correlationId: 'test-456',
      duration: 6000,
    });

    expect(logSpy).toHaveBeenCalledWith(
      'warn',
      'Slow request',
      expect.objectContaining({
        duration: 6000,
        type: 'performance',
      }),
    );
  });

  it('should log business events', () => {
    const logSpy = jest.spyOn(service['logger'], 'log');

    service.logBusinessEvent('User registered', {
      correlationId: 'test-123',
      userId: 'user-456',
    });

    expect(logSpy).toHaveBeenCalledWith(
      'info',
      'User registered',
      expect.objectContaining({
        type: 'business_event',
        correlationId: 'test-123',
        userId: 'user-456',
      }),
    );
  });

  it('should log security events with high severity', () => {
    const logSpy = jest.spyOn(service['logger'], 'log');

    service.logSecurityEvent('Failed login attempt', {
      correlationId: 'test-123',
      ip: '192.168.1.1',
    });

    expect(logSpy).toHaveBeenCalledWith(
      'warn',
      'Failed login attempt',
      expect.objectContaining({
        type: 'security_event',
        severity: 'high',
        correlationId: 'test-123',
        ip: '192.168.1.1',
      }),
    );
  });
});
