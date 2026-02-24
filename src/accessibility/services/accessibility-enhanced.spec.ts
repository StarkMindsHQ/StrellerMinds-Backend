import { beforeEach, describe, expect, it } from '@jest/globals';
import { AccessibilityTestingService, ViolationSeverity } from './accessibility-testing.service';
import { AccessibilityService, AriaPoliteness } from './accessibility.service';

describe('AccessibilityTestingService', () => {
  let service: AccessibilityTestingService;

  beforeEach(() => {
    service = new AccessibilityTestingService();
  });

  it('detects missing captions and language mismatch', () => {
    const html = '<html lang="en"><body><video controls></video></body></html>';

    const results = service.validateWCAGCompliance(html, { expectedLanguage: 'ar' });

    expect(results.some((r) => r.id === 'video-captions-missing')).toBe(true);
    expect(results.some((r) => r.id === 'language-mismatch')).toBe(true);
  });

  it('flags missing focus styles as serious', () => {
    const html = '<html lang="en"><body><button>Open</button></body></html>';

    const results = service.validateWCAGCompliance(html);
    const focusIssue = results.find((r) => r.id === 'focus-visible-missing');

    expect(focusIssue).toBeDefined();
    expect(focusIssue?.severity).toBe(ViolationSeverity.SERIOUS);
  });

  it('builds aggregate summary in comprehensive audit', () => {
    const html = '<html><body><img src="x.png" /></body></html>';

    const report = service.runComprehensiveAudit(html);

    expect(report.summary.totalIssues).toBeGreaterThan(0);
    expect(report.summary.criticalCount).toBeGreaterThanOrEqual(1);
  });
});

describe('AccessibilityService', () => {
  let service: AccessibilityService;

  beforeEach(() => {
    service = new AccessibilityService();
  });

  it('returns keyboard shortcuts contract', () => {
    const shortcuts = service.getKeyboardShortcuts();
    expect(shortcuts.length).toBeGreaterThan(0);
    expect(shortcuts.some((s) => s.key === 'Escape')).toBe(true);
  });

  it('builds polite screen reader announcements', () => {
    const announcement = service.generateAnnouncement({
      message: 'Saved successfully',
      politeness: AriaPoliteness.POLITE,
    });

    expect(announcement.message).toBe('Saved successfully');
    expect(announcement.attributes['aria-live']).toBe('polite');
  });
});
