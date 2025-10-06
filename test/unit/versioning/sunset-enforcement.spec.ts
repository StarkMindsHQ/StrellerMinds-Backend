import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SunsetEnforcementService } from '../../../src/common/services/sunset-enforcement.service';
import { SimplifiedDeprecationService } from '../../../src/common/services/simplified-deprecation.service';

describe('Sunset Enforcement Service', () => {
  let service: SunsetEnforcementService;
  let deprecationService: SimplifiedDeprecationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SunsetEnforcementService,
        SimplifiedDeprecationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                'api.deprecatedVersions': {
                  v1: {
                    deprecatedIn: '2024-01-01',
                    sunsetDate: '2024-12-31',
                    migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
                    alternative: 'v2',
                    reason: 'Enhanced features and improved performance',
                    endpoints: []
                  }
                },
                'api.sunsetEnforcement': {
                  enabled: true,
                  warningPeriodDays: 90,
                  gracePeriodDays: 30,
                  responseAfterSunset: 'gone'
                }
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SunsetEnforcementService>(SunsetEnforcementService);
    deprecationService = module.get<SimplifiedDeprecationService>(SimplifiedDeprecationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Sunset Date Checking', () => {
    it('should identify versions past sunset date', async () => {
      // Mock current date to be after sunset
      const mockDate = new Date('2025-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      await service.checkSunsetDates();
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Versions past sunset date'),
        expect.arrayContaining(['v1'])
      );
    });

    it('should identify versions approaching sunset date', async () => {
      // Mock current date to be 5 days before sunset
      const sunsetDate = new Date('2024-12-31');
      const warningDate = new Date(sunsetDate);
      warningDate.setDate(warningDate.getDate() - 5);
      
      jest.spyOn(global, 'Date').mockImplementation(() => warningDate as any);

      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      
      await service.checkSunsetDates();
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Versions approaching sunset date'),
        expect.arrayContaining(['v1'])
      );
    });

    it('should not trigger warnings for versions far from sunset', async () => {
      // Mock current date to be 100 days before sunset
      const sunsetDate = new Date('2024-12-31');
      const earlyDate = new Date(sunsetDate);
      earlyDate.setDate(earlyDate.getDate() - 100);
      
      jest.spyOn(global, 'Date').mockImplementation(() => earlyDate as any);

      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      await service.checkSunsetDates();
      
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Versions approaching sunset date'),
        expect.anything()
      );
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Versions past sunset date'),
        expect.anything()
      );
    });
  });

  describe('Sunset Status', () => {
    it('should return correct sunset status', () => {
      const status = service.getSunsetStatus();
      
      expect(status).toHaveProperty('isEnabled');
      expect(status).toHaveProperty('totalDeprecatedVersions');
      expect(status).toHaveProperty('versionsInWarningPeriod');
      expect(status).toHaveProperty('versionsPastSunset');
      expect(status).toHaveProperty('upcomingSunsets');
      
      expect(status.isEnabled).toBe(true);
      expect(status.totalDeprecatedVersions).toBe(1);
      expect(Array.isArray(status.versionsInWarningPeriod)).toBe(true);
      expect(Array.isArray(status.versionsPastSunset)).toBe(true);
      expect(Array.isArray(status.upcomingSunsets)).toBe(true);
    });
  });

  describe('Manual Operations', () => {
    it('should allow manual sunset check', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      
      await service.manualSunsetCheck();
      
      expect(loggerSpy).toHaveBeenCalledWith('Manual sunset check triggered');
    });

    it('should allow toggling sunset enforcement', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      
      service.toggleSunsetEnforcement(false);
      
      expect(loggerSpy).toHaveBeenCalledWith('Sunset enforcement disabled');
    });
  });

  describe('Disabled Enforcement', () => {
    it('should handle disabled sunset enforcement', async () => {
      // Mock config to return disabled enforcement
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'api.sunsetEnforcement') {
          return { enabled: false };
        }
        return {};
      });

      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      
      await service.checkSunsetDates();
      
      expect(loggerSpy).toHaveBeenCalledWith('Sunset enforcement is disabled');
    });
  });

  describe('Notification Methods', () => {
    it('should send sunset notifications for upcoming versions', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      
      // Access private method for testing
      await service['sendSunsetNotifications'](['v1']);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUNSET NOTIFICATION'),
        expect.objectContaining({
          version: 'v1',
          sunsetDate: '2024-12-31'
        })
      );
    });

    it('should send sunset alerts for past versions', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      // Access private method for testing
      await service['sendSunsetAlerts'](['v1']);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUNSET ALERT'),
        expect.objectContaining({
          version: 'v1',
          sunsetDate: '2024-12-31'
        })
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate daily sunset report', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      
      // Access private method for testing
      await service['generateSunsetReport']();
      
      expect(loggerSpy).toHaveBeenCalledWith(
        'Daily Sunset Report',
        expect.objectContaining({
          totalDeprecatedVersions: expect.any(Number),
          versionsInWarningPeriod: expect.any(Number),
          versionsPastSunset: expect.any(Number),
          upcomingSunsets: expect.any(Number)
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty deprecated versions', async () => {
      // Mock config to return empty deprecated versions
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'api.deprecatedVersions') {
          return {};
        }
        return {};
      });

      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      const errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      await service.checkSunsetDates();
      
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle missing sunset enforcement config', async () => {
      // Mock config to return undefined for sunset enforcement
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue) => {
        if (key === 'api.sunsetEnforcement') {
          return undefined;
        }
        return defaultValue;
      });

      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      
      await service.checkSunsetDates();
      
      expect(loggerSpy).toHaveBeenCalledWith('Sunset enforcement is disabled');
    });
  });
});
