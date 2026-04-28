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
import { DataRetentionService } from './data-retention.service';
import { GdprService } from './gdpr.service';
import { StreamResponse } from '../common/decorators/stream-response.decorator';
import { StreamUtil } from '../common/utils/stream.util';

@Controller('gdpr')
export class GdprController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  @Get('export/:userId')
  @StreamResponse({ contentType: 'application/json' })
  async exportData(@Param('userId') userId: string, @Res() res: Response) {
    const result = await this.gdprService.exportUserData(userId);
    if (!result) throw new NotFoundException(`User ${userId} not found`);
    
    // Set headers for file download
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    // Stream the data instead of loading it all into memory
    const stream = StreamUtil.stringToStream(result.data, 8192); // 8KB chunks
    stream.pipe(res);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserData(@Param('userId') userId: string) {
    const deleted = await this.gdprService.deleteUserData(userId);
    if (!deleted) throw new NotFoundException(`User ${userId} not found`);
  }

  @Get('retention-policies')
  getRetentionPolicies() {
    return this.dataRetentionService.getPolicies();
  }

  @Delete('retention-policies/apply')
  @HttpCode(HttpStatus.OK)
  async applyRetentionPolicies() {
    return this.dataRetentionService.applyRetentionPolicies();
  }
}
