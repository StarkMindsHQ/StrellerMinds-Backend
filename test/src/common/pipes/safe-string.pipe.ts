import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import xss from 'xss';

@Injectable()
export class SafeStringPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return xss(value.trim());
    }
    if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (typeof value[key] === 'string') {
          value[key] = xss(value[key].trim());
        }
      }
    }
    return value;
  }
} 