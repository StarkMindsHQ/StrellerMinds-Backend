import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VideoService } from '../services/video.service';
import { CreateVideoDto } from '../dto/create-video.dto';
import { UpdateVideoDto } from '../dto/update-video.dto';

@ApiTags('Video Management')
@ApiBearerAuth()
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post()
  @ApiOperation({ summary: 'Upload and create a new video' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createVideoDto: CreateVideoDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    // Fallback for user ID if auth middleware isn't fully configured in this context
    const userId = req.user?.id || 'anonymous-uploader';
    return this.videoService.create(file, userId, createVideoDto.title, createVideoDto.description);
  }

  @Get()
  @ApiOperation({ summary: 'List all videos' })
  findAll(@Request() req) {
    // Optional: filter by current user
    return this.videoService.findAll(req.user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video details' })
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update video metadata' })
  async update(@Param('id') id: string, @Body() updateVideoDto: UpdateVideoDto) {
    const video = await this.videoService.findOne(id);
    Object.assign(video, updateVideoDto);
    return video;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a video' })
  async remove(@Param('id') id: string) {
    const video = await this.videoService.findOne(id);
    // Soft delete or actual delete logic here
    return { success: true, deletedId: id };
  }
}
