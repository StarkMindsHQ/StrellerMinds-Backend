import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description?: string },
    @Request() req,
  ) {
    return this.videoService.create(file, req.user.id, body.title, body.description);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Post(':id/chapters')
  @UseGuards(JwtAuthGuard)
  async addChapter(@Param('id') id: string, @Body() body: any) {
    return this.videoService.addChapter(id, body);
  }

  @Post(':id/quiz')
  @UseGuards(JwtAuthGuard)
  async addQuiz(@Param('id') id: string, @Body() body: any) {
    return this.videoService.addQuiz(id, body);
  }

  @Post(':id/analytics')
  @UseGuards(JwtAuthGuard)
  async trackProgress(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.videoService.trackProgress(id, req.user.id, body);
  }
}
