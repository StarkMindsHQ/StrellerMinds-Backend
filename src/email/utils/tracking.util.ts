import * as crypto from 'crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailTrackingUtil {
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('EMAIL_TRACKING_SECRET');
    this.baseUrl =
      this.configService.get<string>('EMAIL_TRACKING_BASE_URL') ||
      this.configService.get<string>('BASE_URL') ||
      '';

    if (!this.secret || this.secret.length < 32) {
      throw new BadRequestException('EMAIL_TRACKING_SECRET is not configured or too short');
    }
  }

  generateTrackingToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  signUrl(emailIdOrToken: string, url: string): string {
    const payload = `${emailIdOrToken}:${url}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  verifySignature(emailIdOrToken: string, url: string, signature: string): boolean {
    try {
      const expected = this.signUrl(emailIdOrToken, url);
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  getOpenTrackingUrl(trackingToken: string): string {
    return `${this.baseUrl}/email/track/open/${trackingToken}.png`;
  }

  getClickTrackingUrl(trackingToken: string, targetUrl: string): string {
    const encodedUrl = encodeURIComponent(targetUrl);
    const signature = this.signUrl(trackingToken, targetUrl);
    return `${this.baseUrl}/email/track/click/${trackingToken}?url=${encodedUrl}&sig=${signature}`;
  }

  injectOpenTracking(htmlContent: string, trackingToken: string): string {
    const pixel = `<img src="${this.getOpenTrackingUrl(trackingToken)}" width="1" height="1" style="display:none;" alt="" />`;
    if (typeof htmlContent !== 'string') return pixel;
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${pixel}</body>`);
    }
    return htmlContent + pixel;
  }

  injectClickTracking(htmlContent: string, trackingToken: string): string {
    if (typeof htmlContent !== 'string') return htmlContent;
    const hrefRegex = /href=["']([^"']+)["']/gi;
    return htmlContent.replace(hrefRegex, (match, url) => {
      if (!url) return match;
      if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) return match;
      if (url.includes('/email/track/click/')) return match;
      const trackedUrl = this.getClickTrackingUrl(trackingToken, url);
      return `href="${trackedUrl}"`;
    });
  }

  addTrackingToEmail(htmlContent: string, trackingToken: string): string {
    let tracked = htmlContent;
    tracked = this.injectClickTracking(tracked, trackingToken);
    tracked = this.injectOpenTracking(tracked, trackingToken);
    return tracked;
  }
}

// Backwards-compatible helpers for existing imports in EmailService
export function addTrackingToEmail(html: string, trackingToken: string, baseUrl?: string): string {
  // Allow function-style usage by constructing a minimal util with provided baseUrl
  const fakeConfig = {
    get: (key: string) =>
      key === 'EMAIL_TRACKING_SECRET'
        ? process.env.EMAIL_TRACKING_SECRET
        : key === 'EMAIL_TRACKING_BASE_URL'
          ? baseUrl || process.env.EMAIL_TRACKING_BASE_URL || process.env.BASE_URL
          : undefined,
  } as unknown as ConfigService;
  const util = new EmailTrackingUtil(fakeConfig);
  return util.addTrackingToEmail(html, trackingToken);
}

export function generateEmailId(): string {
  return crypto.randomBytes(16).toString('hex');
}

import { v4 as uuidv4 } from 'uuid';

export function addTrackingToEmail(html: string, emailId: string, baseUrl: string): string {
  // Add tracking pixel for opens
  const trackingPixel = `<img src="${baseUrl}/email/track/open/${emailId}" width="1" height="1" alt="" style="display:none;">`;

  // Add tracking to all links
  let modifiedHtml = html.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']/gi, (match, url) => {
    // Don't track unsubscribe links
    if (url.includes('/unsubscribe') || url.includes('/preferences')) {
      return match;
    }

    const trackingUrl = `${baseUrl}/email/track/click/${emailId}?url=${encodeURIComponent(url)}`;
    return match.replace(url, trackingUrl);
  });

  // Add tracking pixel at the end of the email
  modifiedHtml = modifiedHtml.replace('</body>', `${trackingPixel}</body>`);

  return modifiedHtml;
}

export function generateEmailId(): string {
  return uuidv4();
}
