import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import xss from 'xss';

@Injectable()
export class EnhancedValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize before validation
    const sanitizedValue = this.sanitizeInput(value);

    const object = plainToClass(metatype, sanitizedValue);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');

      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return xss(value.trim());
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = this.sanitizeInput(value[key]);
      }
      return sanitized;
    }

    return value;
  }
}
