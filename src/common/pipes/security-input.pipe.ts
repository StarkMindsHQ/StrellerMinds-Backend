import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { hasForbiddenKeys, sanitizeUnknown } from '../security/sanitize.util';
import { scanForSqlInjection } from '../security/sql-injection.util';

@Injectable()
export class SecurityInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    // Only handle request-derived inputs.
    if (!['body', 'query', 'param'].includes(metadata.type)) return value;

    if (hasForbiddenKeys(value)) {
      throw new BadRequestException('Request contains forbidden keys');
    }

    const sanitized = sanitizeUnknown(value, {
      defaultMode: 'text',
      keyMode: {
        email: 'email',
        refreshToken: 'token',
        resetToken: 'token',
        verificationToken: 'token',
        deviceId: 'token',
      },
      // Never touch secrets; also reduces false positives for SQLi scanning.
      skipKeys: [
        'password',
        'newPassword',
        'currentPassword',
        'refreshToken',
        'resetToken',
        'verificationToken',
      ],
    });

    const hit = scanForSqlInjection(sanitized, {
      skipKeys: [
        'password',
        'newPassword',
        'currentPassword',
        'refreshToken',
        'resetToken',
        'verificationToken',
      ],
    });

    if (hit) {
      throw new BadRequestException('Suspicious input detected');
    }

    return sanitized;
  }
}
