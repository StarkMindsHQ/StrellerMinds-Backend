import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Request,
  UseGuards,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        provider: { type: 'string', enum: ['aws', 'gcs', 'azure'] },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Query('provider') provider?: 'aws' | 'gcs' | 'azure',
  ) {
    return this.filesService.upload(file, req.user.id, provider);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details and URL' })
  async getFile(
    @Param('id') id: string,
    @Request() req,
    @Query('version', new ParseIntPipe({ optional: true })) version?: number,
  ) {
    return this.filesService.getFile(id, req.user.id, version);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file and all versions' })
  async deleteFile(@Param('id') id: string, @Request() req) {
    return this.filesService.deleteFile(id, req.user.id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share a file with another user' })
  async shareFile(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { targetUserId: string; permission?: 'READ' | 'WRITE' | 'DELETE' | 'SHARE' },
  ) {
    return this.filesService.shareFile(id, req.user.id, body.targetUserId, body.permission);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history of a file' })
  async getVersionHistory(@Param('id') id: string, @Request() req) {
    return this.filesService.getVersionHistory(id, req.user.id);
  }

  @Post(':id/versions/:version/restore')
  @ApiOperation({ summary: 'Restore a file to a specific version' })
  async restoreVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req,
  ) {
    return this.filesService.restoreVersion(id, req.user.id, version);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get file access analytics' })
  async getAnalytics(@Param('id') id: string, @Request() req) {
    return this.filesService.getAnalytics(id, req.user.id);
  }
}
