import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { DataRetentionService } from './data-retention.service';
import { GdprService } from './gdpr.service';

@ApiTags('GDPR')
@Controller('gdpr')
export class GdprController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  @Get('export/:userId')
  @ApiOperation({
    summary: 'Export user data',
    description: 'Exports all user data in JSON format for GDPR data portability compliance. Returns file download.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    format: 'uuid',
    description: 'User ID to export data for',
  })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          description: 'User data export file',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async exportData(@Param('userId') userId: string, @Res() res: Response) {
    const result = await this.gdprService.exportUserData(userId);
    if (!result) throw new NotFoundException(`User ${userId} not found`);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user data',
    description: 'Permanently deletes all user data for GDPR right-to-be-forgotten compliance. This action is irreversible.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    format: 'uuid',
    description: 'User ID to delete data for',
  })
  @ApiResponse({
    status: 204,
    description: 'User data deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUserData(@Param('userId') userId: string) {
    const deleted = await this.gdprService.deleteUserData(userId);
    if (!deleted) throw new NotFoundException(`User ${userId} not found`);
  }

  @Get('retention-policies')
  @ApiOperation({
    summary: 'Get data retention policies',
    description: 'Retrieves the current data retention policies applied to user data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention policies retrieved',
    schema: {
      type: 'object',
      properties: {
        policies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dataType: { type: 'string', description: 'Type of data' },
              retentionDays: { type: 'number', description: 'Days to retain data' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  getRetentionPolicies() {
    return this.dataRetentionService.getPolicies();
  }

  @Delete('retention-policies/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply retention policies',
    description: 'Applies data retention policies to delete expired user data according to configured policies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention policies applied successfully',
    schema: {
      type: 'object',
      properties: {
        deletedRecords: { type: 'number', description: 'Number of records deleted' },
        message: { type: 'string' },
      },
    },
  })
  async applyRetentionPolicies() {
    return this.dataRetentionService.applyRetentionPolicies();
  }
}
