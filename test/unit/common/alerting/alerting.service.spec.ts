import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AlertingService } from '../../../../src/common/alerting/alerting.service';
import { LoggerService } from '../../../../src/common/logging/logger.service';

describe('AlertingService', () => {
  let service: AlertingService;
  let configService: ConfigService;
  let httpService: HttpService;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'ALERTING_ENABLED': true,
                'SLACK_ALERTS_ENABLED': true,
                'SLACK_WEBHOOK_URL': 'https://hooks.slack.com/test',
                'SLACK_ALERT_CHANNEL': '#alerts',
                'WEBHOOK_ALERTS_ENABLED': true,
                'WEBHOOK_ALERT_URL': 'https://webhook.test/alerts',
                'EMAIL_ALERTS_ENABLED': false,
                'ERROR_RATE_THRESHOLD': 0.05,
                'RESPONSE_TIME_THRESHOLD': 5000,
                'CATEGORY_ERROR_THRESHOLDS': JSON.stringify({
                  'AUTHENTICATION': { rate: 0.1, severity: 'high' },
                  'VALIDATION': { rate: 0.05, severity: 'medium' },
                }),
                'ALERT_RATE_LIMITING_ENABLED': true,
                'MAX_ALERTS_PER_HOUR': 10,
                'ALERT_COOLDOWN_MINUTES': 5,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn().mockReturnValue({ pipe: jest.fn() }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendCategorizedErrorAlert', () => {
    it('should send alert when error rate exceeds threshold', async () => {
      const errorCategory = 'AUTHENTICATION';
      const errorRate = 0.15; // 15% which exceeds the 10% threshold
      const context = { test: 'context' };

      await service.sendCategorizedErrorAlert(errorCategory, errorRate, context);

      expect(loggerService.info).toHaveBeenCalledWith('Alert sent successfully', expect.any(Object));
    });

    it('should not send alert when error rate is below threshold', async () => {
      const errorCategory = 'AUTHENTICATION';
      const errorRate = 0.05; // 5% which is below the 10% threshold
      const context = { test: 'context' };

      await service.sendCategorizedErrorAlert(errorCategory, errorRate, context);

      expect(loggerService.info).not.toHaveBeenCalled();
    });

    it('should not send alert when alerting is disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ALERTING_ENABLED') return false;
        return defaultValue;
      });

      const errorCategory = 'AUTHENTICATION';
      const errorRate = 0.15;
      const context = { test: 'context' };

      await service.sendCategorizedErrorAlert(errorCategory, errorRate, context);

      expect(loggerService.info).not.toHaveBeenCalled();
    });
  });

  describe('sendHighErrorRateAlert', () => {
    it('should send alert when error rate exceeds threshold', async () => {
      const errorRate = 0.1; // 10% which exceeds the 5% threshold
      const context = { test: 'context' };

      await service.sendHighErrorRateAlert(errorRate, context);

      expect(loggerService.info).toHaveBeenCalledWith('Alert sent successfully', expect.any(Object));
    });

    it('should not send alert when error rate is below threshold', async () => {
      const errorRate = 0.03; // 3% which is below the 5% threshold
      const context = { test: 'context' };

      await service.sendHighErrorRateAlert(errorRate, context);

      expect(loggerService.info).not.toHaveBeenCalled();
    });
  });

  describe('shouldSendAlert', () => {
    it('should allow sending alert when rate limiting is disabled', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ALERT_RATE_LIMITING_ENABLED') return false;
        return defaultValue;
      });

      const result = (service as any).shouldSendAlert('test-alert');
      expect(result).toBe(true);
    });

    it('should allow sending alert when no previous alerts', () => {
      const result = (service as any).shouldSendAlert('new-alert');
      expect(result).toBe(true);
    });
  });
});