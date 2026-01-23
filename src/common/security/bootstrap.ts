import type { INestApplication } from '@nestjs/common';
import { SecurityInputPipe } from '../pipes/security-input.pipe';
import { createGlobalValidationPipe } from '../validation/validation';

export function applyGlobalSecurity(app: INestApplication) {
  // Order matters: sanitize & detect attacks first, then run DTO validation.
  app.useGlobalPipes(new SecurityInputPipe(), createGlobalValidationPipe());
}
