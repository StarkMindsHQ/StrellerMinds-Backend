
/**
 * FilesController handles endpoints for file management (upload, download, etc.).
 *
 * @module Files
 */
import { ApiTags } from '@nestjs/swagger';
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

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // Endpoint to receive a file chunk
  @Post('upload/chunk')
  @UseInterceptors(FileInterceptor('chunk'))
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
  @Post('upload/complete')
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
  @Post('upload/progress')
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
