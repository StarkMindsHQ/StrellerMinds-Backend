import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AccessibilityController } from '../../src/accessibility/controllers/accessibility.controller';
import { AccessibilityService } from '../../src/accessibility/services/accessibility.service';
import { AccessibilityTestingService } from '../../src/accessibility/services/accessibility-testing.service';
import { AccessibilityMonitoringService } from '../../src/accessibility/services/accessibility-monitoring.service';
import { RTLService } from '../../src/accessibility/services/rtl.service';
import { I18nController } from '../../src/i18n/controllers/i18n.controller';
import { I18nService } from '../../src/i18n/services/i18n.service';
import { JwtService } from '../../src/auth/services/jwt.service';
import { Reflector } from '@nestjs/core';

describe('Accessibility + I18n (e2e)', () => {
  let app: INestApplication;

  const monitoringServiceMock = {
    saveAudit: jest.fn().mockImplementation(async (url: string, results: any[]) => ({
      id: 'audit-test-id',
      url,
      auditResults: results,
    })),
    getAuditHistory: jest.fn().mockResolvedValue([]),
    getAuditStatistics: jest.fn().mockResolvedValue({
      totalAudits: 1,
      passedAudits: 1,
      failedAudits: 0,
      warningAudits: 0,
      averageScore: 100,
      wcagComplianceRate: 100,
      issuesBySeverity: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      trends: [],
    }),
    getAuditById: jest.fn().mockResolvedValue(null),
    getComplianceReport: jest.fn().mockResolvedValue({
      periodDays: 30,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAudits: 1,
        passedAudits: 1,
        failedAudits: 0,
        warningAudits: 0,
        averageScore: 100,
        wcagComplianceRate: 100,
        issuesBySeverity: { critical: 0, serious: 0, moderate: 0, minor: 0 },
        trends: [],
      },
      topViolations: [],
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AccessibilityController, I18nController],
      providers: [
        AccessibilityService,
        AccessibilityTestingService,
        RTLService,
        I18nService,
        {
          provide: JwtService,
          useValue: {
            extractTokenFromHeader: jest.fn().mockReturnValue('test-token'),
            verifyAccessToken: jest.fn().mockResolvedValue({
              sub: 'test-user-id',
              type: 'access',
              role: 'USER',
            }),
          },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: AccessibilityMonitoringService,
          useValue: monitoringServiceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/accessibility/wcag-checklist returns AA checklist', async () => {
    const response = await request(app.getHttpServer()).get('/api/accessibility/wcag-checklist');

    expect(response.status).toBe(200);
    expect(response.body.level).toBe('AA');
    expect(response.body.principles).toBeDefined();
  });

  it('POST /api/accessibility/audit evaluates HTML and returns i18n direction data', async () => {
    const html = `
      <html lang="ar">
        <body>
          <a href="#main-content">Skip to main content</a>
          <main id="main-content">
            <button aria-label="Open menu"></button>
            <video controls><track kind="captions" src="captions.vtt" srclang="ar" /></video>
          </main>
          <style>button:focus-visible { outline: 2px solid #000; }</style>
        </body>
      </html>
    `;

    const response = await request(app.getHttpServer()).post('/api/accessibility/audit').send({
      url: 'https://example.com/accessibility',
      html,
      language: 'ar',
      css: 'button:focus-visible { outline: 2px solid #000; }',
    });

    expect(response.status).toBe(201);
    expect(response.body.auditId).toBeDefined();
    expect(response.body.categories).toBeDefined();
    expect(response.body.i18n).toBeDefined();
    expect(response.body.i18n.language).toBe('ar');
    expect(response.body.i18n.direction).toBe('rtl');
  });

  it('GET /api/accessibility/keyboard-shortcuts returns keyboard contract', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/accessibility/keyboard-shortcuts',
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.shortcuts)).toBe(true);
    expect(response.body.shortcuts.some((s: any) => s.key === 'Escape')).toBe(true);
  });

  it('GET /api/accessibility/language-support returns RTL attributes for Arabic', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/accessibility/language-support?lang=ar',
    );

    expect(response.status).toBe(200);
    expect(response.body.direction).toBe('rtl');
    expect(response.body.htmlAttributes.dir).toBe('rtl');
    expect(response.body.metadata.code).toBe('ar');
  });

  it('GET /api/i18n/context resolves locale and direction', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/i18n/context')
      .set('Accept-Language', 'fr-FR,fr;q=0.9,en;q=0.8');

    expect(response.status).toBe(200);
    expect(response.body.language).toBe('fr');
    expect(response.body.direction).toBe('ltr');
    expect(response.body.locale).toContain('fr-');
  });
});
