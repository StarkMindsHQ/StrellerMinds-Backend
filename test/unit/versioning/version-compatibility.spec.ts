import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SimplifiedDeprecationService } from '../../../src/common/services/simplified-deprecation.service';

describe('Version Compatibility Tests', () => {
  let service: SimplifiedDeprecationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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
                    endpoints: [
                      {
                        path: '/auth/login',
                        method: 'POST',
                        breakingChange: 'username field renamed to email'
                      }
                    ]
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

    service = module.get<SimplifiedDeprecationService>(SimplifiedDeprecationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Deprecation Detection', () => {
    it('should detect deprecated versions', () => {
      expect(service.isDeprecated('v1')).toBe(true);
      expect(service.isDeprecated('v2')).toBe(false);
      expect(service.isDeprecated('v3')).toBe(false);
    });

    it('should return deprecation info for deprecated versions', () => {
      const info = service.getDeprecationInfo('v1');
      expect(info).toBeDefined();
      expect(info?.version).toBe('v1');
      expect(info?.sunsetDate).toBe('2024-12-31');
      expect(info?.migrationGuide).toContain('migration');
    });

    it('should return null for non-deprecated versions', () => {
      const info = service.getDeprecationInfo('v2');
      expect(info).toBeNull();
    });
  });

  describe('Sunset Date Handling', () => {
    it('should calculate days until sunset correctly', () => {
      // Mock current date to be before sunset
      const mockDate = new Date('2024-06-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const days = service.getDaysUntilSunset('v1');
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThan(365);
    });

    it('should return 0 for versions past sunset', () => {
      // Mock current date to be after sunset
      const mockDate = new Date('2025-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const days = service.getDaysUntilSunset('v1');
      expect(days).toBe(0);
    });

    it('should detect versions past sunset', () => {
      // Mock current date to be after sunset
      const mockDate = new Date('2025-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      expect(service.isPastSunset('v1')).toBe(true);
    });

    it('should detect versions not past sunset', () => {
      // Mock current date to be before sunset
      const mockDate = new Date('2024-06-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      expect(service.isPastSunset('v1')).toBe(false);
    });
  });

  describe('Warning Period Detection', () => {
    it('should detect warning period correctly', () => {
      // Mock current date to be 45 days before sunset (within warning period)
      const sunsetDate = new Date('2024-12-31');
      const warningDate = new Date(sunsetDate);
      warningDate.setDate(warningDate.getDate() - 45);
      
      jest.spyOn(global, 'Date').mockImplementation(() => warningDate as any);
      
      expect(service.isInWarningPeriod('v1')).toBe(true);
    });

    it('should not detect warning period when too early', () => {
      // Mock current date to be 120 days before sunset (outside warning period)
      const sunsetDate = new Date('2024-12-31');
      const earlyDate = new Date(sunsetDate);
      earlyDate.setDate(earlyDate.getDate() - 120);
      
      jest.spyOn(global, 'Date').mockImplementation(() => earlyDate as any);
      
      expect(service.isInWarningPeriod('v1')).toBe(false);
    });
  });

  describe('Warning Generation', () => {
    it('should generate appropriate warnings', () => {
      const warning = service.generateWarning('v1');
      expect(warning).toBeDefined();
      expect(warning?.version).toBe('v1');
      expect(warning?.message).toContain('deprecated');
      expect(warning?.sunsetDate).toBe('2024-12-31');
      expect(warning?.migrationGuide).toContain('migration');
    });

    it('should return null for non-deprecated versions', () => {
      const warning = service.generateWarning('v2');
      expect(warning).toBeNull();
    });
  });

  describe('Deprecation Summary', () => {
    it('should provide comprehensive deprecation summary', () => {
      const summary = service.getDeprecationSummary();
      
      expect(summary).toHaveProperty('totalDeprecatedVersions');
      expect(summary).toHaveProperty('versionsInWarningPeriod');
      expect(summary).toHaveProperty('versionsPastSunset');
      expect(summary).toHaveProperty('upcomingSunsets');
      
      expect(summary.totalDeprecatedVersions).toBe(1);
      expect(Array.isArray(summary.versionsInWarningPeriod)).toBe(true);
      expect(Array.isArray(summary.versionsPastSunset)).toBe(true);
      expect(Array.isArray(summary.upcomingSunsets)).toBe(true);
    });
  });

  describe('Logging', () => {
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerSpy = jest.spyOn(service['logger'], 'log');
    });

    afterEach(() => {
      loggerSpy.mockRestore();
    });

    it('should log deprecation usage', () => {
      service.logDeprecationUsage('v1', '/api/v1/auth/login', 'test-agent');
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deprecated API usage'),
        expect.objectContaining({
          version: 'v1',
          endpoint: '/api/v1/auth/login',
          userAgent: 'test-agent'
        })
      );
    });
  });
});
