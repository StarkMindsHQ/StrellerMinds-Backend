import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { DataValidationService } from '../services/data-validation.service';

@ApiTags('Data Validation')
@Controller('data-validation')
export class DataValidationController {
  constructor(private readonly validationService: DataValidationService) {}

  @Post('completeness')
  @ApiOperation({ summary: 'Check data completeness' })
  @ApiResponse({ status: 200, description: 'Completeness check completed' })
  async checkCompleteness(body: { rule: any; data: any[] }) {
    return this.validationService.checkCompleteness(body.rule, body.data);
  }

  @Post('accuracy')
  @ApiOperation({ summary: 'Check data accuracy' })
  @ApiResponse({ status: 200, description: 'Accuracy check completed' })
  async checkAccuracy(body: { rule: any; data: any[] }) {
    return this.validationService.checkAccuracy(body.rule, body.data);
  }

  @Post('consistency')
  @ApiOperation({ summary: 'Check data consistency' })
  @ApiResponse({ status: 200, description: 'Consistency check completed' })
  async checkConsistency(body: { rule: any; data: any[] }) {
    return this.validationService.checkConsistency(body.rule, body.data);
  }

  @Post('validity')
  @ApiOperation({ summary: 'Check data validity' })
  @ApiResponse({ status: 200, description: 'Validity check completed' })
  async checkValidity(body: { rule: any; data: any[] }) {
    return this.validationService.checkValidity(body.rule, body.data);
  }

  @Post('uniqueness')
  @ApiOperation({ summary: 'Check data uniqueness' })
  @ApiResponse({ status: 200, description: 'Uniqueness check completed' })
  async checkUniqueness(body: { rule: any; data: any[] }) {
    return this.validationService.checkUniqueness(body.rule, body.data);
  }

  @Post('timeliness')
  @ApiOperation({ summary: 'Check data timeliness' })
  @ApiResponse({ status: 200, description: 'Timeliness check completed' })
  async checkTimeliness(body: { rule: any; data: any[] }) {
    return this.validationService.checkTimeliness(body.rule, body.data);
  }

  @Post('conformity')
  @ApiOperation({ summary: 'Check data conformity' })
  @ApiResponse({ status: 200, description: 'Conformity check completed' })
  async checkConformity(body: { rule: any; data: any[] }) {
    return this.validationService.checkConformity(body.rule, body.data);
  }
}
