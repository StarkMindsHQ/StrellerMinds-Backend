import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base-exception';
import { ErrorCode } from './error-code';

export class ResourceNotFoundException extends BaseException {
  constructor(resource: string) {
    super(HttpStatus.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`);
  }
}
