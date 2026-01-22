import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { I18nService } from '../services/i18n.service';

/**
 * Middleware to detect and set language context
 * Detects language from:
 * 1. URL query parameter (?lang=en)
 * 2. Language cookie
 * 3. Accept-Language header
 * 4. Default language
 */
@Injectable()
export class LanguageDetectionMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Priority 1: URL query parameter
    if (req.query.lang) {
      req['language'] = this.i18nService.normalizeLanguageCode(String(req.query.lang));
    }
    // Priority 2: Cookie
    else if (req.cookies?.language) {
      req['language'] = this.i18nService.normalizeLanguageCode(req.cookies.language);
    }
    // Priority 3: Accept-Language header
    else if (req.headers['accept-language']) {
      req['language'] = this.i18nService.detectLanguageFromHeader(
        req.headers['accept-language'],
      );
    }
    // Priority 4: Default
    else {
      req['language'] = 'en';
    }

    // Set RTL flag
    req['isRTL'] = this.i18nService.isRTL(req['language']);

    // Set locale string for dates/numbers formatting
    req['locale'] = `${req['language']}-${this.i18nService.getLanguageMetadata(req['language']).region}`;

    next();
  }
}
