import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Injects Public-Key-Pins-Report-Only and Expect-CT headers.
 * Set CERT_PIN_SHA256 env var to the base64 SHA-256 of your server's SPKI.
 *
 * Generate pin:
 *   openssl s_client -connect yourdomain.com:443 | \
 *     openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
 *     openssl dgst -sha256 -binary | base64
 */
@Injectable()
export class CertificatePinningMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CertificatePinningMiddleware.name);

  use(_req: Request, res: Response, next: NextFunction): void {
    const pin = process.env.CERT_PIN_SHA256;

    if (pin) {
      // Report-only until pin is validated in production; switch to
      // 'Public-Key-Pins' only after confirming the hash is correct.
      res.setHeader(
        'Public-Key-Pins-Report-Only',
        `pin-sha256="${pin}"; max-age=5184000; includeSubDomains`,
      );
    } else {
      this.logger.warn('CERT_PIN_SHA256 not set — certificate pinning headers skipped');
    }

    res.setHeader('Expect-CT', 'max-age=86400, enforce');
    next();
  }
}
