import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
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
    @Request() req
  ) {
    // Fallback for user ID if auth middleware isn't fully configured in this context
    const userId = req.user?.id || 'anonymous-uploader';
    return this.videoService.create(createVideoDto, userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all videos' })
  findAll(@Request() req) {
    // Optional: filter by current user
    return this.videoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video details' })
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update video metadata' })
  update(@Param('id') id: string, @Body() updateVideoDto: UpdateVideoDto) {
    return this.videoService.update(id, updateVideoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a video' })
  remove(@Param('id') id: string) {
    return this.videoService.remove(id);
  }
}