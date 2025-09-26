
/**
 * FilesController handles endpoints for file management (upload, download, etc.).
 *
 * @module Files
 */
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseInterceptors,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { UploadChunkDto } from './dto/upload-chunk.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { UploadProgressDto } from './dto/upload-progress.dto';
import { FileRateLimit } from '../common/decorators/rate-limit.decorator';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // Endpoint to receive a file chunk
  @FileRateLimit.chunkUpload()
  @Post('upload/chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  @ApiOperation({ summary: 'Upload file chunk' })
  @ApiResponse({ status: 200, description: 'Chunk uploaded successfully' })
  @ApiResponse({ status: 429, description: 'Too many chunk upload attempts' })
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadChunkDto,
  ) {
    const { uploadId, chunkIndex, totalChunks } = body;
    if (!file || !uploadId || chunkIndex === undefined || !totalChunks) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.filesService.saveChunk(uploadId, chunkIndex, file);
    return { message: 'Chunk uploaded' };
  }

  // Endpoint to assemble chunks into the final file
  @FileRateLimit.upload()
  @Post('upload/complete')
  @ApiOperation({ summary: 'Complete file upload' })
  @ApiResponse({ status: 200, description: 'File upload completed successfully' })
  @ApiResponse({ status: 429, description: 'Too many upload completion attempts' })
  async completeUpload(@Body() body: CompleteUploadDto) {
    const { uploadId, fileName, totalChunks } = body;
    if (!uploadId || !fileName || !totalChunks) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
    }
    const cdnUrl = await this.filesService.assembleChunks(
      uploadId,
      fileName,
      totalChunks,
    );
    return { message: 'File uploaded and available on CDN', url: cdnUrl };
  }

  // Endpoint to get upload progress
  @FileRateLimit.download()
  @Post('upload/progress')
  @ApiOperation({ summary: 'Get upload progress' })
  @ApiResponse({ status: 200, description: 'Upload progress retrieved' })
  @ApiResponse({ status: 429, description: 'Too many progress check attempts' })
  async getUploadProgress(
    @Body('uploadId') uploadId: string,
    @Body('totalChunks') totalChunks?: number,
  ): Promise<UploadProgressDto> {
    if (!uploadId) {
      throw new HttpException('Missing uploadId', HttpStatus.BAD_REQUEST);
    }
    const progress = await this.filesService.getUploadProgress(
      uploadId,
      totalChunks,
    );
    return progress;
  }
}
