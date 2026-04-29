import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * SecurityHeadersMiddleware
 *
 * Applies HTTP security headers to every response using helmet.
 * Covers: X-Frame-Options, Content-Security-Policy, HSTS, X-Content-Type-Options,
 * and several additional hardening headers.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly helmetMiddleware: ReturnType<typeof helmet>;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.helmetMiddleware = helmet({
      // X-Content-Type-Options: nosniff
      // Prevents browsers from MIME-sniffing a response away from the declared content-type.
      contentTypeOptions: true,

      // X-Frame-Options: DENY
      // Prevents the page from being embedded in iframes — protects against clickjacking.
      frameguard: { action: 'deny' },

      // Strict-Transport-Security (HSTS)
      // Forces HTTPS for 1 year, includes subdomains, and opts into HSTS preload list.
      // Only enforced in production to avoid breaking local HTTP dev flows.
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true,
          }
        : false,

      // Content-Security-Policy (CSP)
      // Restricts which resources the browser is allowed to load.
      // Tighten the directives below to match your actual frontend/CDN origins.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for many UI frameworks; remove when possible
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"], // Reinforces X-Frame-Options at the CSP level
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null, // Only in production
        },
      },

      // X-XSS-Protection: disabled intentionally — modern browsers ignore it and
      // it can introduce vulnerabilities in older IE. CSP is the correct mitigation.
      xssFilter: false,

      // Referrer-Policy: no-referrer
      // Prevents leaking the URL in the Referer header to third parties.
      referrerPolicy: { policy: 'no-referrer' },

      // X-Permitted-Cross-Domain-Policies: none
      // Disallows Adobe Flash/PDF cross-domain requests.
      permittedCrossDomainPolicies: false,

      // X-DNS-Prefetch-Control: off
      // Disables browser DNS prefetching to reduce privacy leakage.
      dnsPrefetchControl: { allow: false },

      // X-Download-Options: noopen (IE-specific, harmless elsewhere)
      ieNoOpen: true,

      // Remove X-Powered-By header to avoid fingerprinting the server.
      hidePoweredBy: true,

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: { policy: 'same-origin' },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: { policy: 'same-origin' },
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.helmetMiddleware(req, res, next);
  }
}
