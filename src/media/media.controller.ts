import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.startTranscoding(file);
  }

  @Get(':videoId/status')
  async getStatus(@Param('videoId') videoId: string) {
    return this.mediaService.getVideoStatus(videoId);
  }

  @Get(':videoId/signed-url')
  async getSignedUrl(@Param('videoId') videoId: string, @Query('key') key: string) {
    const url = await this.mediaService.getSignedUrl(videoId, key);
    return { url };
  }
}
