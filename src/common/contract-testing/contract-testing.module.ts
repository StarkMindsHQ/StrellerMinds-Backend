import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAPIValidationService } from './openapi-validation.service';
import { OpenAPIValidationMiddleware } from './openapi-validation.middleware';
import { ContractViolationReporterService } from './contract-violation-reporter.service';
import { ContractTestingController } from './contract-testing.controller';

/**
 * Contract Testing Module
 * 
 * Provides OpenAPI contract validation and testing capabilities.
 * Includes validation service, middleware, and monitoring endpoints.
 */

@Module({
  imports: [ConfigModule],
  controllers: [ContractTestingController],
  providers: [
    OpenAPIValidationService,
    OpenAPIValidationMiddleware,
    ContractViolationReporterService,
  ],
  exports: [
    OpenAPIValidationService,
    OpenAPIValidationMiddleware,
    ContractViolationReporterService,
  ],
})
export class ContractTestingModule {}
