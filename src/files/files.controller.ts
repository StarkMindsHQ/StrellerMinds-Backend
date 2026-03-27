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
  StreamableFile,
  Headers,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { ChunkUploadService } from './services/chunk-upload.service';
import { FileCompressionService } from './services/file-compression.service';
import { CDNIntegrationService } from './services/cdn-integration.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InitChunkUploadDto, ChunkUploadDto, CompleteChunkUploadDto } from './dto/chunk-upload.dto';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly chunkUploadService: ChunkUploadService,
    private readonly compressionService: FileCompressionService,
    private readonly cdnService: CDNIntegrationService,
  ) {}

  @Post('upload/stream')
  @ApiOperation({ summary: 'Upload a file with streaming' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        provider: { type: 'string', enum: ['aws', 'gcs', 'azure'] },
        compress: { type: 'boolean', default: true },
      },
    },
  })
  async uploadStream(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }), // 1GB
          new FileTypeValidator({ fileType: /.*/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
    @Query('provider') provider?: 'aws' | 'gcs' | 'azure',
    @Query('compress') compress: boolean = true,
  ) {
    return this.filesService.uploadStream(file, req.user.id, provider, compress);
  }

  @Post('upload/chunk/init')
  @ApiOperation({ summary: 'Initialize chunked upload' })
  async initChunkUpload(
    @Body() initDto: InitChunkUploadDto,
    @Request() req,
  ) {
    return this.chunkUploadService.initializeUpload(initDto, req.user.id);
  }

  @Post('upload/chunk')
  @ApiOperation({ summary: 'Upload a chunk' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chunk: { type: 'string', format: 'binary' },
        uploadId: { type: 'string' },
        chunkIndex: { type: 'number' },
        totalChunks: { type: 'number' },
        filename: { type: 'string' },
        fileSize: { type: 'number' },
        mimeType: { type: 'string' },
        fileHash: { type: 'string' },
        provider: { type: 'string', enum: ['aws', 'gcs', 'azure'] },
      },
    },
  })
  async uploadChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @Body() chunkDto: ChunkUploadDto,
    @Request() req,
  ) {
    if (!chunk) {
      throw new BadRequestException('Chunk file is required');
    }
    return this.chunkUploadService.uploadChunk(chunkDto, chunk.buffer, req.user.id);
  }

  @Post('upload/chunk/complete')
  @ApiOperation({ summary: 'Complete chunked upload' })
  async completeChunkUpload(
    @Body() completeDto: CompleteChunkUploadDto,
    @Request() req,
  ) {
    return this.chunkUploadService.completeUpload(completeDto, req.user.id);
  }

  @Get('upload/chunk/:uploadId/status')
  @ApiOperation({ summary: 'Get chunk upload status' })
  async getChunkUploadStatus(
    @Param('uploadId') uploadId: string,
    @Request() req,
  ) {
    return this.chunkUploadService.getUploadStatus(uploadId, req.user.id);
  }

  @Delete('upload/chunk/:uploadId/abort')
  @ApiOperation({ summary: 'Abort chunked upload' })
  async abortChunkUpload(
    @Param('uploadId') uploadId: string,
    @Request() req,
  ) {
    return this.chunkUploadService.abortUpload(uploadId, req.user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a file (legacy method)' })
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

  @Post(':id/purge-cache')
  @ApiOperation({ summary: 'Purge file from CDN cache' })
  async purgeFileCache(@Param('id') id: string, @Request() req) {
    const file = await this.filesService.getFile(id, req.user.id);
    const purged = await this.cdnService.purgeFile(file.url);
    return { purged, message: purged ? 'File purged from CDN cache' : 'Failed to purge from CDN' };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get file access analytics' })
  async getAnalytics(@Param('id') id: string, @Request() req) {
    return this.filesService.getAnalytics(id, req.user.id);
  }
}
