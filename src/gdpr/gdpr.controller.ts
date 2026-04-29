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
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DataRetentionService } from './data-retention.service';
import { GdprService } from './gdpr.service';

@ApiTags('GDPR')
@ApiBearerAuth()
@Controller('gdpr')
export class GdprController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  @Get('export/:userId')
  @ApiOperation({
    summary: 'Export user data',
    description: 'Exports all personal data held for a user as a downloadable file (GDPR Article 20 – Right to data portability).',
  })
  @ApiParam({ name: 'userId', description: 'User UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'User data exported as a file download',
    headers: {
      'Content-Type': { description: 'MIME type of the export file', schema: { type: 'string', example: 'application/json' } },
      'Content-Disposition': { description: 'Attachment filename', schema: { type: 'string', example: 'attachment; filename="user-data-a1b2c3d4.json"' } },
    },
    content: {
      'application/json': {
        example: {
          userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          createdAt: '2024-01-15T10:30:00.000Z',
          courses: [],
          exportedAt: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          message: 'User a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found',
          error: 'Not Found',
        },
      },
    },
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
    description: 'Permanently deletes all personal data for a user (GDPR Article 17 – Right to erasure / Right to be forgotten).',
  })
  @ApiParam({ name: 'userId', description: 'User UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 204,
    description: 'User data deleted successfully (no content returned)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          message: 'User a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found',
          error: 'Not Found',
        },
      },
    },
  })
  async deleteUserData(@Param('userId') userId: string) {
    const deleted = await this.gdprService.deleteUserData(userId);
    if (!deleted) throw new NotFoundException(`User ${userId} not found`);
  }

  @Get('retention-policies')
  @ApiOperation({
    summary: 'Get data retention policies',
    description: 'Returns the configured data retention policies for each data category.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of data retention policies',
    content: {
      'application/json': {
        example: [
          { dataType: 'user_accounts', retentionDays: 365, description: 'Active user account data' },
          { dataType: 'audit_logs', retentionDays: 90, description: 'Security audit log entries' },
          { dataType: 'session_tokens', retentionDays: 30, description: 'Expired session tokens' },
        ],
      },
    },
  })
  getRetentionPolicies() {
    return this.dataRetentionService.getPolicies();
  }

  @Delete('retention-policies/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply data retention policies',
    description: 'Triggers immediate application of all configured retention policies, purging data that has exceeded its retention period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention policies applied',
    content: {
      'application/json': {
        example: {
          message: 'Retention policies applied successfully',
          deletedRecords: {
            audit_logs: 142,
            session_tokens: 87,
          },
          appliedAt: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  async applyRetentionPolicies() {
    return this.dataRetentionService.applyRetentionPolicies();
  }
}
