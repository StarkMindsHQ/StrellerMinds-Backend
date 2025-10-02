import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { I18nService } from '../services/i18n.service';
import type { LocalizedRequest } from '../middleware/i18n.middleware';

@Injectable()
export class LocaleInterceptor implements NestInterceptor {
  constructor(private readonly i18nService: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<LocalizedRequest>();
    const locale = request.locale || 'en';

    return next.handle().pipe(
      map(async (data) => {
        // If response has translation keys, localize them
        if (data && typeof data === 'object' && data.translationKeys) {
          return this.i18nService.localizeResponse(data, locale, data.translationKeys);
        }

        // If response is already localized, return as is
        if (data && typeof data === 'object' && data.locale) {
          return data;
        }

        // Wrap response with locale information
        return {
          data,
          locale,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
