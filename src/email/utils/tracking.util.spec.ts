import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailTrackingUtil } from './tracking.util';

describe('EmailTrackingUtil', () => {
  let util: EmailTrackingUtil;
  const mockSecret = 'test-secret-key-minimum-32-characters-long';
  const mockBaseUrl = 'http://localhost:3000';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTrackingUtil,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'EMAIL_TRACKING_SECRET') return mockSecret;
              if (key === 'EMAIL_TRACKING_BASE_URL') return mockBaseUrl;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    util = module.get<EmailTrackingUtil>(EmailTrackingUtil);
  });

  it('generateTrackingToken returns 64 hex chars and uniqueness', () => {
    const t1 = util.generateTrackingToken();
    const t2 = util.generateTrackingToken();
    expect(t1).toHaveLength(64);
    expect(t1).toMatch(/^[a-f0-9]{64}$/);
    expect(t1).not.toBe(t2);
  });

  it('signUrl is deterministic and sensitive to inputs', () => {
    const a = util.signUrl('token123', 'https://example.com');
    const b = util.signUrl('token123', 'https://example.com');
    const c = util.signUrl('token456', 'https://example.com');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('verifySignature validates correct signatures and rejects invalid', () => {
    const token = 'token123';
    const url = 'https://example.com';
    const sig = util.signUrl(token, url);
    expect(util.verifySignature(token, url, sig)).toBe(true);
    expect(util.verifySignature(token, url, 'bad')).toBe(false);
    expect(util.verifySignature(token, 'https://bad.com', sig)).toBe(false);
  });

  it('injectOpenTracking appends or injects pixel', () => {
    const htmlWithBody = '<html><body><p>Test</p></body></html>';
    const res1 = util.injectOpenTracking(htmlWithBody, 'abc');
    expect(res1).toContain('/email/track/open/abc.png');
    expect(res1.indexOf('</body>')).toBeGreaterThan(res1.indexOf('<img'));

    const html = '<p>Test</p>';
    const res2 = util.injectOpenTracking(html, 'abc');
    expect(res2).toContain('/email/track/open/abc.png');
  });

  it('injectClickTracking wraps links and skips mailto/tel/#', () => {
    const html = `
      <a href="https://example.com">A</a>
      <a href="mailto:test@example.com">B</a>
      <a href="#anchor">C</a>
      <a href="tel:+123">D</a>
    `;
    const res = util.injectClickTracking(html, 'tok');
    expect(res).toContain('/email/track/click/tok');
    expect(res).toContain('url=https%3A%2F%2Fexample.com');
    // unchanged others
    expect(res).toContain('mailto:test@example.com');
    expect(res).toContain('#anchor');
    expect(res).toContain('tel:+123');
  });

  it('addTrackingToEmail includes both click and open', () => {
    const input = '<html><body><a href="https://ex.com">X</a></body></html>';
    const out = util.addTrackingToEmail(input, 'tok');
    expect(out).toContain('/email/track/click/tok');
    expect(out).toContain('/email/track/open/tok.png');
  });
});
