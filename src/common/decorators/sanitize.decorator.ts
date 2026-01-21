import { Transform } from 'class-transformer';
import { SanitizationMode, sanitizeString } from '../security/sanitize.util';

export function Sanitize(mode: SanitizationMode = 'text') {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeString(value, mode);
  });
}
